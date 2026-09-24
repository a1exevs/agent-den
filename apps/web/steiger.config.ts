import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // "Pages first" hint: a slice used in one place could live inside its consumer. Kept as a warning while
    // upcoming features (achievements, skin switcher) are expected to reuse these slices.
    rules: {
      'fsd/insignificant-slice': 'warn',
    },
  },
]);
