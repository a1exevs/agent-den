import { homedir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/** Cursor's local conversation index (`conversation-search.db`). */
export function cursorConversationDbPath(): string {
  const home = homedir();
  if (process.platform === 'darwin') {
    return join(home, 'Library/Application Support/Cursor/User/globalStorage/conversation-search.db');
  }
  if (process.platform === 'win32') {
    return join(process.env['APPDATA'] ?? join(home, 'AppData/Roaming'), 'Cursor/User/globalStorage/conversation-search.db');
  }
  return join(home, '.config/Cursor/User/globalStorage/conversation-search.db');
}

/**
 * Chats removed from the sidebar stay on disk as transcripts but are marked archived in Cursor's search DB.
 * Deleting a chat does not fire `sessionEnd`.
 */
export function archivedCursorConversationIds(dbPath = cursorConversationDbPath()): ReadonlySet<string> {
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare('SELECT id FROM conversations WHERE source = ? AND is_archived = 1')
      .all('local') as { id: string }[];
    return new Set(rows.map(row => row.id));
  } catch {
    return new Set();
  }
}
