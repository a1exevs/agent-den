import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { type Palette, type PixelArt, renderSpriteSheet } from 'src/shared/ui/pixel-sprite/pixel-art';

/** Crisp pixel-art sprite; frames loop with a pure CSS `steps()` animation. */
@Component({
  selector: 'den-pixel-sprite',
  templateUrl: './den-pixel-sprite.html',
  styleUrl: './den-pixel-sprite.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenPixelSprite {
  readonly art = input.required<PixelArt>();
  readonly palette = input.required<Palette>();
  /** Screen pixels per art pixel. Keep it an integer for crisp edges. */
  readonly scale = input<number>(4);
  readonly flip = input<boolean>(false);

  protected readonly sheet = computed(() => `url(${renderSpriteSheet(this.art(), this.palette())})`);
}
