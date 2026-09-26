import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { denHome } from './den-home.mjs';

describe('denHome', () => {
  it('lives in the home folder, the same for every plugin', () => {
    assert.equal(denHome({}, '/home/me'), join('/home/me', '.agent-den'));
    assert.equal(denHome({}, 'C:\\Users\\me'), join('C:\\Users\\me', '.agent-den'));
  });

  it('moves with AGENT_DEN_HOME', () => {
    assert.equal(denHome({ AGENT_DEN_HOME: '/data/den' }, '/home/me'), '/data/den');
    assert.equal(denHome({ AGENT_DEN_HOME: '' }, '/home/me'), join('/home/me', '.agent-den'));
  });
});
