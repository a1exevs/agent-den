import { dirname, join } from 'node:path';

/** Where each agent's transcript lives. Filled from hook payloads and the transcript scanner. */
export class TranscriptRegistry {
  private readonly paths = new Map<string, string>();

  set(agentId: string, path: string): void {
    this.paths.set(agentId, path);
  }

  get(agentId: string): string | undefined {
    return this.paths.get(agentId);
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
}
