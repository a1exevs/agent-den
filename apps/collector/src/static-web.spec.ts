import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { readStaticFile } from './static-web';

describe('readStaticFile', () => {
  let root: string;

  beforeAll(() => {
    root = join(mkdtempSync(join(tmpdir(), 'den-web-')), 'web');
    mkdirSync(join(root, 'sounds'), { recursive: true });
    writeFileSync(join(root, 'index.html'), '<den-root></den-root>');
    writeFileSync(join(root, 'main.js'), 'console.log(1)');
    writeFileSync(join(root, 'sounds', 'cat-meow.mp3'), 'mp3');
    writeFileSync(join(root, '..', 'secret.txt'), 'nope');
  });

  it('serves files with their content type', async () => {
    expect(await readStaticFile(root, '/main.js')).toMatchObject({ contentType: 'text/javascript; charset=utf-8' });
    expect(await readStaticFile(root, '/sounds/cat-meow.mp3')).toMatchObject({ contentType: 'audio/mpeg' });
  });

  it('serves index.html for the root and for app routes', async () => {
    expect(String((await readStaticFile(root, '/'))?.body)).toBe('<den-root></den-root>');
    expect(String((await readStaticFile(root, '/some/route'))?.body)).toBe('<den-root></den-root>');
  });

  it('is a 404 for a missing asset', async () => {
    expect(await readStaticFile(root, '/missing.js')).toBeNull();
  });

  it('never leaves the root', async () => {
    expect(await readStaticFile(root, '/../secret.txt')).toBeNull();
    expect(await readStaticFile(root, '/%2e%2e/secret.txt')).toBeNull();
    expect(await readStaticFile(root, '/..%5csecret.txt')).toBeNull();
  });
});
