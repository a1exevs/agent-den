import { randomUUID } from 'node:crypto';

import { categorizeTool, type DenEvent, type DenEventKind } from '@agent-den/contracts';

/** Subset of the Claude Code hook stdin payload we rely on. */
export interface ClaudeCodeHookPayload {
  hook_event_name: string;
  session_id: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  prompt?: string;
  message?: string;
  /** Present on subagent hooks (and on tool hooks fired inside a subagent). */
  agent_id?: string;
  agent_type?: string;
}

const kindByHook: Record<string, DenEventKind> = {
  SessionStart: 'session-start',
  SessionEnd: 'session-end',
  UserPromptSubmit: 'prompt',
  PreToolUse: 'tool-start',
  PostToolUse: 'tool-end',
  PostToolUseFailure: 'tool-error',
  SubagentStart: 'subagent-start',
  SubagentStop: 'subagent-stop',
  Notification: 'waiting',
  PermissionRequest: 'waiting',
  Stop: 'stop',
};

function describeToolInput(input: Record<string, unknown> | undefined): string | undefined {
  const value =
    input?.['file_path'] ?? input?.['command'] ?? input?.['pattern'] ?? input?.['url'] ?? input?.['description'];
  return typeof value === 'string' ? value.slice(0, 160) : undefined;
}

export function fromClaudeCodeHook(payload: ClaudeCodeHookPayload): DenEvent | null {
  const kind = kindByHook[payload.hook_event_name];
  if (!kind || !payload.session_id) {
    return null;
  }

  const isSubagent = Boolean(payload.agent_id);

  return {
    id: randomUUID(),
    source: 'claude-code',
    kind,
    sessionId: payload.session_id,
    agentId: payload.agent_id ?? payload.session_id,
    parentAgentId: isSubagent ? payload.session_id : undefined,
    cwd: payload.cwd,
    toolName: payload.tool_name,
    toolCategory: payload.tool_name ? categorizeTool(payload.tool_name) : undefined,
    detail:
      payload.message ?? payload.prompt?.slice(0, 160) ?? describeToolInput(payload.tool_input) ?? payload.agent_type,
    timestamp: Date.now(),
  };
}
