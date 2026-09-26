// This plugin as the shared launcher (`den/launcher`, packed by `npm run build:plugin`) sees it.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { denServer, readPluginVersion } from '../den/launcher/den-server.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const den = denServer({
  root,
  version: readPluginVersion(join(root, '.cursor-plugin', 'plugin.json')),
  startCommand: '/agent-den-start',
});

/**
 * Hooks that decide whether an action may run. Cursor blocks the action when such a hook exits 0 without valid JSON;
 * `{}` takes no side — it neither allows nor denies, the user's own approval settings still apply.
 */
const PERMISSION_HOOKS = new Set([
  'preToolUse',
  'subagentStart',
  'beforeShellExecution',
  'beforeMCPExecution',
  'beforeReadFile',
]);

/** Answers the hook before anything can fail: the agent must never wait on (or be blocked by) the den. */
export function answer(payload) {
  if (PERMISSION_HOOKS.has(payload?.hook_event_name)) {
    process.stdout.write('{}');
  }
}
