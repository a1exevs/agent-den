// Packs the collector and the web app into the Claude Code plugin, so a colleague needs nothing but the plugin:
//   plugins/claude-code/den/collector.mjs   the collector, bundled with its dependencies
//   plugins/claude-code/den/web/            the built den, served by the collector on the same port
//   plugins/claude-code/den/build-info.json the version and a hash of the sources it was built from
// Run before releasing a plugin version: `npm run build:plugin`. The output is committed — marketplaces install
// the plugin folder exactly as it is in git.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { build } from 'esbuild';

import { buildInfoFile, denDir, pluginVersion, readBuildInfo, root, sourcesHash } from './plugin-sources.mjs';

const version = pluginVersion();
const sources = sourcesHash();
const previous = readBuildInfo();
if (previous?.version === version && previous.sources !== sources && !process.argv.includes('--same-version')) {
  process.stderr.write(
    `The sources changed since agent-den ${version} was built, but the version didn't.\n` +
      'Bump "version" in plugins/claude-code/.claude-plugin/plugin.json — users only get an update when it changes.\n' +
      '(Rebuilding an unreleased version on purpose? Pass --same-version.)\n',
  );
  process.exit(1);
}

rmSync(denDir, { recursive: true, force: true });
mkdirSync(denDir, { recursive: true });

execSync('npm run build -w @agent-den/web', { cwd: root, stdio: 'inherit' });
const webDist = join(root, 'apps', 'web', 'dist', 'web');
cpSync(join(webDist, 'browser'), join(denDir, 'web'), { recursive: true });
if (existsSync(join(webDist, '3rdpartylicenses.txt'))) {
  cpSync(join(webDist, '3rdpartylicenses.txt'), join(denDir, 'web-third-party-licenses.txt'));
}

await build({
  entryPoints: [join(root, 'apps', 'collector', 'src', 'main.ts')],
  outfile: join(denDir, 'collector.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // `ws` is CommonJS and requires Node built-ins; give the ESM bundle a real `require`.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  // Optional native speed-ups of `ws`: it falls back to plain JS without them.
  external: ['bufferutil', 'utf-8-validate'],
  legalComments: 'eof',
  logLevel: 'warning',
});

writeFileSync(buildInfoFile, `${JSON.stringify({ version, sources }, null, 2)}\n`);
process.stdout.write(`Packed agent-den ${version} into ${denDir}\n`);
