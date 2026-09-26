// Part of `npm run lint`: every committed plugin build must belong to the one version in the manifests. A version
// bump without `npm run build:plugin` would ship the old code under the new number.

import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { pluginVersion, plugins, readBuildInfo, readManifest, root, sourcesHash } from './plugin-sources.mjs';

const version = pluginVersion();
const problems = [];
let stale = false;

for (const plugin of plugins) {
  const denDir = relative(root, plugin.denDir).split('\\').join('/');
  const manifestVersion = readManifest(plugin).version;
  const info = readBuildInfo(plugin);
  if (manifestVersion !== version) {
    problems.push(
      `${plugin.name} plugin.json says ${manifestVersion}, the Claude Code one ${version} — run \`npm run build:plugin\``,
    );
  }
  if (
    !info ||
    !existsSync(join(plugin.denDir, 'collector.mjs')) ||
    !existsSync(join(plugin.denDir, 'web', 'index.html')) ||
    !existsSync(join(plugin.denDir, 'launcher', 'den-server.mjs'))
  ) {
    problems.push(`${denDir} is missing or incomplete — run \`npm run build:plugin\``);
  } else if (info.version !== version) {
    problems.push(
      `plugin.json says ${version}, but ${denDir} was built as ${info.version} — run \`npm run build:plugin\``,
    );
  } else {
    stale ||= info.sources !== sourcesHash();
  }
}

if (problems.length > 0) {
  process.stderr.write(`Plugin check failed:\n${problems.map(problem => `  ✘ ${problem}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `Plugins OK: den/ is built as ${version}${stale ? ' (sources changed since — rebuild and bump before releasing)' : ''}.\n`,
);
