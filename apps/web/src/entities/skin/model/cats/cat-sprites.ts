import { patchFrame, type PixelArt } from '@shared';

/*
 * Palette keys: k outline, o fur, d stripes, w belly/muzzle, p pink (nose, ears, mouth), g eyes.
 * Fur keys are swapped per session (see cat-palettes.ts), so every session gets its own cat.
 */

const sit: readonly string[] = [
  '................',
  '...k........k...',
  '..kpk......kpk..',
  '..kookkkkkkook..',
  '..kooooddooook..',
  '..koggooooggok..',
  '..kogkooookgok..',
  '..koowwppwwook..',
  '..kowwkwwkwwok..',
  '...kooooooook...',
  '..koowwwwwwook..',
  '..kodwwwwwwdok.k',
  '..kodowwwwodok.k',
  '..kooooooooookk.',
  '..kowwokkowwok..',
  '...kkkkkkkkkk...',
];

const tailSwish = patchFrame(sit, {
  10: '..koowwwwwwook.k',
  11: '..kodwwwwwwdok.k',
  12: '..kodowwwwodokk.',
  13: '..kooooooooook..',
});

const eyesUp = { 5: '..kokgooookgok..', 6: '..koggooooggok..' };
const eyesDown = { 5: '..kokkooookkok..', 6: '..koggooooggok..' };

const pawUp = {
  11: '..kodwwwwwwdkwk.',
  12: '..kodowwwwodkwk.',
  13: '..koooooooookk..',
  14: '..kowwokkooook..',
};

const mouthOpen = { 8: '..kowkppppkwok..' };
const mouthWide = { 8: '..kowkppppkwok..', 9: '...kokppppkok...' };

const hissHead = {
  0: '....k.k..k.k....',
  1: '................',
  2: '..kk........kk..',
  3: '..kpkkkkkkkkpk..',
  5: '..kokkooookkok..',
  6: '..koggooooggok..',
};

const loaf: readonly string[] = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..k....k........',
  '.kpk..kpk.......',
  '.kookkook.kkkkk.',
  '.kooooooooooook.',
  '.kokkokkooodook.',
  '.koowpwooooodok.',
  '.kowwowwooooook.',
  '..kkkkkkkkkkkk..',
];

const loafBreath = patchFrame(loaf, { 10: '.kookkookkkkkkk.' });

const cat = (id: string, fps: number, ...frames: (readonly string[])[]): PixelArt => ({
  id: `cat-${id}`,
  width: 16,
  height: 16,
  fps,
  frames,
});

export const catSprites = {
  sit: cat('sit', 1.5, sit, sit, tailSwish, sit),
  think: cat('think', 1.5, patchFrame(sit, eyesUp), patchFrame(tailSwish, eyesUp)),
  sniff: cat('sniff', 3, patchFrame(sit, eyesDown), patchFrame(sit, { ...eyesDown, 7: '..koowwkkwwook..' })),
  paw: cat('paw', 4, patchFrame(sit, eyesDown), patchFrame(sit, { ...eyesDown, ...pawUp })),
  yowl: cat('yowl', 3, patchFrame(sit, { ...eyesUp, ...mouthOpen }), patchFrame(sit, { ...eyesUp, ...mouthWide })),
  hiss: cat(
    'hiss',
    6,
    patchFrame(sit, { ...hissHead, ...mouthOpen }),
    patchFrame(sit, { ...hissHead, ...mouthWide, 0: '...k.k....k.k...' }),
  ),
  sleep: cat('sleep', 1, loaf, loaf, loafBreath, loafBreath),
} satisfies Record<string, PixelArt>;

export type CatPose = keyof typeof catSprites;
