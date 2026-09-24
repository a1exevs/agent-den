#!/usr/bin/env node
// Generates Claude Code rules (.claude/rules/*.md) from Cursor rules (.cursor/rules/*.mdc).
// The .mdc files are the single source of truth; generated files carry a marker and must not be edited by hand.
//
//   node scripts/sync-agent-rules.mjs          write .claude/rules
//   node scripts/sync-agent-rules.mjs --check  exit 1 if .claude/rules is out of date (used by `npm run lint`)
//
// Mapping: Cursor `globs: a/**, b/**` → Claude `paths: ["a/**", "b/**"]`; `alwaysApply: true` or no globs → no `paths`
// (Claude loads the rule in every session).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, '.cursor', 'rules');
const targetDir = join(root, '.claude', 'rules');
const MARKER =
  '<!-- Generated from .cursor/rules/%s by scripts/sync-agent-rules.mjs — edit the .mdc, not this file. -->';
const check = process.argv.includes('--check');

/** Minimal frontmatter reader for the three Cursor fields (`description`, `globs`, `alwaysApply`). */
function parseMdc(text, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) {
    throw new Error(`${file}: missing frontmatter`);
  }
  const fields = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map(line => /^(\w+):\s*(.*)$/.exec(line))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.trim()]),
  );
  const globs = (fields.globs ?? '')
    .split(',')
    .map(glob => glob.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  return { description: fields.description ?? '', globs, alwaysApply: fields.alwaysApply === 'true', body: match[2] };
}

function render(name, rule) {
  const frontmatter =
    rule.alwaysApply || rule.globs.length === 0
      ? ''
      : `---\npaths:\n${rule.globs.map(glob => `  - "${glob}"`).join('\n')}\n---\n\n`;
  return `${frontmatter}${MARKER.replace('%s', name)}\n\n${rule.body.trimStart()}`;
}

const sources = readdirSync(sourceDir).filter(file => file.endsWith('.mdc'));
const expected = new Map(
  sources.map(file => [
    `${basename(file, '.mdc')}.md`,
    render(file, parseMdc(readFileSync(join(sourceDir, file), 'utf8'), file)),
  ]),
);

// Generated files whose .mdc was deleted or renamed.
const stale = existsSync(targetDir)
  ? readdirSync(targetDir).filter(
      file =>
        file.endsWith('.md') &&
        !expected.has(file) &&
        readFileSync(join(targetDir, file), 'utf8').includes('by scripts/sync-agent-rules.mjs'),
    )
  : [];

const outdated = [...expected].filter(([file, content]) => {
  const path = join(targetDir, file);
  return !existsSync(path) || readFileSync(path, 'utf8') !== content;
});

if (check) {
  if (outdated.length > 0 || stale.length > 0) {
    process.stderr.write(
      `.claude/rules is out of date (${[...outdated.map(([file]) => file), ...stale].join(', ')}). ` +
        'Run `npm run rules:sync`.\n',
    );
    process.exit(1);
  }
  process.stdout.write(`.claude/rules is in sync with ${sources.length} Cursor rule(s).\n`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
for (const [file, content] of outdated) {
  writeFileSync(join(targetDir, file), content);
}
for (const file of stale) {
  rmSync(join(targetDir, file));
}
process.stdout.write(
  `synced ${sources.length} rule(s): ${outdated.length} written, ${stale.length} removed, ` +
    `${sources.length - outdated.length} unchanged\n`,
);
