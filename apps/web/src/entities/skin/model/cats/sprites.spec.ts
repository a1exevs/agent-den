import { assertPixelArt } from '@shared/lib';

import { catPalette } from './cat-palettes';
import { catSprites } from './cat-sprites';
import { stationPalette, stationSprites } from './station-sprites';

describe('cat skin sprites', () => {
  const all = [...Object.values(catSprites), ...Object.values(stationSprites)];

  it.each(all.map(art => [art.id, art] as const))('%s has consistent dimensions', (_id, art) => {
    expect(() => assertPixelArt(art)).not.toThrow();
  });

  it('uses only palette keys that exist', () => {
    const catKeys = new Set(Object.keys(catPalette('any-session')));
    const stationKeys = new Set(Object.keys(stationPalette));
    const unknown = (keys: Set<string>, frames: readonly (readonly string[])[]): string[] =>
      [...frames.flat().join('')].filter(char => char !== '.' && !keys.has(char));

    for (const art of Object.values(catSprites)) {
      expect(unknown(catKeys, art.frames), art.id).toEqual([]);
    }
    for (const art of Object.values(stationSprites)) {
      expect(unknown(stationKeys, art.frames), art.id).toEqual([]);
    }
  });
});
