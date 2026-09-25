import { randomUUID } from 'node:crypto';
import { open, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

import { categorizeTool, type DenEvent, type DenEventKind } from '@agent-den/contracts';

import type { DenStore } from '../den-store';
import { type InferredState, inferState } from './infer-state';
import { readJson, readSubagentMeta, readSubagentVerdict, readTail } from './transcript-files';
import type { TranscriptRegistry } from './transcript-registry';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');
/** Only transcripts touched this recently count as live sessions. */
const ACTIVE_WINDOW_MS = 10 * 60_000;

type Identity = Pick<DenEvent, 'sessionId' | 'agentId' | 'parentAgentId'>;

const HEAD_BYTES = 32 * 1024;

async function readHeadCwds(path: string): Promise<string[]> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEAD_BYTES, 0);
    const head = buffer.toString('utf8', 0, bytesRead);
    return [...head.matchAll(/"cwd":("(?:[^"\\]|\\.)*")/g)].map(match => JSON.parse(match[1] ?? '""') as string);
  } finally {
    await handle.close();
  }
}

/** Claude Code names a project's transcript folder after its root with every non-alphanumeric char as `-`. */
export const encodeProjectDir = (dir: string): string => dir.replace(/[^a-zA-Z0-9]/g, '-');

/**
 * The room is the project root, not wherever the agent `cd`-ed to: pick the transcript `cwd` whose encoding matches
 * the folder name; fall back to the first `cwd` of the session.
 */
async function resolveProjectDir(
  path: string,
  projectFolder: string,
  tail: readonly unknown[],
): Promise<string | undefined> {
  const tailCwds = tail.flatMap(entry =>
    typeof entry === 'object' && entry !== null && 'cwd' in entry && typeof entry.cwd === 'string' ? [entry.cwd] : [],
  );
  const candidates = [...(await readHeadCwds(path)), ...tailCwds];
  return candidates.find(cwd => encodeProjectDir(cwd) === projectFolder) ?? candidates[0];
}

async function freshFiles(dir: string, now: number, pattern: RegExp): Promise<{ path: string; mtime: number }[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const files = await Promise.all(
    names
      .filter(name => pattern.test(name))
      .map(async name => {
        const path = join(dir, name);
        const { mtimeMs } = await stat(path);
        return { path, mtime: mtimeMs };
      }),
  );
  return files.filter(file => now - file.mtime < ACTIVE_WINDOW_MS);
}

function event(identity: Identity, kind: DenEventKind, timestamp: number, extra: Partial<DenEvent> = {}): DenEvent {
  return { id: randomUUID(), source: 'claude-code', kind, timestamp, ...identity, ...extra };
}

function stateEvent(identity: Identity, state: InferredState, timestamp: number): DenEvent {
  return event(identity, state.kind, timestamp, {
    toolName: state.toolName,
    toolCategory: state.toolName ? categorizeTool(state.toolName) : undefined,
    detail: state.detail,
  });
}

/**
 * Backfills sessions the collector hasn't heard about through hooks — after a collector restart, or for sessions
 * without the plugin. Hooks stay the source of truth: agents already known to the store are never touched.
 */
export async function scanTranscripts(
  store: DenStore,
  registry: TranscriptRegistry,
  now = Date.now(),
): Promise<number> {
  let added = 0;
  let projects: string[];
  try {
    projects = await readdir(PROJECTS_DIR);
  } catch {
    return 0;
  }

  for (const project of projects) {
    const projectDir = join(PROJECTS_DIR, project);
    for (const file of await freshFiles(projectDir, now, /\.jsonl$/)) {
      const sessionId = basename(file.path, '.jsonl');
      const sessionDir = join(projectDir, sessionId);
      registry.set(sessionId, file.path);

      if (!store.has(sessionId)) {
        const tail = await readTail(file.path);
        const state = inferState(tail);
        if (state) {
          const title = (await readJson<{ customTitle?: string }>(join(sessionDir, 'custom-title.json')))?.customTitle;
          const identity = { sessionId, agentId: sessionId };
          const cwd = await resolveProjectDir(file.path, project, tail);
          store.push(event(identity, 'session-start', file.mtime, { cwd, title }));
          store.push(stateEvent(identity, state, file.mtime));
          added++;
        }
      }

      for (const subagent of await freshFiles(join(sessionDir, 'subagents'), now, /^agent-.+\.jsonl$/)) {
        const agentId = basename(subagent.path, '.jsonl').replace(/^agent-/, '');
        registry.set(agentId, subagent.path);
        if (store.has(agentId)) {
          continue;
        }
        const state = inferState(await readTail(subagent.path));
        // A finished subagent is already back in its box — by its own transcript or by its parent's word.
        if (!state || state.kind === 'stop' || (await readSubagentVerdict(subagent.path))) {
          continue;
        }
        const meta = await readSubagentMeta(subagent.path);
        const identity = { sessionId, agentId, parentAgentId: sessionId };
        store.push(event(identity, 'subagent-start', subagent.mtime, { cwd: state.cwd, title: meta?.agentType }));
        store.push(stateEvent(identity, state, subagent.mtime));
        added++;
      }
    }
  }

  return added;
}
