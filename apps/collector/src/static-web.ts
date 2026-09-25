import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

export type StaticFile = { body: Buffer; contentType: string };

/**
 * Resolves a URL path to a file inside `root`, never outside it. Paths without an extension fall back to
 * `index.html` (the app's client-side routes); a missing file with an extension is a 404 (`null`).
 */
export async function readStaticFile(root: string, urlPath: string): Promise<StaticFile | null> {
  const base = resolve(root);
  let relative: string;
  try {
    relative = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, '');
  } catch {
    return null;
  }
  const target = resolve(join(base, relative));
  if (target !== base && !target.startsWith(base + sep)) {
    return null;
  }

  const file = (await isFile(target)) ? target : extname(target) ? null : join(base, 'index.html');
  if (!file) {
    return null;
  }
  try {
    return {
      body: await readFile(file),
      contentType: CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}
