const settings: Record<string, unknown> = {
  // Lets eslint-plugin-import parse imported .ts files — without it `import/no-cycle` silently sees no graph.
  'import/parsers': { '@typescript-eslint/parser': ['.ts'] },
  'import/extensions': ['.ts', '.js', '.mjs'],
  'import/resolver': {
    typescript: {
      alwaysTryTypes: true,
      project: './tsconfig.app.json',
    },
  },
  'import/internal-regex': '^@(pages|widgets|features|entities|shared)/',
};

export default settings;
