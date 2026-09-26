import { readdir } from 'node:fs/promises';
import { join, parse } from 'node:path';

import type { InferredState } from './infer-state';

/**
 * Cursor transcripts (`~/.cursor/projects/<workspace>/agent-transcripts/<id>/<id>.jsonl`): one line per message,
 * `{ role, message: { content: [text | tool_use] } }`, and `{ type: 'turn_ended', status, error? }` after each turn.
 * No tool results, timestamps or cwd. Written in batches, so the tail can lag behind the hooks.
 */
type CursorLine = {
  role?: string;
  type?: string;
  status?: string;
  error?: string;
  message?: { content?: unknown };
};

type ContentBlock = { type?: string; text?: string; name?: string; input?: Record<string, unknown> };

export const isCursorTranscript = (path: string): boolean => /[\\/]agent-transcripts[\\/]/.test(path);

function isLine(value: unknown): value is CursorLine {
  return typeof value === 'object' && value !== null;
}

function describeInput(input: Record<string, unknown> | undefined): string | undefined {
  const value = input?.['file_path'] ?? input?.['path'] ?? input?.['command'] ?? input?.['pattern'];
  return typeof value === 'string' ? value.slice(0, 160) : undefined;
}

function turnEnd(line: CursorLine): InferredState {
  if (line.status === 'success') {
    return { kind: 'stop' };
  }
  const aborted = line.status === 'aborted' || /aborted|interrupted/i.test(line.error ?? '');
  return aborted ? { kind: 'interrupted' } : { kind: 'tool-error', detail: line.error?.slice(0, 160) };
}

function stateOf(line: CursorLine): InferredState | null {
  if (line.type === 'turn_ended') {
    return turnEnd(line);
  }
  if (line.role === 'user') {
    return { kind: 'prompt' };
  }
  if (line.role === 'assistant') {
    const content = line.message?.content;
    const toolUse = (Array.isArray(content) ? (content as ContentBlock[]) : []).findLast(
      block => block.type === 'tool_use',
    );
    // Until `turn_ended` the turn goes on: a reply without a tool call is the agent still thinking aloud.
    return toolUse
      ? { kind: 'tool-start', toolName: toolUse.name, detail: describeInput(toolUse.input) }
      : { kind: 'prompt' };
  }
  return null;
}

/** The agent's current state from the tail of a Cursor transcript. */
export function inferCursorState(entries: readonly unknown[]): InferredState | null {
  for (const entry of entries.toReversed()) {
    const state = isLine(entry) ? stateOf(entry) : null;
    if (state) {
      return state;
    }
  }
  return null;
}

/** Cursor wraps what the user typed: `<timestamp>…</timestamp>\n<user_query>…</user_query>`. */
export function cursorPromptText(text: string): string {
  const query = /<user_query>\n?([\s\S]*?)\n?<\/user_query>/.exec(text)?.[1];
  return query ?? text;
}

/** Cursor names a workspace's folder after its path with every non-alphanumeric char as `-` (leading one dropped). */
const encode = (name: string): string => name.replace(/[^a-zA-Z0-9]/g, '-');

async function childDirs(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);
  } catch {
    return [];
  }
}

async function walk(dir: string, rest: string): Promise<string | undefined> {
  for (const name of await childDirs(dir)) {
    const encoded = encode(name);
    if (encoded === rest) {
      return join(dir, name);
    }
    if (rest.startsWith(`${encoded}-`)) {
      const found = await walk(join(dir, name), rest.slice(encoded.length + 1));
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

const workspaces = new Map<string, string | undefined>();

/**
 * `Users-me-projects-agent-den` → `/Users/me/projects/agent-den` (on Windows `c-Users-…` → `C:\Users\…`). The
 * encoding is lossy (`agent-den` could be `agent/den`), so the folder name is matched against what exists on disk.
 * Numeric names are chats without a folder.
 */
export async function resolveCursorWorkspace(
  folder: string,
  root = parse(process.cwd()).root,
): Promise<string | undefined> {
  if (/^\d+$/.test(folder)) {
    return undefined;
  }
  const drive = process.platform === 'win32' ? /^([a-zA-Z])-(.+)$/.exec(folder) : null;
  const [start, rest] = drive ? [`${drive[1]?.toUpperCase()}:\\`, drive[2] ?? ''] : [root, folder];
  const key = `${start}\0${rest}`;
  if (!workspaces.has(key)) {
    workspaces.set(key, await walk(start, rest));
  }
  return workspaces.get(key);
}
