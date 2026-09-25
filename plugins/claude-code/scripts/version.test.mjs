import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compareVersions, decide } from './version.mjs';

describe('compareVersions', () => {
  it('compares numerically, part by part', () => {
    assert.equal(compareVersions('0.2.10', '0.2.9'), 1);
    assert.equal(compareVersions('0.2.0', '0.10.0'), -1);
    assert.equal(compareVersions('1.0', '1.0.0'), 0);
  });
});

describe('decide', () => {
  it('starts a collector when nothing answers', () => {
    assert.equal(decide({ state: 'down' }, '0.2.1'), 'start');
  });

  it('leaves the same version, a dev collector and a foreign service alone', () => {
    assert.equal(decide({ state: 'den', version: '0.2.1' }, '0.2.1'), 'running');
    assert.equal(decide({ state: 'den', version: 'dev' }, '0.2.1'), 'dev');
    assert.equal(decide({ state: 'foreign' }, '0.2.1'), 'foreign');
  });

  it('upgrades an older collector but never downgrades a newer one', () => {
    assert.equal(decide({ state: 'den', version: '0.2.0' }, '0.2.1'), 'replace');
    assert.equal(decide({ state: 'den', version: '0.3.0' }, '0.2.1'), 'keep-newer');
  });

  it('replaces a collector with an unreadable version', () => {
    assert.equal(decide({ state: 'den', version: 'unknown' }, '0.2.1'), 'replace');
  });
});
