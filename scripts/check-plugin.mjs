// Part of `npm run lint`: the committed plugin build must belong to the version in plugin.json. A version bump
// without `npm run build:plugin` would ship the old code under the new number.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { denDir, pluginVersion, readBuildInfo, sourcesHash } from './plugin-sources.mjs';

const version = pluginVersion();
const info = readBuildInfo();
const problems = [];

if (!info || !existsSync(join(denDir, 'collector.mjs')) || !existsSync(join(denDir, 'web', 'index.html'))) {
  problems.push('plugins/claude-code/den is missing or incomplete — run `npm run build:plugin`');
} else if (info.version !== version) {
  problems.push(`plugin.json says ${version}, but den/ was built as ${info.version} — run \`npm run build:plugin\``);
}

if (problems.length > 0) {
  process.stderr.write(`Plugin check failed:\n${problems.map(problem => `  ✘ ${problem}`).join('\n')}\n`);
  process.exit(1);
}
const fresh = info.sources === sourcesHash();
process.stdout.write(
  `Plugin OK: den/ is built as ${version}${fresh ? '' : ' (sources changed since — rebuild and bump before releasing)'}.\n`,
);
