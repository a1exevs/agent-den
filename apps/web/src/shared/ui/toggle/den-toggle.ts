import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
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
  readonly disabled = input<boolean>(false);
  /** Tooltip, e.g. why the toggle is disabled. */
  readonly hint = input<string | undefined>(undefined);
}
