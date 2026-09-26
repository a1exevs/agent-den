// Packs the collector, the web app and the launcher into every plugin (Claude Code, Cursor), so a colleague needs
// nothing but the plugin:
//   plugins/<plugin>/den/collector.mjs   the collector, bundled with its dependencies
//   plugins/<plugin>/den/web/            the built den, served by the collector on the same port
//   plugins/<plugin>/den/launcher/       starts, upgrades and stops the collector (from plugins/launcher)
//   plugins/<plugin>/den/build-info.json the version and a hash of the sources it was built from
// Run before releasing a plugin version: `npm run build:plugin`. The output is committed — marketplaces install
// the plugin folder exactly as it is in git.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { build } from 'esbuild';

import {
  launcherDir,
  pluginVersion,
  plugins,
  readBuildInfo,
  readManifest,
  root,
  sourcesHash,
  versionSource,
} from './plugin-sources.mjs';

const version = pluginVersion();
const sources = sourcesHash();
const previous = readBuildInfo(versionSource);
if (previous?.version === version && previous.sources !== sources && !process.argv.includes('--same-version')) {
  process.stderr.write(
    `The sources changed since agent-den ${version} was built, but the version didn't.\n` +
      'Bump "version" in plugins/claude-code/.claude-plugin/plugin.json — users only get an update when it changes.\n' +
      '(Rebuilding an unreleased version on purpose? Pass --same-version.)\n',
  );
  process.exit(1);
}

execSync('npm run build -w @agent-den/web', { cwd: root, stdio: 'inherit' });
const webDist = join(root, 'apps', 'web', 'dist', 'web');
const staging = join(root, 'dist', 'plugin-den');
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

cpSync(join(webDist, 'browser'), join(staging, 'web'), { recursive: true });
if (existsSync(join(webDist, '3rdpartylicenses.txt'))) {
  cpSync(join(webDist, '3rdpartylicenses.txt'), join(staging, 'web-third-party-licenses.txt'));
}

await build({
  entryPoints: [join(root, 'apps', 'collector', 'src', 'main.ts')],
  outfile: join(staging, 'collector.mjs'),
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

mkdirSync(join(staging, 'launcher'));
for (const file of readdirSync(launcherDir).filter(name => name.endsWith('.mjs') && !name.endsWith('.test.mjs'))) {
  cpSync(join(launcherDir, file), join(staging, 'launcher', file));
}
writeFileSync(join(staging, 'build-info.json'), `${JSON.stringify({ version, sources }, null, 2)}\n`);

for (const plugin of plugins) {
  const manifest = readManifest(plugin);
  if (manifest.version !== version) {
    writeFileSync(plugin.manifestFile, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);
  }
  rmSync(plugin.denDir, { recursive: true, force: true });
  cpSync(staging, plugin.denDir, { recursive: true });
  process.stdout.write(`Packed agent-den ${version} into ${plugin.denDir}\n`);
}
rmSync(staging, { recursive: true, force: true });
