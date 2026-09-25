import type { SoundSpec } from '@shared/lib';

import type { SkinSound } from '../skin';

/** "Meow": up, then a long fall — a cat at the door. */
const meow: SoundSpec = [
  { fromHz: 560, toHz: 880, durationMs: 130, wave: 'triangle', volume: 0.35, lowpassHz: 2400 },
  { fromHz: 880, toHz: 430, durationMs: 300, wave: 'triangle', volume: 0.3, lowpassHz: 2000 },
];

/** "Mrrt": a short happy chirp — done, going to nap. */
const chirp: SoundSpec = [
  { fromHz: 680, toHz: 980, durationMs: 70, wave: 'sine', volume: 0.25 },
  { fromHz: 980, toHz: 1300, durationMs: 90, wave: 'sine', volume: 0.2, delayMs: 30 },
];

export const catSounds: Record<SkinSound, SoundSpec> = {
  'needs-you': meow,
  finished: chirp,
};
