import { readFile, rename, writeFile } from 'node:fs/promises';

import type { AgentState } from '@agent-den/contracts';

import type { DenStore } from './den-store';
import type { TranscriptRegistry } from './transcripts/transcript-registry';

/** On-disk copy of the den, so a restart (plugin update, reboot) doesn't empty it. */
type SavedDen = {
  format: 1;
  savedAt: number;
  agents: AgentState[];
  transcripts: [agentId: string, path: string][];
};

function isSavedDen(value: unknown): value is SavedDen {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const saved = value as Partial<SavedDen>;
  return saved.format === 1 && Array.isArray(saved.agents) && Array.isArray(saved.transcripts);
}

/** Writes via a temp file + rename, so a crash mid-write never leaves a broken file behind. */
export async function saveDen(file: string, store: DenStore, transcripts: TranscriptRegistry): Promise<void> {
  const saved: SavedDen = {
    format: 1,
    savedAt: Date.now(),
    agents: store.export(),
    transcripts: transcripts.entries(),
  };
  const temp = `${file}.tmp`;
  await writeFile(temp, JSON.stringify(saved));
  await rename(temp, file);
}

/** Missing, unreadable or foreign files load nothing — the den just starts empty, as before. */
export async function loadDen(file: string, store: DenStore, transcripts: TranscriptRegistry): Promise<number> {
  let saved: unknown;
  try {
    saved = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return 0;
  }
  if (!isSavedDen(saved)) {
    return 0;
  }
  store.restore(saved.agents.filter(agent => typeof agent?.agentId === 'string'));
  for (const [agentId, path] of saved.transcripts) {
    if (typeof agentId === 'string' && typeof path === 'string') {
      transcripts.set(agentId, path);
    }
  }
  return store.snapshot().length;
}
