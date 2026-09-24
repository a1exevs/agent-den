import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { BrnToggle } from '@spartan-ng/brain/toggle';

/** Pixel-style on/off chip button (Spartan toggle: aria-pressed, keyboard). */
@Component({
  selector: 'den-toggle',
  imports: [BrnToggle],
  templateUrl: './den-toggle.html',
  styleUrl: './den-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenToggle {
  readonly pressed = model<boolean>(false);
}
