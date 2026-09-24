import eslintJs from '@eslint/js';
import angular from 'angular-eslint';
import prettierConfig from 'eslint-config-prettier';
import tsEslint from 'typescript-eslint';

import languageOptions from './linter/language-options';
import plugins from './linter/plugins';
import curlyRule from './linter/rules/curly-rule';
import importOrderRule from './linter/rules/import-order-rule';
import { fsdLayers, restrictedImportsRule } from './linter/rules/restricted-imports-rule';
import sortImportsRule from './linter/rules/sort-imports-rule';
import unusedVarsRule from './linter/rules/unused-vars-rule';
import settings from './linter/settings';

export default tsEslint.config(
  {
    ignores: ['dist/**', '.angular/**', 'coverage/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslintJs.configs.recommended,
      tsEslint.configs.recommended,
      tsEslint.configs.strict,
      angular.configs.tsRecommended,
      prettierConfig,
    ],
    processor: angular.processInlineTemplates,
    languageOptions,
    settings,
    plugins,
    rules: {
      ...unusedVarsRule,
      ...importOrderRule,
      ...sortImportsRule,
      ...curlyRule,
      'no-console': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'den', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'den', style: 'kebab-case' }],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'eslint-plugin-tsdoc/syntax': 'error',
    },
  },
  // FSD import boundaries + "Spartan only in shared", one block per layer.
  ...fsdLayers.map(layer => ({
    files: [`src/${layer}/**/*.ts`],
    rules: restrictedImportsRule(layer),
  })),
  {
    files: ['src/main.ts'],
    rules: restrictedImportsRule('app'),
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
  {
    // Linter config files
    files: ['linter/**/*.ts', 'eslint.config.ts'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    },
  },
);
