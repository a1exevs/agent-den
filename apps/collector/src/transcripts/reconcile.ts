import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';

import { activityOf, categorizeTool, type DenEventKind } from '@agent-den/contracts';

import type { DenStore } from '../den-store';
import { inferState } from './infer-state';
import { readSubagentVerdict, readTail } from './transcript-files';
import type { TranscriptRegistry } from './transcript-registry';

/** Hooks are the fast path: only reconcile agents that stayed silent in hooks for this long. */
const QUIET_MS = 15_000;

/**
 * Keeps known agents honest using their transcripts. Catches what hooks never report:
 * an interrupted turn (Esc sends no `Stop`), a subagent killed by its parent, and sessions without the plugin
 * (their transcript is the only signal). Runs often; reads a transcript only when it changed since the last look.
 */
export class TranscriptReconciler {
  /** Transcript mtime we last reconciled per agent — unchanged files are not re-read. */
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly store: DenStore,
    private readonly registry: TranscriptRegistry,
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
      if (mtime <= agent.updatedAt || mtime <= (this.seen.get(agent.agentId) ?? 0)) {
        continue;
      }
      this.seen.set(agent.agentId, mtime);

      const state = inferState(await readTail(path));
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
