import { Linter } from 'eslint';

/** FSD layers, top to bottom. A layer may import only layers below it. */
export const fsdLayers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] as const;

type FsdLayer = (typeof fsdLayers)[number];

/** Layers reachable through an `@layer/...` alias (`app` is only ever imported by `main.ts`). */
const aliasedLayers = fsdLayers.filter(layer => layer !== 'app');

/** FSD: relative paths inside a slice, aliases across slices. `src/...` paths are neither. */
const srcPathImports = {
  group: ['src', 'src/*'],
  message: 'Use a relative path inside the slice (`./den-cat`) or an alias across slices (`@entities/agent`).',
};

/** `.`, `..`, `../..` — a file importing its own slice (or segment) index is a cycle. */
const ownIndexImports = {
  regex: String.raw`^\.{1,2}(\/\.\.)*\/?$`,
  message: 'Import the file you need (`../model/build-feed`), not your own slice/segment index — that is a cycle.',
};

const publicApiSidestep = {
  group: [...aliasedLayers.filter(layer => layer !== 'shared').map(layer => `@${layer}/*/*`), '@shared/*/*'],
  message: 'Import a slice (or a shared segment) through its public API: `@entities/agent`, `@shared/ui`.',
};

const spartanImports = {
  group: ['@spartan-ng/*'],
  message: 'Spartan primitives are wrapped in `src/shared/ui` — import them from `@shared/ui`.',
};

type Pattern = { group: string[]; message: string } | { regex: string; message: string };

/**
 * Builds `no-restricted-imports` for a file inside `layer`:
 * - `src/...` paths, own-index imports and public-API sidesteps are always banned
 *   (relative paths leaving the slice are Steiger's job);
 * - upper layers are banned; so are sibling slices through the alias (`@entities/*` inside entities) —
 *   FSD forbids cross-slice imports within a layer;
 * - `@spartan-ng/*` is allowed only inside `shared`.
 */
export function restrictedImportsRule(layer: FsdLayer): Linter.RulesRecord {
  const upperLayers = aliasedLayers.slice(0, aliasedLayers.indexOf(layer as (typeof aliasedLayers)[number]));
  const patterns: Pattern[] = [srcPathImports, ownIndexImports, publicApiSidestep];

  if (layer !== 'app' && upperLayers.length > 0) {
    patterns.push({
      group: upperLayers.map(upper => `@${upper}/*`),
      message: `FSD: \`${layer}\` may import only layers below it.`,
    });
  }
  if (layer !== 'app' && layer !== 'shared') {
    patterns.push({
      group: [`@${layer}/*`],
      message: `FSD: slices of \`${layer}\` must not import each other; inside a slice use relative paths.`,
    });
  }
  if (layer !== 'shared') {
    patterns.push(spartanImports);
  }

  return { 'no-restricted-imports': ['error', { patterns }] };
}
