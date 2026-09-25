import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DenEvent } from '@agent-den/contracts';
import { describe, expect, it } from 'vitest';

import { loadDen, saveDen } from './den-state';
import { DenStore } from './den-store';
import { TranscriptRegistry } from './transcripts/transcript-registry';

const DAY = 24 * 60 * 60_000;
const now = Date.now();

function event(partial: Partial<DenEvent> & Pick<DenEvent, 'kind' | 'agentId'>): DenEvent {
  return { id: partial.agentId + partial.kind, source: 'mock', sessionId: 's1', timestamp: now, ...partial };
}

const stateFile = (): string => join(mkdtempSync(join(tmpdir(), 'den-state-')), 'den-state.json');

describe('saveDen / loadDen', () => {
  it('brings the den back after a restart: agents, hidden flags and transcripts', async () => {
    const file = stateFile();
    const store = new DenStore();
    const transcripts = new TranscriptRegistry();
    store.push(event({ kind: 'stop', agentId: 's1', detail: 'done' }));
    store.push(event({ kind: 'subagent-start', agentId: 'k1', parentAgentId: 's1' }));
    store.push(event({ kind: 'stop', agentId: 's2', sessionId: 's2' }));
    store.setDismissed('s2', true);
    transcripts.set('s1', '/transcripts/s1.jsonl');
    await saveDen(file, store, transcripts);

    const restored = new DenStore();
    const restoredTranscripts = new TranscriptRegistry();
    expect(await loadDen(file, restored, restoredTranscripts)).toBe(3);
    expect(restored.snapshot()).toEqual(store.snapshot());
    expect(restored.snapshot().find(agent => agent.agentId === 's2')?.dismissed).toBe(true);
    expect(restoredTranscripts.get('s1')).toBe('/transcripts/s1.jsonl');
  });

  it('remembers recently ended sessions (so backfill does not resurrect them) but forgets old ones', async () => {
    const file = stateFile();
    const store = new DenStore();
    store.push(event({ kind: 'session-end', agentId: 'recent', sessionId: 'recent' }));
    store.push(event({ kind: 'session-end', agentId: 'old', sessionId: 'old', timestamp: now - 2 * DAY }));
    await saveDen(file, store, new TranscriptRegistry());

    const restored = new DenStore();
    await loadDen(file, restored, new TranscriptRegistry());
    expect(restored.has('recent')).toBe(true);
    expect(restored.has('old')).toBe(false);
  });

  it('starts empty from a missing or broken file', async () => {
    const file = stateFile();
    expect(await loadDen(file, new DenStore(), new TranscriptRegistry())).toBe(0);
    writeFileSync(file, '{ not json');
    expect(await loadDen(file, new DenStore(), new TranscriptRegistry())).toBe(0);
    writeFileSync(file, JSON.stringify({ format: 99 }));
    expect(await loadDen(file, new DenStore(), new TranscriptRegistry())).toBe(0);
  });
});
