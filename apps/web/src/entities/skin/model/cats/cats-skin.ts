import type { Action, Skin } from '../skin';
import { catName, catPalette } from './cat-palettes';
import { type CatPose, catSprites } from './cat-sprites';
import { stationPalette, stationSprites } from './station-sprites';

const poseByAction: Record<Action, CatPose> = {
  idle: 'sit',
  think: 'think',
  read: 'sniff',
  edit: 'paw',
  shell: 'paw',
  web: 'think',
  delegate: 'sit',
  wait: 'yowl',
  error: 'hiss',
  sleep: 'sleep',
  interrupted: 'sit',
  stale: 'sit',
};

export const catsSkin: Skin = {
  id: 'cats',
  name: 'Cats',
  stationPalette,
  stations: [
    { slot: 'entrance', art: stationSprites.door, x: 6 },
    { slot: 'web', art: stationSprites.window, x: 19, lift: 14 },
    { slot: 'read', art: stationSprites.books, x: 32 },
    { slot: 'center', art: stationSprites.rug, x: 45 },
    { slot: 'edit', art: stationSprites.post, x: 58 },
    { slot: 'shell', art: stationSprites.table, x: 70 },
    { slot: 'spawn', art: stationSprites.box, x: 82 },
    { slot: 'rest', art: stationSprites.cushion, x: 94 },
  ],
  characterArt: action => catSprites[poseByAction[action]],
  characterPalette: catPalette,
  characterName: catName,
  bubble: {
    think: '…',
    wait: 'MEOW!',
    error: '#@!',
    sleep: 'z z',
    interrupted: 'stopped',
    stale: '…?',
  },
};
