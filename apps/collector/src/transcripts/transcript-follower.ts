import { open, stat } from 'node:fs/promises';

import type { TranscriptItem } from '@agent-den/contracts';

import { normalizeEntry } from './normalize';

const POLL_MS = 700;
/** Initial load reads at most this much from the end — long sessions have megabytes of history. */
const INITIAL_TAIL_BYTES = 2 * 1024 * 1024;
const INITIAL_ITEMS = 300;

type Listener = (items: TranscriptItem[], reset: boolean) => void;

async function readRange(path: string, start: number, end: number): Promise<string> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(end - start);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    await handle.close();
  }
}

function parse(lines: string[]): TranscriptItem[] {
  return lines.flatMap(line => {
    if (!line.trim()) {
      return [];
    }
    try {
      const item = normalizeEntry(JSON.parse(line));
      return item ? [item] : [];
    } catch {
      return [];
    }
  });
}

/**
 * Streams a growing JSONL transcript: the recent tail first (`reset`), then only appended lines.
 * Returns a stop function.
 */
export function followTranscript(path: string, onItems: Listener, onMissing: () => void): () => void {
  let offset = 0;
  let partial = '';
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const load = async (): Promise<void> => {
    const { size } = await stat(path);
    const start = Math.max(0, size - INITIAL_TAIL_BYTES);
    const lines = (await readRange(path, start, size)).split('\n');
    if (start > 0) {
      lines.shift();
    }
    partial = lines.pop() ?? '';
    offset = size;
    onItems(parse(lines).slice(-INITIAL_ITEMS), true);
  };

  const poll = async (): Promise<void> => {
    const { size } = await stat(path);
    if (size < offset) {
      await load();
      return;
    }
    if (size === offset) {
      return;
    }
    const lines = (partial + (await readRange(path, offset, size))).split('\n');
    offset = size;
    partial = lines.pop() ?? '';
    const items = parse(lines);
    if (items.length > 0) {
      onItems(items, false);
    }
  };

  const loop = (): void => {
    timer = setTimeout(() => {
      poll()
        .catch(() => undefined)
        .finally(() => {
          if (!stopped) {
            loop();
          }
        });
    }, POLL_MS);
  };

  load()
    .then(() => {
      if (!stopped) {
        loop();
      }
    })
    .catch(() => onMissing());

  return (): void => {
    stopped = true;
    clearTimeout(timer);
  };
}
