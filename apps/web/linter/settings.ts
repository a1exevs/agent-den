const settings: Record<string, unknown> = {
  'import/resolver': {
    typescript: {
      alwaysTryTypes: true,
      project: './tsconfig.app.json',
    },
  },
  'import/internal-regex': '^(src/|@(app|pages|widgets|features|entities|shared)$)',
};

export default settings;
