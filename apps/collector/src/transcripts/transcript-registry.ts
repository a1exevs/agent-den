import { basename, dirname, join } from 'node:path';

/**
 * Cursor keeps a subagent's transcript in `subagents/` next to its session's: `<id>/<id>.jsonl` →
 * `<id>/subagents/<subagent>.jsonl`. A subagent of a subagent lands in the same folder.
 */
export function cursorSubagentTranscript(parentPath: string, subagentId: string): string {
  const dir = dirname(parentPath);
  return join(basename(dir) === 'subagents' ? dir : join(dir, 'subagents'), `${subagentId}.jsonl`);
}

/** Where each agent's transcript lives. Filled from hook payloads and the transcript scanner. */
export class TranscriptRegistry {
  private readonly paths = new Map<string, string>();

  set(agentId: string, path: string): void {
    this.paths.set(agentId, path);
  }

  get(agentId: string): string | undefined {
    return this.paths.get(agentId);
  }

  entries(): [agentId: string, path: string][] {
    return [...this.paths.entries()];
  }

  /**
   * Hooks always carry the session `transcript_path`; subagent hooks add `agent_id` (and sometimes
   * `agent_transcript_path`). Subagent transcripts live in `<session>/subagents/agent-<id>.jsonl` next to it.
   */
  rememberHook(payload: {
    session_id?: string;
    transcript_path?: string;
    agent_id?: string;
    agent_transcript_path?: string;
  }): void {
    const { session_id: sessionId, transcript_path: sessionPath, agent_id: agentId } = payload;
    if (!sessionId || !sessionPath) {
      return;
    }
    if (!agentId) {
      this.set(sessionId, sessionPath);
      return;
    }
    this.set(
      agentId,
      payload.agent_transcript_path ?? join(dirname(sessionPath), sessionId, 'subagents', `agent-${agentId}.jsonl`),
    );
  }

  /**
   * Cursor: session hooks carry `transcript_path`, hooks inside a subagent carry `null` — its transcript is found
   * from the parent's when `subagentStart` / `subagentStop` name it.
   */
  rememberCursorHook(payload: {
    conversation_id?: string;
    transcript_path?: string | null;
    subagent_id?: string;
    parent_conversation_id?: string;
    agent_transcript_path?: string | null;
  }): void {
    const conversationId = payload.conversation_id;
    const subagentId = payload.subagent_id
      ?.split(/[\r\n]/)
      .find(line => line.trim())
      ?.trim();
    if (subagentId) {
      const parentPath = this.get(payload.parent_conversation_id ?? conversationId ?? '') ?? payload.transcript_path;
      const path = payload.agent_transcript_path ?? (parentPath && cursorSubagentTranscript(parentPath, subagentId));
      if (path) {
        this.set(subagentId, path);
      }
      return;
    }
    if (conversationId && payload.transcript_path) {
      this.set(conversationId, payload.transcript_path);
    }
  }
}
