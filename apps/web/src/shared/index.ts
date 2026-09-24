// Public API of the `shared` layer. The only place allowed to import `@spartan-ng/*`.
export { collectorSocketUrl } from 'src/shared/config';
export { cn, hashString, injectNow, pickByHash } from 'src/shared/lib';
export {
  assertPixelArt,
  DenPixelSprite,
  type Palette,
  patchFrame,
  type PixelArt,
  renderSpriteSheet,
} from 'src/shared/ui';
