import { type Palette, pickByHash } from '@shared/lib';

const base: Palette = {
  k: '#1e1824',
  p: '#f29bb0',
  g: '#8fd16a',
};

const furs: readonly Palette[] = [
  { o: '#f29b44', d: '#c46a1f', w: '#fff3e0' }, // ginger tabby
  { o: '#9aa3ad', d: '#6b7480', w: '#eef1f4' }, // grey
  { o: '#3a3440', d: '#27222c', w: '#5c5466', g: '#f5d547' }, // black, yellow eyes
  { o: '#f3eee6', d: '#d9cfc0', w: '#ffffff', g: '#7ec8f2' }, // white, blue eyes
  { o: '#e9dcc4', d: '#6b4a33', w: '#f7efe2', g: '#7ec8f2' }, // siamese
  { o: '#b98a5e', d: '#7a5436', w: '#f1e3cf' }, // brown tabby
];

/** Session-stable cat palette: kittens share their parent's fur (same session id). */
export function catPalette(sessionId: string): Palette {
  return { ...base, ...pickByHash(sessionId, furs) };
}

const names = [
  'Barsik',
  'Murzik',
  'Luna',
  'Simba',
  'Pixel',
  'Byte',
  'Null',
  'Async',
  'Promise',
  'Lambda',
  'Mochi',
  'Tofu',
  'Kernel',
  'Cookie',
  'Semicolon',
  'Git',
];

export function catName(agentId: string): string {
  return pickByHash(agentId, names);
}
