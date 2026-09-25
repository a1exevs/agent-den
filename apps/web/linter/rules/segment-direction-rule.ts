import { Linter } from 'eslint';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities'];

/**
 * Inside one slice (or inside `shared`), a segment may import only the segments to its right:
 * `ui → model → api → lib, config`. Keys are the importing segment, values the segments it must not import —
 * not even types. `model` is missing for api/lib/config on purpose: they may `import type` from it
 * (see `modelTypeOnlyRule`), just not its code.
 */
const forbiddenBySegment: Record<string, string[]> = {
  model: ['ui'],
  api: ['ui'],
  lib: ['ui', 'api'],
  config: ['ui', 'api', 'lib'],
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

/** Segments below `model` that may use its domain types. */
export const MODEL_TYPE_READERS = ['api', 'lib', 'config'] as const;

/**
 * `api`, `lib` and `config` may `import type` from their slice's `model` (a mapper returning a domain type, a
 * typed helper) but never import its code — type imports are erased, so the runtime direction stays one-way.
 */
export function modelTypeOnlyRule(): Linter.RulesRecord {
  return {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            regex: '(^|/)model(/|$)',
            allowTypeImports: true,
            message:
              'FSD segments: only `import type` from model here — model uses this segment, not the other way round.',
          },
        ],
      },
    ],
  };
}
