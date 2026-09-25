import { describe, expect, it } from 'vitest';

import { encodeProjectDir } from './transcript-scanner';

describe('encodeProjectDir', () => {
  it.each([
    ['D:\\projects\\agent-den', 'D--projects-agent-den'],
    [
      'D:\\work\\acme\\v2.1\\Web-Client\\.claude\\worktrees\\brave-otter-a1b2c3',
      'D--work-acme-v2-1-Web-Client--claude-worktrees-brave-otter-a1b2c3',
    ],
    ['/home/me/my_app', '-home-me-my-app'],
  ])('%s → %s', (dir, folder) => {
    expect(encodeProjectDir(dir)).toBe(folder);
  });
});
