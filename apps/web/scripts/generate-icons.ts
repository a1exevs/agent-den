/**
 * Renders the favicons, app icons and the OG image from the same code-defined pixel art the den uses, so the
 * branding always matches the cats. Run `npm run generate:icons -w @agent-den/web` after changing a sprite.
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { type CatPose, catSprites } from '../src/entities/skin/model/cats/cat-sprites';
import { stationPalette, stationSprites } from '../src/entities/skin/model/cats/station-sprites';
import type { Palette, PixelArt } from '../src/shared/lib/pixel-art';

const publicDir = resolve(import.meta.dirname, '../public');

// Den colors (dark theme, `src/styles.css`).
const WALL = '#3b3350';
const WALL_LINE = '#342d47';
const FLOOR = '#5a4636';
const FLOOR_LINE = '#4c3b2e';
const INK = '#0f0c14';
const FG = '#efe6d2';
const ACCENT = '#ff6b3d';
const FONT = "'Courier New', monospace";

const outline: Palette = { k: '#1e1824', p: '#f29bb0', g: '#8fd16a' };
const ginger: Palette = { ...outline, o: '#f29b44', d: '#c46a1f', w: '#fff3e0' };
const grey: Palette = { ...outline, o: '#9aa3ad', d: '#6b7480', w: '#eef1f4' };
const black: Palette = { ...outline, o: '#3a3440', d: '#27222c', w: '#5c5466', g: '#f5d547' };
const white: Palette = { ...outline, o: '#f3eee6', d: '#d9cfc0', w: '#ffffff', g: '#7ec8f2' };
const siamese: Palette = { ...outline, o: '#e9dcc4', d: '#6b4a33', w: '#f7efe2', g: '#7ec8f2' };

/** One `<rect>` per run of same-colored pixels in a row; `.` stays transparent. */
function pixels(frame: readonly string[], palette: Palette, x: number, y: number, scale: number): string {
  const rects: string[] = [];
  frame.forEach((row, rowIndex) => {
    let start = 0;
    for (let column = 1; column <= row.length; column++) {
      const key = row[start];
      if (row[column] === key) {
        continue;
      }
      if (key && key !== '.') {
        const color = palette[key] ?? '#ff00ff';
        rects.push(
          `<rect x="${x + start * scale}" y="${y + rowIndex * scale}" width="${(column - start) * scale}" height="${scale}" fill="${color}"/>`,
        );
      }
      start = column;
    }
  });
  return rects.join('');
}

function sprite(art: PixelArt, palette: Palette, x: number, y: number, scale: number, frame = 0): string {
  const rows = art.frames[frame] ?? art.frames[0];
  if (!rows) {
    throw new Error(`${art.id}: no frames`);
  }
  return pixels(rows, palette, x, y, scale);
}

function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`;
}

function renderPng(source: string, width: number, fonts = false): Buffer {
  const resvg = new Resvg(source, {
    fitTo: { mode: 'width', value: width },
    font: fonts ? { loadSystemFonts: true, defaultFontFamily: 'Courier New' } : { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

/** ICO that simply wraps PNGs (supported by every browser since IE Vista era). */
function ico(pngs: readonly { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map(png => png.data)]);
}

function write(name: string, data: string | Buffer): void {
  writeFileSync(resolve(publicDir, name), data);
}

// Favicon: the ginger cat on its own, transparent, one sprite pixel = one icon pixel at 16×16.
const favicon = svg(16, 16, sprite(catSprites.sit, ginger, 0, 0, 1));
write('favicon.svg', favicon);
const small = [16, 32, 48].map(size => ({ size, data: renderPng(favicon, size) }));
small.forEach(({ size, data }) => write(`favicon-${size}x${size}.png`, data));
write('favicon.ico', ico(small));

// App icon (home screen, notifications): the cat sitting on the den floor, on a solid square.
const appIcon = svg(
  20,
  20,
  `<rect width="20" height="20" fill="${WALL}"/><rect y="15" width="20" height="5" fill="${FLOOR}"/>` +
    sprite(catSprites.sit, ginger, 2, 2, 1),
);
for (const size of [180, 192, 512]) {
  write(`favicon-${size}x${size}.png`, renderPng(appIcon, size));
}

// OG image 1200×630: a slice of the den with the whole litter, and the name.
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const SCALE = 8;
const TILE = 16 * SCALE;
const FLOOR_Y = 470;
const onFloor = FLOOR_Y + 40 - TILE;

const wallLines = Array.from(
  { length: Math.ceil(OG_WIDTH / 64) },
  (_, index) => `<rect x="${index * 64}" y="0" width="${SCALE}" height="${FLOOR_Y}" fill="${WALL_LINE}"/>`,
).join('');
const floorLines = Array.from(
  { length: 4 },
  (_, index) =>
    `<rect x="0" y="${FLOOR_Y + 24 + index * 40}" width="${OG_WIDTH}" height="${SCALE / 2}" fill="${FLOOR_LINE}"/>`,
).join('');

const litter: { pose: CatPose; palette: Palette; x: number; frame?: number }[] = [
  { pose: 'think', palette: black, x: 90 },
  { pose: 'yowl', palette: white, x: 250 },
  { pose: 'sit', palette: ginger, x: 520, frame: 2 },
  { pose: 'paw', palette: siamese, x: 680, frame: 1 },
];
const cats = litter.map(({ pose, palette, x, frame }) => sprite(catSprites[pose], palette, x, onFloor, SCALE, frame));
// A kitten next to its (ginger) parent — half the size, like in the den.
const kitten = sprite(catSprites.sniff, ginger, 420, onFloor + TILE / 2, SCALE / 2);

const og = svg(
  OG_WIDTH,
  OG_HEIGHT,
  `<rect width="${OG_WIDTH}" height="${FLOOR_Y}" fill="${WALL}"/>${wallLines}` +
    `<rect y="${FLOOR_Y}" width="${OG_WIDTH}" height="${OG_HEIGHT - FLOOR_Y}" fill="${FLOOR}"/>${floorLines}` +
    `<rect y="${FLOOR_Y - SCALE}" width="${OG_WIDTH}" height="${SCALE}" fill="${INK}"/>` +
    sprite(stationSprites.window, stationPalette, 930, 60, SCALE) +
    sprite(stationSprites.books, stationPalette, 860, onFloor, SCALE) +
    sprite(stationSprites.cushion, stationPalette, 1010, onFloor, SCALE) +
    sprite(catSprites.sleep, grey, 1010, onFloor - 5 * SCALE, SCALE) +
    sprite(stationSprites.rug, stationPalette, 470, onFloor, SCALE) +
    cats.join('') +
    kitten +
    `<text x="80" y="150" font-family="${FONT}" font-size="104" font-weight="700" fill="${FG}">agent-den</text>` +
    `<text x="84" y="214" font-family="${FONT}" font-size="34" font-weight="700" fill="${FG}" fill-opacity="0.8">Your AI agents, living as pixel cats</text>` +
    `<rect x="84" y="250" width="332" height="56" fill="${ACCENT}"/>` +
    `<text x="250" y="288" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="700" fill="${INK}">Claude Code plugin</text>`,
);
write('logo-og.svg', og);
write('logo-og.png', renderPng(og, OG_WIDTH, true));

process.stdout.write(`Generated icons and the OG image in ${publicDir}\n`);
