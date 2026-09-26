import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { pluginDataDir } from './plugin-paths.mjs';

describe('pluginDataDir', () => {
  it('uses CLAUDE_PLUGIN_DATA when Claude Code provides it', () => {
    assert.equal(pluginDataDir('/anything', { CLAUDE_PLUGIN_DATA: '/data/agent-den' }), '/data/agent-den');
  });

  it('derives the same folder from the cached plugin path (Windows and POSIX)', () => {
    assert.equal(
      pluginDataDir('C:\\Users\\me\\.claude\\plugins\\cache\\agent-den\\agent-den\\0.2.3', {}),
      join('C:\\Users\\me\\.claude\\plugins', 'data', 'agent-den-agent-den'),
    );
    assert.equal(
      pluginDataDir('/home/me/.claude/plugins/cache/team-market/agent-den/1.0.0/', {}),
      join('/home/me/.claude/plugins', 'data', 'agent-den-team-market'),
    );
  });

  it('falls back to a temp folder for a plugin outside the cache (development)', () => {
    assert.equal(pluginDataDir('D:\\projects\\agent-den\\plugins\\claude-code', {}), join(tmpdir(), 'agent-den'));
  });
});
