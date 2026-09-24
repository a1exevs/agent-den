import { Linter } from 'eslint';

const unusedVarsRule: Linter.RulesRecord = {
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'error',
    {
      vars: 'all',
      varsIgnorePattern: '^_.*',
      args: 'after-used',
      argsIgnorePattern: '^_.*',
    },
  ],
};

export default unusedVarsRule;
