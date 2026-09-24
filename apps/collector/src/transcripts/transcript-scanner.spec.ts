import { describe, expect, it } from 'vitest';

import { encodeProjectDir } from './transcript-scanner';

describe('encodeProjectDir', () => {
  it.each([
    ['D:\\projects\\agent-den', 'D--projects-agent-den'],
    [
      'D:\\projects\\lw\\repos\\lw7.4\\NG-Labworks\\Client\\.claude\\worktrees\\cool-goldstine-fdd9d5',
      'D--projects-lw-repos-lw7-4-NG-Labworks-Client--claude-worktrees-cool-goldstine-fdd9d5',
    ],
    ['/home/me/my_app', '-home-me-my-app'],
  ])('%s → %s', (dir, folder) => {
    expect(encodeProjectDir(dir)).toBe(folder);
  });
});
