import type { DenEventKind } from '@agent-den/contracts';

/** What the tail of a transcript says the agent is doing right now. */
export type InferredState = {
  kind: DenEventKind;
  cwd?: string;
  toolName?: string;
  detail?: string;
};

/** How a subagent ended, according to its parent's transcript. */
export type SubagentVerdict = 'done' | 'stopped';

type ContentBlock = {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
};

type TranscriptEntry = {
  type?: string;
  subtype?: string;
  cwd?: string;
  toolUseResult?: { status?: string };
  message?: { content?: unknown; stop_reason?: string | null };
};

/** Stop reasons that end an assistant turn (anything but `tool_use`). */
const TURN_ENDING_STOP_REASONS = new Set(['end_turn', 'stop_sequence', 'max_tokens']);
/** Claude Code writes this as a user text block when the user hits Esc. */
const INTERRUPTED_MARKER = '[Request interrupted';

function isEntry(value: unknown): value is TranscriptEntry {
  return typeof value === 'object' && value !== null;
}

function blocks(entry: TranscriptEntry): ContentBlock[] {
  const content = entry.message?.content;
  return Array.isArray(content) ? (content as ContentBlock[]) : [];
}

/** Text the user (or the harness) typed — string content or text blocks, never tool output. */
function userText(entry: TranscriptEntry): string {
  const content = entry.message?.content;
  if (typeof content === 'string') {
    return content;
  }
  return blocks(entry)
    .filter(block => block.type === 'text')
    .map(block => block.text ?? '')
    .join('\n');
}

function describeInput(input: Record<string, unknown> | undefined): string | undefined {
  const value = input?.['file_path'] ?? input?.['command'] ?? input?.['pattern'] ?? input?.['description'];
  return typeof value === 'string' ? value.slice(0, 160) : undefined;
}

function assistantState(entry: TranscriptEntry): Omit<InferredState, 'cwd'> {
  const toolUse = blocks(entry).findLast(block => block.type === 'tool_use');
  const stopReason = entry.message?.stop_reason;
  if (toolUse || stopReason === 'tool_use') {
    return { kind: 'tool-start', toolName: toolUse?.name, detail: describeInput(toolUse?.input) };
  }
  if (stopReason && TURN_ENDING_STOP_REASONS.has(stopReason)) {
    return { kind: 'stop' };
  }
  // No stop reason (older transcripts / streaming): final text means the turn is over, bare thinking means it isn't.
  return { kind: blocks(entry).some(block => block.type === 'text') ? 'stop' : 'prompt' };
}

function stateOf(entry: TranscriptEntry): Omit<InferredState, 'cwd'> | null {
  if (entry.type === 'system' && entry.subtype === 'stop_hook_summary') {
    return { kind: 'stop' };
  }
  if (entry.type === 'assistant') {
    return assistantState(entry);
  }
  if (entry.type === 'user') {
    if (userText(entry).trimStart().startsWith(INTERRUPTED_MARKER)) {
      return { kind: 'interrupted' };
    }
    if (typeof entry.message?.content === 'string' || blocks(entry).some(block => block.type === 'text')) {
      return { kind: 'prompt' };
    }
    if (blocks(entry).some(block => block.type === 'tool_result')) {
      return { kind: 'tool-end' };
    }
  }
  return null;
}

/**
 * Walks transcript entries from the end and returns the agent's current state.
 * Bookkeeping entries (snapshots, titles, attachments) are skipped.
 */
export function inferState(entries: readonly unknown[]): InferredState | null {
  const typed = entries.filter(isEntry);
  const cwd = typed.findLast(entry => typeof entry.cwd === 'string')?.cwd;

  for (let index = typed.length - 1; index >= 0; index--) {
    const entry = typed[index];
    const state = entry ? stateOf(entry) : null;
    if (state) {
      return { ...state, cwd };
    }
  }
  return null;
}

function notificationVerdict(text: string, toolUseId: string): SubagentVerdict | null {
  if (!text.includes(`<tool-use-id>${toolUseId}</tool-use-id>`)) {
    return null;
  }
  const status = /<status>(\w+)<\/status>/.exec(text)?.[1] ?? 'completed';
  return status === 'completed' ? 'done' : 'stopped';
}

/**
 * Did the parent session learn that its subagent finished? Background agents end with a `<task-notification>`
 * (status completed / failed / stopped); foreground ones with the `tool_result` of the `Agent` call.
 * Returns the latest verdict, or null while the parent still waits.
 */
export function inferSubagentVerdict(parentEntries: readonly unknown[], toolUseId: string): SubagentVerdict | null {
  let verdict: SubagentVerdict | null = null;
  for (const entry of parentEntries.filter(isEntry)) {
    if (entry.type !== 'user') {
      continue;
    }
    const fromNotification = notificationVerdict(userText(entry), toolUseId);
    const result = blocks(entry).find(block => block.type === 'tool_result' && block.tool_use_id === toolUseId);
    const launchedOnly = entry.toolUseResult?.status === 'async_launched';
    if (fromNotification) {
      verdict = fromNotification;
    } else if (result && !launchedOnly) {
      verdict = result.is_error ? 'stopped' : 'done';
    }
  }
  return verdict;
}
