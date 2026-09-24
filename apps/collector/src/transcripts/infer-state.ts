import type { DenEventKind } from '@agent-den/contracts';

/** What the tail of a transcript says the agent is doing right now. */
export type InferredState = {
  kind: DenEventKind;
  cwd?: string;
  toolName?: string;
  detail?: string;
};

type ContentBlock = { type?: string; name?: string; input?: Record<string, unknown> };

type TranscriptEntry = {
  type?: string;
  subtype?: string;
  cwd?: string;
  message?: { content?: unknown };
};

function isEntry(value: unknown): value is TranscriptEntry {
  return typeof value === 'object' && value !== null;
}

function blocks(entry: TranscriptEntry): ContentBlock[] {
  const content = entry.message?.content;
  return Array.isArray(content) ? (content as ContentBlock[]) : [];
}

function describeInput(input: Record<string, unknown> | undefined): string | undefined {
  const value = input?.['file_path'] ?? input?.['command'] ?? input?.['pattern'] ?? input?.['description'];
  return typeof value === 'string' ? value.slice(0, 160) : undefined;
}

function stateOf(entry: TranscriptEntry): Omit<InferredState, 'cwd'> | null {
  if (entry.type === 'system' && entry.subtype === 'stop_hook_summary') {
    return { kind: 'stop' };
  }

  if (entry.type === 'assistant') {
    const toolUse = blocks(entry).findLast(block => block.type === 'tool_use');
    if (toolUse) {
      return { kind: 'tool-start', toolName: toolUse.name, detail: describeInput(toolUse.input) };
    }
    const hasText = blocks(entry).some(block => block.type === 'text');
    return { kind: hasText ? 'stop' : 'prompt' };
  }

  if (entry.type === 'user') {
    if (typeof entry.message?.content === 'string') {
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
