import type { TranscriptBlock, TranscriptItem } from '@agent-den/contracts';

const MAX_TEXT = 8 * 1024;
const MAX_INPUT = 2 * 1024;

type RawBlock = {
  type?: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
};

type RawEntry = {
  type?: string;
  uuid?: string;
  timestamp?: string;
  isMeta?: boolean;
  message?: { content?: unknown };
};

function clip(text: string, limit: number): { text: string; clipped: boolean } {
  return text.length > limit ? { text: text.slice(0, limit), clipped: true } : { text, clipped: false };
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return (content as RawBlock[])
      .map(block => (block.type === 'text' ? (block.text ?? '') : block.type === 'image' ? '[image]' : ''))
      .join('\n');
  }
  return content === undefined ? '' : JSON.stringify(content);
}

function summarize(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }
  const record = input as Record<string, unknown>;
  const value =
    record['description'] ??
    record['file_path'] ??
    record['command'] ??
    record['pattern'] ??
    record['url'] ??
    record['query'];
  return typeof value === 'string' ? value.replace(/s+/g, ' ').slice(0, 120) : undefined;
}

function toBlock(block: RawBlock): TranscriptBlock | null {
  switch (block.type) {
    case 'text':
      return block.text ? { kind: 'text', text: clip(block.text, MAX_TEXT).text } : null;
    case 'thinking':
      return block.thinking ? { kind: 'thinking', text: clip(block.thinking, MAX_TEXT).text } : null;
    case 'tool_use':
      return {
        kind: 'tool-use',
        id: block.id ?? '',
        name: block.name ?? 'tool',
        input: clip(JSON.stringify(block.input ?? {}, null, 2), MAX_INPUT).text,
        summary: summarize(block.input),
      };
    case 'tool_result': {
      const { text, clipped } = clip(contentToText(block.content), MAX_TEXT);
      return {
        kind: 'tool-result',
        toolUseId: block.tool_use_id ?? '',
        text,
        isError: Boolean(block.is_error),
        clipped,
      };
    }
    default:
      return null;
  }
}

/** Turns a raw transcript line into a display item; bookkeeping and meta entries are dropped. */
export function normalizeEntry(value: unknown): TranscriptItem | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const entry = value as RawEntry;
  if ((entry.type !== 'user' && entry.type !== 'assistant') || entry.isMeta || !entry.message) {
    return null;
  }

  const content = entry.message.content;
  const blocks =
    typeof content === 'string'
      ? [{ kind: 'text' as const, text: clip(content, MAX_TEXT).text }]
      : Array.isArray(content)
        ? (content as RawBlock[]).map(toBlock).filter((block): block is TranscriptBlock => block !== null)
        : [];

  if (blocks.length === 0) {
    return null;
  }
  return { id: entry.uuid ?? `${entry.timestamp}-${entry.type}`, role: entry.type, timestamp: entry.timestamp, blocks };
}
