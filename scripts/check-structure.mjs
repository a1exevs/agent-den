#!/usr/bin/env node
// Structural checks that neither ESLint nor Steiger cover (see .cursor/rules/fsd-architecture.mdc):
//   1. slice root holds only `index.ts` + segment folders;
//   2. `index.ts`: required for every slice and every `shared` segment (their public API); forbidden in the segments
//      of a slice — the slice index re-exports straight from files, a segment barrel would be dead code;
//   3. segments are the five standard ones (ui, model, api, lib, config);
//   4. kebab-case file and folder names across the monorepo sources;
//   5. no `app/index.ts` (only main.ts imports app, directly by file).
// Exit code 1 lists every violation.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const webSrc = join(root, 'apps', 'web', 'src');

const SEGMENTS = new Set(['ui', 'model', 'api', 'lib', 'config']);
const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities'];
const LAYERS = new Set(['app', ...SLICED_LAYERS, 'shared']);
/** Files allowed directly in `apps/web/src`. */
const SRC_ROOT_FILES = new Set(['main.ts', 'styles.css', 'index.html']);

/** kebab-case segments separated by dots: `den-cat.ts`, `den-cat.spec.ts`, `index.ts`. */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/;
const KEBAB_ROOTS = ['apps/web/src', 'apps/collector/src', 'packages', 'tools', 'plugins', 'scripts', '.cursor/rules'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular', 'coverage', '.claude-plugin']);
/** Build output committed into the plugin (`npm run build:plugin`): hashed chunk names, not ours to name. */
const SKIP_PATHS = new Set(['plugins/claude-code/den']);
/** Names fixed by a tool's convention (Claude Code skills). */
const CONVENTIONAL_NAMES = new Set(['SKILL.md']);

const problems = [];
const rel = path => relative(root, path).split('\\').join('/');
const entries = dir => readdirSync(dir, { withFileTypes: true });

function checkSegments(owner, dir, segmentIndex) {
  for (const entry of entries(dir)) {
    const path = join(dir, entry.name);
    if (!entry.isDirectory()) {
      if (entry.name !== 'index.ts') {
        problems.push(`${rel(path)}: files in ${owner} root — only index.ts, the rest goes into a segment`);
      }
      continue;
    }
    if (!SEGMENTS.has(entry.name)) {
      problems.push(`${rel(path)}: "${entry.name}" is not a standard segment (ui, model, api, lib, config)`);
      continue;
    }
    const hasIndex = existsSync(join(path, 'index.ts'));
    if (segmentIndex === 'required' && !hasIndex) {
      problems.push(`${rel(path)}: shared segment has no index.ts (its public API)`);
    }
    if (segmentIndex === 'forbidden' && hasIndex) {
      problems.push(
        `${rel(path)}/index.ts: segments of a slice have no index.ts — re-export from files in the slice index`,
      );
    }
  }
}

function checkFsd() {
  for (const entry of entries(webSrc)) {
    const path = join(webSrc, entry.name);
    if (entry.isDirectory()) {
      if (!LAYERS.has(entry.name)) {
        problems.push(`${rel(path)}: unknown FSD layer`);
      }
    } else if (!SRC_ROOT_FILES.has(entry.name)) {
      problems.push(`${rel(path)}: unexpected file in src root`);
    }
  }

  for (const layer of SLICED_LAYERS) {
    const layerDir = join(webSrc, layer);
    if (!existsSync(layerDir)) {
      continue;
    }
    for (const slice of entries(layerDir)) {
      const slicePath = join(layerDir, slice.name);
      if (!slice.isDirectory()) {
        // Layer index files are Steiger's `no-layer-public-api`; anything else is misplaced.
        if (slice.name !== 'index.ts') {
          problems.push(`${rel(slicePath)}: files directly in a layer — put them into a slice`);
        }
        continue;
      }
      if (!existsSync(join(slicePath, 'index.ts'))) {
        problems.push(`${rel(slicePath)}: slice has no index.ts`);
      }
      checkSegments('slice', slicePath, 'forbidden');
    }
  }

  if (existsSync(join(webSrc, 'app', 'index.ts'))) {
    problems.push('apps/web/src/app/index.ts: app has no public API — main.ts imports its files directly');
  }

  const shared = join(webSrc, 'shared');
  if (existsSync(shared)) {
    checkSegments('shared', shared, 'required');
  }
}

function checkKebab(dir) {
  for (const entry of entries(dir)) {
    const path = join(dir, entry.name);
    if (SKIP_DIRS.has(entry.name) || SKIP_PATHS.has(rel(path))) {
      continue;
    }
    if (!KEBAB.test(entry.name) && !CONVENTIONAL_NAMES.has(entry.name)) {
      problems.push(`${rel(path)}: name is not kebab-case`);
    }
    if (entry.isDirectory()) {
      checkKebab(path);
    }
  }
}

checkFsd();
for (const dir of KEBAB_ROOTS.map(dir => join(root, dir)).filter(
  dir => existsSync(dir) && statSync(dir).isDirectory(),
)) {
  checkKebab(dir);
}

if (problems.length > 0) {
  process.stderr.write(`Structure check failed:\n${problems.map(problem => `  ✘ ${problem}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write('Structure OK: FSD slices/segments, kebab-case names.\n');
