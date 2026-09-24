const baseConfig = require('@alexevs/prettier-config');

module.exports = {
  ...baseConfig,
  overrides: [
    ...(baseConfig.overrides ?? []),
    {
      files: '*.html',
      options: { parser: 'angular' },
    },
  ],
};
