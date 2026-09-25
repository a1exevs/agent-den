import type { DenEvent } from '@agent-den/contracts';
import { describe, expect, it } from 'vitest';

import { DenStore } from './den-store';

const MINUTE = 60_000;
const start = 1_000_000;

function event(partial: Partial<DenEvent> & Pick<DenEvent, 'kind' | 'agentId'>): DenEvent {
  return { id: partial.agentId + partial.kind, source: 'mock', sessionId: 's1', timestamp: start, ...partial };
}

describe('DenStore.sweep', () => {
  it('keeps recently active agents', () => {
    const store = new DenStore();
    store.push(event({ kind: 'tool-start', agentId: 's1', toolName: 'Bash' }));
    expect(store.sweep(start + 5 * MINUTE)).toBe(0);
    expect(store.snapshot()).toHaveLength(1);
  });

  it('ends a busy session that went silent, taking its kittens along', () => {
    const store = new DenStore();
    store.push(event({ kind: 'tool-start', agentId: 's1' }));
    store.push(event({ kind: 'subagent-start', agentId: 'k1', parentAgentId: 's1' }));
    store.sweep(start + 31 * MINUTE);
    expect(store.snapshot()).toEqual([]);
    expect(store.has('s1')).toBe(true);
  });

  it('lets a sleeping cat nap longer than a busy one', () => {
    const store = new DenStore();
    store.push(event({ kind: 'stop', agentId: 's1' }));
    store.sweep(start + 31 * MINUTE);
    expect(store.snapshot()[0]?.activity).toBe('done');
    store.sweep(start + 61 * MINUTE);
    expect(store.snapshot()).toEqual([]);
  });

  it('sends an orphaned kitten back into the box', () => {
    const store = new DenStore();
    store.push(event({ kind: 'prompt', agentId: 's1', timestamp: start + 9 * MINUTE }));
    store.push(event({ kind: 'tool-start', agentId: 'k1', parentAgentId: 's1' }));
    store.sweep(start + 11 * MINUTE);
    const kitten = store.snapshot().find(agent => agent.agentId === 'k1');
    expect(kitten?.activity).toBe('done');
  });
});

describe('DenStore.sweep — interrupted', () => {
  it('treats an interrupted session as resting, not as a stuck busy one', () => {
    const store = new DenStore();
    store.push(event({ kind: 'interrupted', agentId: 's1' }));
    store.sweep(start + 31 * MINUTE);
    expect(store.snapshot()[0]?.activity).toBe('interrupted');
    store.sweep(start + 61 * MINUTE);
    expect(store.snapshot()).toEqual([]);
  });
});

describe('DenStore.setDismissed', () => {
  it('hides an agent for every client and keeps it in the snapshot for recall', () => {
    const store = new DenStore();
    const seen: string[] = [];
    store.subscribe(e => seen.push(e.kind));
    store.push(event({ kind: 'stop', agentId: 's1' }));
    store.setDismissed('s1', true);

    expect(seen).toEqual(['stop', 'dismissed']);
    expect(store.snapshot()[0]).toMatchObject({ activity: 'done', dismissed: true });
    store.setDismissed('s1', false);
    expect(store.snapshot()[0]?.dismissed).toBe(false);
  });

  it('ignores unknown and ended agents', () => {
    const store = new DenStore();
    store.setDismissed('nobody', true);
    store.push(event({ kind: 'session-end', agentId: 's1' }));
    store.setDismissed('s1', true);
    expect(store.snapshot()).toEqual([]);
  });
});
