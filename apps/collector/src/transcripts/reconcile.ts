import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';

import { activityOf, categorizeTool, type DenEventKind } from '@agent-den/contracts';

import type { DenStore } from '../den-store';
import { archivedCursorConversationIds } from './cursor-conversations';
import { isCursorTranscript } from './cursor-transcript';
import { readState, readSubagentVerdict } from './transcript-files';
import type { TranscriptRegistry } from './transcript-registry';

/** Hooks are the fast path: only reconcile agents that stayed silent in hooks for this long. */
const QUIET_MS = 15_000;
/** How often to re-read Cursor's archived-conversation index (opening SQLite is not free). */
const ARCHIVED_INDEX_MS = 30_000;

/** Verdicts that end a turn — the only news a lagging transcript may bring about an agent driven by hooks. */
const TURN_ENDS = new Set<DenEventKind>(['stop', 'interrupted', 'tool-error', 'subagent-stop']);

const isENOENT = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

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
  private archivedAt = 0;
  private archived = new Set<string>();

  constructor(
    private readonly store: DenStore,
    private readonly registry: TranscriptRegistry,
    private readonly heardFromHooks: (agentId: string) => boolean = () => false,
    private readonly cursorConversationDb?: string,
  ) {}

  async reconcile(now = Date.now()): Promise<number> {
    let updated = 0;
    updated += this.retireArchivedCursorChats(now);
    for (const agent of this.store.snapshot()) {
      const live = this.store.get(agent.agentId);
      if (!live) {
        continue;
      }
      const path = this.registry.get(live.agentId);
      if (!path || now - live.updatedAt < QUIET_MS) {
        continue;
      }

      let mtime: number;
      try {
        mtime = (await stat(path)).mtimeMs;
      } catch (error) {
        // Cursor does not fire sessionEnd when a chat is deleted from the sidebar — the transcript folder goes away.
        if (live.source === 'cursor' && isENOENT(error)) {
          this.store.push({
            id: randomUUID(),
            source: live.source,
            kind: live.parentAgentId ? 'subagent-stop' : 'session-end',
            sessionId: live.sessionId,
            agentId: live.agentId,
            parentAgentId: live.parentAgentId,
            detail: 'transcript missing',
            timestamp: now,
          });
          updated++;
        }
        continue;
      }
      // A hook stamps Date.now() as it arrives. Cursor often writes the turn's end before that, so the
      // file is older than the hook and must still be read. For Claude the hook is newer on purpose:
      // an older transcript must not drag a live cat back to a previous turn.
      const behindTheHook = mtime <= live.updatedAt && !isCursorTranscript(path);
      if (behindTheHook || mtime <= (this.seen.get(live.agentId) ?? 0)) {
        continue;
      }
      this.seen.set(live.agentId, mtime);

      const state = await readState(path);
      if (!state) {
        continue;
      }

      let kind: DenEventKind = state.kind;
      if (live.parentAgentId) {
        const verdict = kind === 'stop' ? 'done' : await readSubagentVerdict(path);
        if (verdict) {
          kind = verdict === 'done' ? 'subagent-stop' : 'interrupted';
        }
      }
      if (isCursorTranscript(path) && this.heardFromHooks(live.agentId) && !TURN_ENDS.has(kind)) {
        continue;
      }

      // Same activity and tool — nothing to tell (and re-sending tool-start would double-count the tool).
      if (activityOf(kind) === live.activity && state.toolName === live.toolName) {
        continue;
      }

      this.store.push({
        id: randomUUID(),
        source: live.source,
        kind,
        sessionId: live.sessionId,
        agentId: live.agentId,
        parentAgentId: live.parentAgentId,
        toolName: state.toolName,
        toolCategory: state.toolName ? categorizeTool(state.toolName) : undefined,
        detail: state.detail,
        timestamp: mtime,
      });
      updated++;
    }
    return updated;
  }

  /** Chats deleted in Cursor's sidebar — transcript files usually remain. */
  private retireArchivedCursorChats(now: number): number {
    if (now - this.archivedAt >= ARCHIVED_INDEX_MS) {
      this.archived = new Set(archivedCursorConversationIds(this.cursorConversationDb));
      this.archivedAt = now;
    }
    let ended = 0;
    for (const agent of this.store.snapshot()) {
      const live = this.store.get(agent.agentId);
      if (!live || live.source !== 'cursor' || live.parentAgentId || !this.archived.has(live.sessionId)) {
        continue;
      }
      this.store.push({
        id: randomUUID(),
        source: live.source,
        kind: 'session-end',
        sessionId: live.sessionId,
        agentId: live.agentId,
        detail: 'conversation archived',
        timestamp: now,
      });
      ended++;
    }
    return ended;
  }
}
