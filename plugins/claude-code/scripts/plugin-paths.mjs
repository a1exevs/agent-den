// Where the plugin keeps its data. Pure, so it is tested (`plugin-paths.test.mjs`).

import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CACHED_PLUGIN = /^(.*)[\\/]cache[\\/]([^\\/]+)[\\/]([^\\/]+)[\\/][^\\/]+[\\/]?$/;

/**
 * Hooks get `CLAUDE_PLUGIN_DATA`; a skill's shell may not. Both must agree on the folder (the pause flag, the saved
 * den), so without the variable it is derived the way Claude Code lays plugins out:
 * `…/plugins/cache/<marketplace>/<plugin>/<version>` → `…/plugins/data/<plugin>-<marketplace>`.
 */
export function pluginDataDir(pluginRoot, env = process.env) {
  if (env.CLAUDE_PLUGIN_DATA) {
    return env.CLAUDE_PLUGIN_DATA;
  }
  const match = CACHED_PLUGIN.exec(pluginRoot);
  if (match) {
    const [, pluginsDir, marketplace, plugin] = match;
    return join(pluginsDir, 'data', `${plugin}-${marketplace}`);
  }
  return join(tmpdir(), 'agent-den');
}
