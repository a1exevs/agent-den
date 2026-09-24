// ESLint for the Node packages (collector, contracts, mock). `apps/web` has its own config (Angular + FSD).
import eslintJs from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  {
    ignores: ['apps/web/**', '**/node_modules/**', '**/dist/**', 'plugins/**', 'scripts/**', '*.{cjs,mjs}'],
  },
  {
    files: ['apps/collector/src/**/*.ts', 'packages/*/src/**/*.ts', 'tools/*/src/**/*.ts'],
    extends: [eslintJs.configs.recommended, tsEslint.configs.recommended, tsEslint.configs.strict, prettierConfig],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      curly: ['error', 'all'],
      'no-console': 'error',
      // `interface` = domain entity, `type` = everything else (payloads, params, unions, view models).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },
  {
    // The wire contract holds the shared domain entities (`AgentState`) — interfaces allowed here.
    files: ['packages/contracts/src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
);
