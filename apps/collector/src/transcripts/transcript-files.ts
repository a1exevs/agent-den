import { open, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { inferSubagentVerdict, type SubagentVerdict } from './infer-state';

const TAIL_BYTES = 256 * 1024;

/** Parsed JSONL lines from the last `TAIL_BYTES` of a transcript (a cut first line is dropped). */
export async function readTail(path: string): Promise<unknown[]> {
  const handle = await open(path, 'r');
  try {
    const { size } = await handle.stat();
    const start = Math.max(0, size - TAIL_BYTES);
    const buffer = Buffer.alloc(size - start);
    await handle.read(buffer, 0, buffer.length, start);
    const lines = buffer.toString('utf8').split('\n');
    // The first line of a mid-file tail is usually cut in half.
    const complete = start > 0 ? lines.slice(1) : lines;
    return complete.flatMap(line => {
      try {
        return line.trim() ? [JSON.parse(line) as unknown] : [];
      } catch {
        return [];
      }
    });
  } finally {
    await handle.close();
  }
}

export async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

type SubagentMeta = { agentType?: string; toolUseId?: string };

/** `<session>/subagents/agent-<id>.jsonl` → its `.meta.json` (agent type, the parent's tool use id). */
export function readSubagentMeta(subagentPath: string): Promise<SubagentMeta | undefined> {
  return readJson<SubagentMeta>(subagentPath.replace(/\.jsonl$/, '.meta.json'));
}

/** `<project>/<session>/subagents/agent-<id>.jsonl` → `<project>/<session>.jsonl`. */
export function parentTranscriptPath(subagentPath: string): string {
  const sessionDir = dirname(dirname(subagentPath));
  return join(dirname(sessionDir), `${sessionDir.split(/[\\/]/).at(-1)}.jsonl`);
}

/** How the parent session says this subagent ended — or null while it is still running. */
export async function readSubagentVerdict(subagentPath: string): Promise<SubagentVerdict | null> {
  const toolUseId = (await readSubagentMeta(subagentPath))?.toolUseId;
  if (!toolUseId) {
    return null;
  }
  try {
    return inferSubagentVerdict(await readTail(parentTranscriptPath(subagentPath)), toolUseId);
  } catch {
    return null;
  }
}
