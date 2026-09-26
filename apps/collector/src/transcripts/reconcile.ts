import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';

import { activityOf, categorizeTool, type DenEventKind } from '@agent-den/contracts';

import type { DenStore } from '../den-store';
import { isCursorTranscript } from './cursor-transcript';
import { readState, readSubagentVerdict } from './transcript-files';
import type { TranscriptRegistry } from './transcript-registry';

/** Hooks are the fast path: only reconcile agents that stayed silent in hooks for this long. */
const QUIET_MS = 15_000;

/** Verdicts that end a turn — the only news a lagging transcript may bring about an agent driven by hooks. */
const TURN_ENDS = new Set<DenEventKind>(['stop', 'interrupted', 'tool-error', 'subagent-stop']);

/**
 * Keeps known agents honest using their transcripts. Catches what hooks never report:
 * an interrupted turn (Esc sends no `Stop`), a subagent killed by its parent, and sessions without the plugin
 * (their transcript is the only signal). Runs often; reads a transcript only when it changed since the last look.
 *
 * Cursor writes its transcripts in batches, behind the hooks: for an agent Cursor hooks report on
 * (`heardFromHooks`), only the end of a turn is taken from the transcript, never "busy again".
 */
export class TranscriptReconciler {
  /** Transcript mtime we last reconciled per agent — unchanged files are not re-read. */
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly store: DenStore,
    private readonly registry: TranscriptRegistry,
    private readonly heardFromHooks: (agentId: string) => boolean = () => false,
  ) {}

  async reconcile(now = Date.now()): Promise<number> {
    let updated = 0;
    for (const agent of this.store.snapshot()) {
      const path = this.registry.get(agent.agentId);
      if (!path || now - agent.updatedAt < QUIET_MS) {
        continue;
      }

      let mtime: number;
      try {
        mtime = (await stat(path)).mtimeMs;
      } catch {
        continue;
      }
      // A hook stamps Date.now() as it arrives. Cursor often writes the turn's end before that, so the
      // file is older than the hook and must still be read. For Claude the hook is newer on purpose:
      // an older transcript must not drag a live cat back to a previous turn.
      const behindTheHook = mtime <= agent.updatedAt && !isCursorTranscript(path);
      if (behindTheHook || mtime <= (this.seen.get(agent.agentId) ?? 0)) {
        continue;
      }
      this.seen.set(agent.agentId, mtime);

      const state = await readState(path);
      if (!state) {
        continue;
      }

      let kind: DenEventKind = state.kind;
      if (agent.parentAgentId) {
        const verdict = kind === 'stop' ? 'done' : await readSubagentVerdict(path);
        if (verdict) {
          kind = verdict === 'done' ? 'subagent-stop' : 'interrupted';
        }
      }
      if (isCursorTranscript(path) && this.heardFromHooks(agent.agentId) && !TURN_ENDS.has(kind)) {
        continue;
      }

      // Same activity and tool — nothing to tell (and re-sending tool-start would double-count the tool).
      if (activityOf(kind) === agent.activity && state.toolName === agent.toolName) {
        continue;
      }

      this.store.push({
        id: randomUUID(),
        source: agent.source,
        kind,
        sessionId: agent.sessionId,
        agentId: agent.agentId,
        parentAgentId: agent.parentAgentId,
        toolName: state.toolName,
        toolCategory: state.toolName ? categorizeTool(state.toolName) : undefined,
        detail: state.detail,
        timestamp: mtime,
      });
      updated++;
    }
    return updated;
  }
}
