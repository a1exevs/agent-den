/**
 * Pixel art defined in code: every frame is a list of rows, every char is a palette key.
 * `.` is always transparent.
 */
export interface PixelArt {
  id: string;
  width: number;
  height: number;
  frames: readonly (readonly string[])[];
  /** Frames per second of the idle loop. */
  fps: number;
}

/** Palette key (single char) → CSS color. */
export type Palette = Readonly<Record<string, string>>;

const TRANSPARENT = '.';
const MISSING_COLOR = '#ff00ff';
const sheetCache = new Map<string, string>();

function paletteKey(palette: Palette): string {
  return Object.entries(palette)
    .map(([key, color]) => `${key}${color}`)
    .join();
}

/** Replaces rows of a frame by index — handy to derive poses from a base frame. */
export function patchFrame(base: readonly string[], patches: Readonly<Record<number, string>>): string[] {
  return base.map((row, index) => patches[index] ?? row);
}

/** Throws on malformed art so a typo in a sprite fails loudly in dev and tests. */
export function assertPixelArt(art: PixelArt): void {
  art.frames.forEach((frame, frameIndex) => {
    if (frame.length !== art.height) {
      throw new Error(`${art.id}: frame ${frameIndex} has ${frame.length} rows, expected ${art.height}`);
    }
    frame.forEach((row, rowIndex) => {
      if (row.length !== art.width) {
        throw new Error(`${art.id}: frame ${frameIndex} row ${rowIndex} is ${row.length} wide, expected ${art.width}`);
      }
    });
  });
}

/** Renders all frames side by side into a PNG data URL (cached per art + palette). */
export function renderSpriteSheet(art: PixelArt, palette: Palette): string {
  const key = `${art.id}|${paletteKey(palette)}`;
  const cached = sheetCache.get(key);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = art.width * art.frames.length;
  canvas.height = art.height;
  const context = canvas.getContext('2d');
  if (!context) {
    return '';
  }

  art.frames.forEach((frame, frameIndex) => {
    frame.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        if (char === undefined || char === TRANSPARENT) {
          continue;
        }
        context.fillStyle = palette[char] ?? MISSING_COLOR;
        context.fillRect(frameIndex * art.width + x, y, 1, 1);
      }
    });
  });

  const url = canvas.toDataURL('image/png');
  sheetCache.set(key, url);
  return url;
}
