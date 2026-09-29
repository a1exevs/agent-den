import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DenStore } from '../den-store';
import { cursorPromptText, inferCursorState, resolveCursorWorkspace } from './cursor-transcript';
import { normalizeEntry } from './normalize';
import { TranscriptReconciler } from './reconcile';
import { TranscriptRegistry } from './transcript-registry';
import { scanCursorTranscripts } from './transcript-scanner';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'den-cursor-'));
  dirs.push(dir);
  return dir;
}

const prompt = {
  role: 'user',
  message: {
    content: [{ type: 'text', text: '<timestamp>Sat</timestamp>\n<user_query>\npet the cat\n</user_query>' }],
  },
};
const shellCall = {
  role: 'assistant',
  message: {
    content: [
      { type: 'text', text: 'Running the tests.' },
      { type: 'tool_use', name: 'Shell', input: { command: 'npm test' } },
    ],
  },
};
const reply = { role: 'assistant', message: { content: [{ type: 'text', text: 'Done.' }] } };
const ended = (status: string, error?: string): object => ({ type: 'turn_ended', status, error });

describe('inferCursorState', () => {
  it('reads a running tool, a turn still going and its end', () => {
    expect(inferCursorState([prompt, shellCall])).toMatchObject({
      kind: 'tool-start',
      toolName: 'Shell',
      detail: 'npm test',
    });
    expect(inferCursorState([prompt, reply])).toMatchObject({ kind: 'prompt' });
    expect(inferCursorState([prompt, reply, ended('success')])).toMatchObject({ kind: 'stop' });
  });

  it('tells Esc from a failure', () => {
    expect(inferCursorState([prompt, ended('error', 'User aborted request')])?.kind).toBe('interrupted');
    expect(inferCursorState([prompt, ended('aborted', 'User aborted/interrupted manually.')])?.kind).toBe(
      'interrupted',
    );
    expect(inferCursorState([prompt, ended('error', '[unavailable] PING timed out')])).toMatchObject({
      kind: 'tool-error',
      detail: '[unavailable] PING timed out',
    });
  });
});

describe('Cursor transcript lines', () => {
  it('unwraps the prompt and names lines by their position', () => {
    expect(cursorPromptText('<timestamp>Sat</timestamp>\n<user_query>\npet the cat\n</user_query>')).toBe(
      'pet the cat',
    );
    expect(normalizeEntry(prompt, 'line-0')).toEqual({
      id: 'line-0',
      role: 'user',
      timestamp: undefined,
      blocks: [{ kind: 'text', text: 'pet the cat' }],
    });
    expect(normalizeEntry(shellCall, 'line-9')?.blocks[1]).toMatchObject({
      kind: 'tool-use',
      name: 'Shell',
      summary: 'npm test',
    });
    expect(normalizeEntry(ended('success'), 'line-20')).toBeNull();
  });
});

describe('resolveCursorWorkspace', () => {
  it('finds the folder a workspace name stands for, dashes in names included', async () => {
    const root = tempDir();
    mkdirSync(join(root, 'Users', 'me', 'projects', 'agent-den'), { recursive: true });
    mkdirSync(join(root, 'Users', 'me', 'projects', 'agent'), { recursive: true });
    expect(await resolveCursorWorkspace('Users-me-projects-agent-den', root)).toBe(
      join(root, 'Users', 'me', 'projects', 'agent-den'),
    );
    expect(await resolveCursorWorkspace('Users-me-missing', root)).toBeUndefined();
    expect(await resolveCursorWorkspace('1780073551779', root)).toBeUndefined();
  });
});

function writeTranscript(path: string, lines: object[], mtimeSeconds: number): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, lines.map(line => JSON.stringify(line)).join('\n'));
  utimesSync(path, mtimeSeconds, mtimeSeconds);
}

