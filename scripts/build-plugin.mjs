// Packs the collector and the web app into the Claude Code plugin, so a colleague needs nothing but the plugin:
//   plugins/claude-code/den/collector.mjs   the collector (apps/collector), readable, not minified
//   plugins/claude-code/den/lib/*.mjs       its dependencies (hono, ws), split off so no file exceeds 256 KiB —
//                                           the plugin directory holds larger files for a reviewer
//   plugins/claude-code/den/web/            the built den, served by the collector on the same port
//   plugins/claude-code/den/build-info.json the version and a hash of the sources it was built from
// Run before releasing a plugin version: `npm run build:plugin`. The output is committed — marketplaces install
// the plugin folder exactly as it is in git.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { build } from 'esbuild';

import { buildInfoFile, denDir, pluginVersion, readBuildInfo, root, sourcesHash } from './plugin-sources.mjs';

const FILE_LIMIT = 256 * 1024;

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

// esbuild only splits code shared by several entry points: one stub entry per dependency makes that dependency a
// chunk of its own (`lib/<name>-<hash>.mjs`), and the collector's own code stays in `collector.mjs`. The stubs are
// virtual modules resolved from the collector's folder, so they see the same node_modules.
const vendors = {
  hono: "export * from 'hono'; export * from 'hono/cors'; export * from '@hono/node-server';",
  ws: "export * from 'ws';",
};
const STUB = 'vendor-stub:';
const vendorStubs = {
  name: 'vendor-stubs',
  setup(api) {
    api.onResolve({ filter: /^vendor-stub:/ }, args => ({ path: args.path, namespace: 'vendor-stub' }));
    api.onLoad({ filter: /.*/, namespace: 'vendor-stub' }, args => ({
      contents: vendors[args.path.slice(STUB.length)],
      resolveDir: join(root, 'apps', 'collector'),
      loader: 'js',
    }));
  },
};
const entryPoints = { collector: join(root, 'apps', 'collector', 'src', 'main.ts') };
for (const name of Object.keys(vendors)) {
  entryPoints[`vendor-${name}`] = `${STUB}${name}`;
}

await build({
  entryPoints,
  plugins: [vendorStubs],
  outdir: denDir,
  outExtension: { '.js': '.mjs' },
  chunkNames: 'lib/[name]-[hash]',
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // `ws` is CommonJS and requires Node built-ins; give the ESM output a real `require`.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  // Optional native speed-ups of `ws`: it falls back to plain JS without them.
  external: ['bufferutil', 'utf-8-validate'],
  legalComments: 'eof',
  logLevel: 'warning',
});
for (const name of Object.keys(vendors)) {
  // The stubs did their job (forcing the chunks); nothing imports their outputs.
  rmSync(join(denDir, `vendor-${name}.mjs`), { force: true });
}

const oversized = [];
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (!/\.(png|jpe?g|gif|webp|woff2?|ttf|otf)$/i.test(entry.name) && statSync(path).size > FILE_LIMIT) {
      oversized.push(`${path.slice(denDir.length + 1)} (${Math.round(statSync(path).size / 1024)} KiB)`);
    }
  }
};
walk(denDir);
if (oversized.length > 0) {
  // Not fatal: the directory holds such files for a reviewer. The minified web bundle is one of them by design.
  process.stdout.write(
    `Files over 256 KiB (held for a reviewer in the plugin directory):\n  ${oversized.join('\n  ')}\n`,
  );
}

writeFileSync(buildInfoFile, `${JSON.stringify({ version, sources }, null, 2)}\n`);
process.stdout.write(`Packed agent-den ${version} into ${denDir}\n`);
