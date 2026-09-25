import eslintJs from '@eslint/js';
import angular from 'angular-eslint';
import prettierConfig from 'eslint-config-prettier';
import { join } from 'node:path';
import tsEslint from 'typescript-eslint';

import languageOptions from './linter/language-options';
import plugins from './linter/plugins';
import curlyRule from './linter/rules/curly-rule';
import importOrderRule from './linter/rules/import-order-rule';
import { fsdLayers, restrictedImportsRule } from './linter/rules/restricted-imports-rule';
import { segmentDirectionRule } from './linter/rules/segment-direction-rule';
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
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 0, styles: 0, animations: 0 }],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'eslint-plugin-tsdoc/syntax': 'error',
      // No cycles at all — also catches a file importing its own slice's index.ts.
      'import/no-cycle': ['error', { ignoreExternal: true }],
      'import/no-self-import': 'error',
      // `interface` = domain entity, `type` = everything else (payloads, params, unions, view models).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      ...segmentDirectionRule(join(import.meta.dirname, 'src')),
    },
  },
  {
    // Domain entities live in entity models — the only place `interface` is allowed.
    files: ['src/entities/*/model/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    // A `ui` segment holds components only. Everything else has an FSD home in the same slice:
    // constants → config/, types and logic → model/, helpers → lib/.
    files: ['src/**/ui/**/*.ts'],
    ignores: ['src/**/ui/**/index.ts', 'src/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > VariableDeclaration, Program > ExportNamedDeclaration > VariableDeclaration',
          message: 'No constants in a ui file — move them to the slice\x27s config/ segment (e.g. config/scene.ts).',
        },
        {
          selector:
            'Program > :matches(TSTypeAliasDeclaration, TSInterfaceDeclaration, TSEnumDeclaration), Program > ExportNamedDeclaration > :matches(TSTypeAliasDeclaration, TSInterfaceDeclaration, TSEnumDeclaration)',
          message:
            'No types in a ui file — move them to the slice\x27s model/ segment next to the logic that uses them.',
        },
        {
          selector: 'Program > FunctionDeclaration, Program > ExportNamedDeclaration > FunctionDeclaration',
          message: 'No functions in a ui file — logic goes to model/ (with a test), generic helpers to lib/.',
        },
      ],
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
