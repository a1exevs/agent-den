import { randomUUID } from 'node:crypto';

import { categorizeTool, type DenEvent, type DenEventKind } from '@agent-den/contracts';

/** Subset of the Cursor hook stdin payload we rely on. */
export interface CursorHookPayload {
  hook_event_name: string;
  conversation_id: string;
  workspace_roots?: string[];
  command?: string;
  file_path?: string;
  tool_name?: string;
  prompt?: string;
  status?: string;
}

const kindByHook: Record<string, DenEventKind> = {
  beforeSubmitPrompt: 'prompt',
  beforeShellExecution: 'tool-start',
  afterShellExecution: 'tool-end',
  beforeMCPExecution: 'tool-start',
  afterMCPExecution: 'tool-end',
  beforeReadFile: 'tool-start',
  afterFileEdit: 'tool-end',
  stop: 'stop',
};

const toolByHook: Record<string, string> = {
  beforeShellExecution: 'shell',
  afterShellExecution: 'shell',
  beforeReadFile: 'read_file',
  afterFileEdit: 'edit_file',
};

export function fromCursorHook(payload: CursorHookPayload): DenEvent | null {
  const kind = kindByHook[payload.hook_event_name];
  if (!kind || !payload.conversation_id) {
    return null;
  }

  const toolName = payload.tool_name ?? toolByHook[payload.hook_event_name];

  return {
    id: randomUUID(),
    source: 'cursor',
    kind,
    sessionId: payload.conversation_id,
    agentId: payload.conversation_id,
    cwd: payload.workspace_roots?.[0],
    toolName,
    toolCategory: toolName ? categorizeTool(toolName) : undefined,
    detail: payload.command ?? payload.file_path ?? payload.prompt?.slice(0, 160),
    timestamp: Date.now(),
  };
}
