import { Linter } from 'eslint';

/** FSD layers, top to bottom. A layer may import only layers below it. */
export const fsdLayers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] as const;

type FsdLayer = (typeof fsdLayers)[number];

/** Layers reachable through an `@layer/...` alias (`app` is only ever imported by `main.ts`). */
const aliasedLayers = fsdLayers.filter(layer => layer !== 'app');

const relativeImports = {
  group: ['./*', '../*'],
  message: 'Use absolute imports: `src/...` inside a slice, `@layer/slice` across slices.',
};

const publicApiSidestep = {
  group: [...aliasedLayers.filter(layer => layer !== 'shared').map(layer => `@${layer}/*/*`), '@shared/*/*'],
  message: 'Import a slice (or a shared segment) through its public API: `@entities/agent`, `@shared/ui`.',
};

const spartanImports = {
  group: ['@spartan-ng/*'],
  message: 'Spartan primitives are wrapped in `src/shared/ui` — import them from `@shared/ui`.',
};

/**
 * Builds `no-restricted-imports` for a file inside `layer`:
 * - relative imports and public-API sidesteps are always banned;
 * - upper layers are banned; so are sibling slices through the alias (`@entities/*` inside entities) —
 *   FSD forbids cross-slice imports within a layer;
 * - `@spartan-ng/*` is allowed only inside `shared`.
 */
export function restrictedImportsRule(layer: FsdLayer): Linter.RulesRecord {
  const upperLayers = fsdLayers.slice(0, fsdLayers.indexOf(layer));
  const patterns = [relativeImports, publicApiSidestep];

  if (upperLayers.length > 0) {
    patterns.push({
      group: upperLayers.flatMap(upper => [`@${upper}/*`, `src/${upper}/*`, `src/${upper}`]),
      message: `FSD: \`${layer}\` may import only layers below it.`,
    });
  }
  if (layer !== 'app' && layer !== 'shared') {
    patterns.push({
      group: [`@${layer}/*`],
      message: `FSD: slices of \`${layer}\` must not import each other; inside a slice use \`src/${layer}/<slice>/...\`.`,
    });
  }
  if (layer !== 'shared') {
    patterns.push(spartanImports);
  }

  return { 'no-restricted-imports': ['error', { patterns }] };
}
