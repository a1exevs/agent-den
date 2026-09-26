// Where versions up to 0.2.x kept the plugin's data — adopted into the shared den home on the first start.
// Pure, so it is tested (`plugin-paths.test.mjs`).

import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CACHED_PLUGIN = /^(.*)[\\/]cache[\\/]([^\\/]+)[\\/]([^\\/]+)[\\/][^\\/]+[\\/]?$/;

/**
 * Hooks get `CLAUDE_PLUGIN_DATA`; a skill's shell may not. Without the variable it is derived the way Claude Code
 * lays plugins out: `…/plugins/cache/<marketplace>/<plugin>/<version>` → `…/plugins/data/<plugin>-<marketplace>`.
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
