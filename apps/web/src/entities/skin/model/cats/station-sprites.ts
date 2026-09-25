import type { Palette, PixelArt } from '@shared/lib';

export const stationPalette: Palette = {
  k: '#1e1824',
  n: '#8a5a3b', // wood
  m: '#6e4529', // dark wood
  r: '#d9534f',
  b: '#4a78c2',
  e: '#5ba35b',
  w: '#fdf6e3',
  c: '#b7a07a', // carpet
  t: '#d8c29a', // rope
  v: '#3fa7a0', // vase
  s: '#9fd4f5', // sky
  x: '#c89b62', // cardboard
  y: '#e8c690', // tape / knob
  q: '#9a7cc9', // cushion
  u: '#c7604a', // rug
  z: '#e0a458', // rug pattern
};

const empty = '................';

const station = (id: string, rows: readonly string[]): PixelArt => ({
  id: `station-${id}`,
  width: 16,
  height: 16,
  fps: 1,
  frames: [rows],
});

const books = station('books', [
  ...Array<string>(8).fill(empty),
  '....kkkkkkkk....',
  '....kbbbbbbk....',
  '...kkkkkkkkkk...',
  '...krrrrrrrrk...',
  '...kkkkkkkkkk...',
  '..keeeeeeeeeek..',
  '..kewwwwwwwwek..',
  '..kkkkkkkkkkkk..',
]);

const post = station('post', [
  '....kkkkkkkk....',
  '....kcccccck....',
  '....kkkkkkkk....',
  ...Array.from({ length: 10 }, (_, index) => (index % 2 === 0 ? '......kttk......' : '......knnk......')),
  '...kkkkkkkkkk...',
  '...kcccccccck...',
  '...kkkkkkkkkk...',
]);

const table = station('table', [
  ...Array<string>(6).fill(empty),
  '.......kk.......',
  '......kvvk......',
  '.....kvvvvk.....',
  '.....kvvvvk.....',
  '......kvvk......',
  '.kkkkkkkkkkkkkk.',
  '.knnnnnnnnnnnnk.',
  '.kkkkkkkkkkkkkk.',
  '..kk........kk..',
  '..kk........kk..',
]);

const windowPane = '..ksssskssssk...';

const window = station('window', [
  '..kkkkkkkkkkk...',
  windowPane,
  '..kswwskssssk...',
  windowPane,
  windowPane,
  '..kkkkkkkkkkk...',
  windowPane,
  windowPane,
  '..ksssskswwsk...',
  windowPane,
  '..kkkkkkkkkkk...',
  '.knnnnnnnnnnnk..',
  ...Array<string>(4).fill(empty),
]);

const box = station('box', [
  ...Array<string>(7).fill(empty),
  '.kk..........kk.',
  '..kk........kk..',
  '..kkkkkkkkkkkk..',
  '..kxxxxxxxxxxk..',
  '..kxxxxyyxxxxk..',
  '..kxxxxyyxxxxk..',
  '..kxxxxxxxxxxk..',
  '..kxxxxxxxxxxk..',
  '..kkkkkkkkkkkk..',
]);

const doorPanel = '...knkmmmmknk...';
const doorRail = '...knkkkkkknk...';
const doorPlain = '...knnnnnnnnk...';

const door = station('door', [
  '...kkkkkkkkkk...',
  doorPlain,
  doorRail,
  doorPanel,
  doorPanel,
  doorPanel,
  doorRail,
  doorPlain,
  '...knnnnnnynk...',
  doorPlain,
  doorRail,
  doorPanel,
  doorPanel,
  doorPanel,
  doorRail,
  '...kkkkkkkkkk...',
]);

const cushion = station('cushion', [
  ...Array<string>(11).fill(empty),
  '...kkkkkkkkkk...',
  '..kqqqqqqqqqqk..',
  '.kqqqqqqqqqqqqk.',
  '.kqqqqqqqqqqqqk.',
  '..kkkkkkkkkkkk..',
]);

const rug = station('rug', [...Array<string>(14).fill(empty), '.kkkkkkkkkkkkkk.', 'kuzuzuzuzuzuzuzk']);

export const stationSprites = { books, post, table, window, box, door, cushion, rug } satisfies Record<
  string,
  PixelArt
>;
