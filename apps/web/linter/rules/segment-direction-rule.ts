import { Linter } from 'eslint';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities'];

/**
 * Inside one slice (or inside `shared`), a segment may import only the segments to its right:
 * `ui → model → api → lib, config`. Keys are the importing segment, values the segments it must not import.
 */
const forbiddenBySegment: Record<string, string[]> = {
  model: ['ui'],
  api: ['ui', 'model'],
  lib: ['ui', 'model', 'api'],
  config: ['ui', 'model', 'api', 'lib'],
};

function sliceRoots(srcDir: string): string[] {
  const roots = ['shared'];
  for (const layer of SLICED_LAYERS) {
    const layerDir = join(srcDir, layer);
    if (existsSync(layerDir)) {
      for (const entry of readdirSync(layerDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          roots.push(`${layer}/${entry.name}`);
        }
      }
    }
  }
  return roots;
}

/**
 * `import/no-restricted-paths` zones generated from the real slice folders, so every new slice is covered.
 * Resolves paths, so relative imports are checked too. Cross-layer imports (e.g. `model` of an entity using
 * `@shared/ui` types) are not affected — the direction applies within one slice only.
 */
export function segmentDirectionRule(srcDir: string): Linter.RulesRecord {
  const zones = sliceRoots(srcDir).flatMap(root =>
    Object.entries(forbiddenBySegment).flatMap(([segment, forbidden]) =>
      forbidden.map(from => ({
        target: `./src/${root}/${segment}/**/*`,
        from: `./src/${root}/${from}/**/*`,
        message: `FSD segments: \`${segment}\` must not import \`${from}\` (direction ui → model → api → lib, config).`,
      })),
    ),
  );
  return { 'import/no-restricted-paths': ['error', { zones }] };
}
