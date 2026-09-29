import { mkdtempSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DenStore } from '../den-store';
import { TranscriptReconciler } from './reconcile';
import { TranscriptRegistry } from './transcript-registry';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

function setup(): {
  store: DenStore;
  reconciler: TranscriptReconciler;
  path: string;
  write: (...lines: object[]) => void;
} {
  const dir = mkdtempSync(join(tmpdir(), 'den-reconcile-'));
  dirs.push(dir);
  const path = join(dir, 's1.jsonl');
  const store = new DenStore();
  const registry = new TranscriptRegistry();
  registry.set('s1', path);
  const write = (...lines: object[]): void => writeFileSync(path, lines.map(line => JSON.stringify(line)).join('\n'));
  return { store, reconciler: new TranscriptReconciler(store, registry), path, write };
}

const bashCall = {
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name: 'Bash' }], stop_reason: 'tool_use' },
};
const interrupted = { type: 'user', message: { content: [{ type: 'text', text: '[Request interrupted by user]' }] } };

describe('TranscriptReconciler', () => {
  it('notices an interrupted turn that hooks never reported', async () => {
    const { store, reconciler, path, write } = setup();
    store.push({
      id: 'e1',
      source: 'claude-code',
      kind: 'tool-start',
      sessionId: 's1',
      agentId: 's1',
      toolName: 'Bash',
      toolCategory: 'shell',
      timestamp: 1_000,
    });
    write(bashCall, interrupted);
    utimesSync(path, 2, 2); // mtime 2000 ms > updatedAt 1000 ms

    expect(await reconciler.reconcile(60_000)).toBe(1);
    expect(store.snapshot()[0]).toMatchObject({ activity: 'interrupted', updatedAt: 2_000 });
  });

  it('does not let an older transcript override a newer Claude hook', async () => {
    const { store, reconciler, path, write } = setup();
    store.push({
      id: 'e1',
      source: 'claude-code',
      kind: 'tool-start',
      sessionId: 's1',
      agentId: 's1',
      toolName: 'Bash',
      toolCategory: 'shell',
      timestamp: 10_000,
    });
    write(interrupted);
    utimesSync(path, 2, 2); // mtime 2000 ms, older than the hook

    expect(await reconciler.reconcile(60_000)).toBe(0);
    expect(store.snapshot()[0]?.activity).toBe('tool');
  });

  it('stays quiet while hooks are fresh, and does not repeat an unchanged state', async () => {
    const { store, reconciler, path, write } = setup();
    store.push({
      id: 'e1',
      source: 'claude-code',
      kind: 'tool-start',
      sessionId: 's1',
      agentId: 's1',
      toolName: 'Bash',
      toolCategory: 'shell',
      timestamp: 1_000,
    });
    write(bashCall);
    utimesSync(path, 2, 2);

    expect(await reconciler.reconcile(5_000)).toBe(0); // hooks spoke 4 s ago
    expect(await reconciler.reconcile(60_000)).toBe(0); // transcript says the same: Bash is running
    expect(store.snapshot()[0]?.toolCounts).toEqual({ shell: 1 }); // not double-counted
  });

  it('does not end a Claude session when its transcript file is gone', async () => {
    const { store, reconciler, path, write } = setup();
    store.push({
      id: 'e1',
      source: 'claude-code',
      kind: 'stop',
      sessionId: 's1',
      agentId: 's1',
      timestamp: 1_000,
    });
    write(bashCall);
    unlinkSync(path);

    expect(await reconciler.reconcile(60_000)).toBe(0);
    expect(store.get('s1')?.activity).toBe('done');
  });
});
