// Packs the collector and the web app into the Claude Code plugin, so a colleague needs nothing but the plugin:
//   plugins/claude-code/den/collector.mjs   the collector, bundled with its dependencies
//   plugins/claude-code/den/web/            the built den, served by the collector on the same port
// Run before releasing a plugin version: `npm run build:plugin`. The output is committed — marketplaces install
// the plugin folder exactly as it is in git.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const plugin = join(root, 'plugins', 'claude-code');
const out = join(plugin, 'den');
const { version } = JSON.parse(readFileSync(join(plugin, '.claude-plugin', 'plugin.json'), 'utf8'));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

execSync('npm run build -w @agent-den/web', { cwd: root, stdio: 'inherit' });
const webDist = join(root, 'apps', 'web', 'dist', 'web');
cpSync(join(webDist, 'browser'), join(out, 'web'), { recursive: true });
if (existsSync(join(webDist, '3rdpartylicenses.txt'))) {
  cpSync(join(webDist, '3rdpartylicenses.txt'), join(out, 'web-third-party-licenses.txt'));
}

await build({
  entryPoints: [join(root, 'apps', 'collector', 'src', 'main.ts')],
  outfile: join(out, 'collector.mjs'),
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

process.stdout.write(`Packed agent-den ${version} into ${out}\n`);
