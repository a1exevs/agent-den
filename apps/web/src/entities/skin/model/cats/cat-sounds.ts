import type { Sound } from '@shared/lib';

import type { SkinSound } from '../skin';

/** Real recordings (CC0, see `public/sounds/README.md`). */
export const catSounds: Record<SkinSound, Sound> = {
  // A single short meow — a cat at the door, asking to be let in.
  'needs-you': { url: 'sounds/cat-meow.mp3' },
  // The first moment of a purr — done and content.
  finished: { url: 'sounds/cat-purr.mp3', maxDurationMs: 1500, fadeOutMs: 400 },
};
