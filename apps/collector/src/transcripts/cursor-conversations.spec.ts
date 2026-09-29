import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import { DenStore } from '../den-store';
import { archivedCursorConversationIds } from './cursor-conversations';
import { TranscriptReconciler } from './reconcile';
import { TranscriptRegistry } from './transcript-registry';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

function tempConversationDb(archivedIds: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'den-cursor-db-'));
  dirs.push(dir);
  const path = join(dir, 'conversation-search.db');
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE conversations (
    fts_rowid INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    scope TEXT NOT NULL,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    branches TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    is_archived INTEGER NOT NULL,
    root_fingerprint TEXT,
    cache_fingerprint TEXT
  )`);
  const insert = db.prepare(
    'INSERT INTO conversations (source, scope, id, title, branches, updated_at, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  for (const id of archivedIds) {
    insert.run('local', '', id, 't', '[]', 1, 1);
  }
  insert.run('local', '', 'active-chat', 'active', '[]', 2, 0);
  return path;
}

describe('archivedCursorConversationIds', () => {
  it('returns archived local conversation ids', () => {
    const path = tempConversationDb(['gone-chat']);
    expect(archivedCursorConversationIds(path)).toEqual(new Set(['gone-chat']));
  });

  it('returns an empty set for a missing database', () => {
    expect(archivedCursorConversationIds(join(tmpdir(), 'missing.db'))).toEqual(new Set());
  });
});

describe('TranscriptReconciler — archived Cursor chats', () => {
  it('ends sessions whose conversation was archived in Cursor', async () => {
    const dbPath = tempConversationDb(['c-archived']);
    const store = new DenStore();
    store.push({
      id: 'e1',
      source: 'cursor',
      kind: 'stop',
      sessionId: 'c-archived',
      agentId: 'c-archived',
      timestamp: 1,
    });
    store.push({
      id: 'e2',
      source: 'cursor',
      kind: 'stop',
      sessionId: 'active-chat',
      agentId: 'active-chat',
      timestamp: 1,
    });
    const reconciler = new TranscriptReconciler(store, new TranscriptRegistry(), () => false, dbPath);

    expect(await reconciler.reconcile(60_000)).toBe(1);
    expect(store.get('c-archived')?.activity).toBe('gone');
    expect(store.get('active-chat')?.activity).toBe('done');
  });
});
