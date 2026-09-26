// This plugin as the shared launcher (`den/launcher`, packed by `npm run build:plugin`) sees it.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { denServer, readPluginVersion } from '../den/launcher/den-server.mjs';
import { pluginDataDir } from './plugin-paths.mjs';

const root = process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');

export const den = denServer({
  root,
  version: readPluginVersion(join(root, '.claude-plugin', 'plugin.json')),
  startCommand: '/agent-den:start',
  // Up to 0.2.x the den lived in the plugin data folder.
  legacyDataDir: pluginDataDir(root),
});

/**
 * Cursor runs Claude Code hooks too (third-party imports). Its payloads carry `cursor_version`; the Cursor plugin
 * reports those sessions, so this one stays out of it instead of counting every cat twice.
 */
export const isCursorPayload = payload => typeof payload?.cursor_version === 'string';
