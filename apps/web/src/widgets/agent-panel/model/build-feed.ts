import type { TranscriptItem } from '@agent-den/contracts';

export type ToolResult = { text: string; isError: boolean; clipped: boolean };

export type FeedEntry =
  | { kind: 'prompt' | 'reply' | 'thinking' | 'note'; id: string; time?: string; text: string }
  | { kind: 'tool'; id: string; time?: string; name: string; summary?: string; input: string; result?: ToolResult };

/** Harness-injected user messages (`<task-notification>`, `<command-name>`, ...) are notes, not prompts. */
const isHarnessText = (text: string): boolean => text.trimStart().startsWith('<');

/**
 * Flattens transcript messages into a feed: one entry per text/thinking block, one per tool call
 * with its result attached (results arrive in a later user message, matched by tool use id).
 */
export function buildFeed(items: readonly TranscriptItem[]): FeedEntry[] {
  const feed: FeedEntry[] = [];
  const tools = new Map<string, Extract<FeedEntry, { kind: 'tool' }>>();

  for (const item of items) {
    item.blocks.forEach((block, index) => {
      const id = `${item.id}:${index}`;
      const time = item.timestamp;
      switch (block.kind) {
        case 'text':
          if (item.role === 'assistant') {
            feed.push({ kind: 'reply', id, time, text: block.text });
          } else {
            feed.push({ kind: isHarnessText(block.text) ? 'note' : 'prompt', id, time, text: block.text });
          }
          break;
        case 'thinking':
          feed.push({ kind: 'thinking', id, time, text: block.text });
          break;
        case 'tool-use': {
          const entry = {
            kind: 'tool' as const,
            id,
            time,
            name: block.name,
            summary: block.summary,
            input: block.input,
          };
          tools.set(block.id, entry);
          feed.push(entry);
          break;
        }
        case 'tool-result': {
          const tool = tools.get(block.toolUseId);
          if (tool) {
            tool.result = { text: block.text, isError: block.isError, clipped: block.clipped };
          }
          break;
        }
      }
    });
  }

  return feed;
}
