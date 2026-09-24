import { Linter } from 'eslint';
import globals from 'globals';

const languageOptions: Linter.LanguageOptions = {
  ecmaVersion: 2021,
  sourceType: 'module',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  globals: {
    ...globals.browser,
  },
};

export default languageOptions;
