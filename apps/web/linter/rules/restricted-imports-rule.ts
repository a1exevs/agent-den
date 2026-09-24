import { Linter } from 'eslint';

/** FSD layers, top to bottom. A layer may import only layers below it. */
export const fsdLayers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] as const;

type FsdLayer = (typeof fsdLayers)[number];

const relativeImports = {
  group: ['./*', '../*'],
  message: 'Use absolute imports: `src/...` inside a layer, `@layer` across layers.',
};

const deepLayerImports = {
  group: fsdLayers.map(layer => `@${layer}/*`),
  message: 'Import other layers only through their public API: `@shared`, `@entities`, ...',
};

const spartanImports = {
  group: ['@spartan-ng/*'],
  message: 'Spartan primitives are wrapped in `src/shared/ui` — import them from `@shared`.',
};

/**
 * Builds `no-restricted-imports` for a file inside `layer`:
 * relative and deep imports are always banned, upper layers are banned,
 * and `@spartan-ng/*` is allowed only inside `shared`.
 */
export function restrictedImportsRule(layer: FsdLayer): Linter.RulesRecord {
  const upperLayers = fsdLayers.slice(0, fsdLayers.indexOf(layer));
  const patterns = [relativeImports, deepLayerImports];

  if (upperLayers.length > 0) {
    patterns.push({
      group: upperLayers.flatMap(upper => [`@${upper}`, `src/${upper}/*`]),
      message: `FSD: \`${layer}\` may import only layers below it.`,
    });
  }
  if (layer !== 'shared') {
    patterns.push(spartanImports);
  }

  return { 'no-restricted-imports': ['error', { patterns }] };
}