describe('scanCursorTranscripts', () => {
  it('backfills a live session and its running subagent, skipping finished ones and chats with no folder', async () => {
    const projects = tempDir();
    const workspace = tempDir();
    mkdirSync(join(workspace, 'Users', 'me', 'projects', 'agent-den'), { recursive: true });
    const session = join(projects, 'Users-me-projects-agent-den', 'agent-transcripts', 'c1');
    writeTranscript(join(session, 'c1.jsonl'), [prompt, shellCall], 1_000);
    writeTranscript(join(session, 'subagents', 'k1.jsonl'), [prompt, reply], 1_000);
    writeTranscript(join(session, 'subagents', 'k2.jsonl'), [prompt, reply, ended('success')], 1_000);
    const loose = join(projects, '1780073551779', 'agent-transcripts', 'loose');
    writeTranscript(join(loose, 'loose.jsonl'), [prompt, shellCall], 1_000);
    const store = new DenStore();
    const registry = new TranscriptRegistry();

    expect(await scanCursorTranscripts(store, registry, 1_060_000, projects, workspace)).toBe(2);
    expect(store.get('c1')).toMatchObject({
      source: 'cursor',
      activity: 'tool',
      toolName: 'Shell',
      cwd: join(workspace, 'Users', 'me', 'projects', 'agent-den'),
    });
    expect(store.get('k1')).toMatchObject({ parentAgentId: 'c1', activity: 'thinking' });
    expect(store.has('k2')).toBe(false);
    expect(store.has('loose')).toBe(false);
    expect(registry.get('k2')).toBe(join(session, 'subagents', 'k2.jsonl'));
  });
});

describe('TranscriptReconciler with Cursor transcripts', () => {
  function setup(heard: boolean): { store: DenStore; reconciler: TranscriptReconciler; path: string } {
    const path = join(tempDir(), 'agent-transcripts', 'c1', 'c1.jsonl');
    const store = new DenStore();
    const registry = new TranscriptRegistry();
    registry.set('c1', path);
    store.push({ id: 'e1', source: 'cursor', kind: 'stop', sessionId: 'c1', agentId: 'c1', timestamp: 1_000 });
    return { store, reconciler: new TranscriptReconciler(store, registry, () => heard), path };
  }

  it('takes only the end of a turn for an agent hooks report on', async () => {
    const { store, reconciler, path } = setup(true);
    writeTranscript(path, [prompt, shellCall], 2);
    expect(await reconciler.reconcile(60_000)).toBe(0);

    store.push({ id: 'e2', source: 'cursor', kind: 'tool-start', sessionId: 'c1', agentId: 'c1', timestamp: 3_000 });
    writeTranscript(path, [prompt, shellCall, ended('error', 'User aborted request')], 4);
    expect(await reconciler.reconcile(60_000)).toBe(1);
    expect(store.get('c1')?.activity).toBe('interrupted');
  });

  it('finishes a kitten whose transcript ended before the last hook was stamped', async () => {
    const path = join(tempDir(), 'agent-transcripts', 'c1', 'subagents', 'k1.jsonl');
    const store = new DenStore();
    const registry = new TranscriptRegistry();
    registry.set('k1', path);
    store.push({
      id: 'e1',
      source: 'cursor',
      kind: 'tool-end',
      sessionId: 'c1',
      agentId: 'k1',
      parentAgentId: 'c1',
      timestamp: 10_000,
    });
    writeTranscript(path, [prompt, shellCall, ended('success')], 2); // mtime 2000, older than the hook
    const reconciler = new TranscriptReconciler(store, registry, () => true);

    expect(await reconciler.reconcile(60_000)).toBe(1);
    expect(store.get('k1')?.activity).toBe('done');
  });

  it('follows the transcript fully for a session without hooks', async () => {
    const { store, reconciler, path } = setup(false);
    writeTranscript(path, [prompt, shellCall], 2);
    expect(await reconciler.reconcile(60_000)).toBe(1);
    expect(store.get('c1')).toMatchObject({ activity: 'tool', toolName: 'Shell' });
  });

  it('ends a Cursor session when its transcript was deleted from disk', async () => {
    const { store, reconciler, path } = setup(true);
    writeTranscript(path, [prompt], 1);
    rmSync(path);

    expect(await reconciler.reconcile(60_000)).toBe(1);
    expect(store.get('c1')?.activity).toBe('gone');
  });

  it('waits until hooks went quiet before ending a deleted Cursor chat', async () => {
    const { store, reconciler, path } = setup(true);
    writeTranscript(path, [prompt], 1);
    rmSync(path);

    expect(await reconciler.reconcile(10_000)).toBe(0);
    expect(store.get('c1')?.activity).toBe('done');
  });
});
