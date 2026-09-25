import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrnPopoverImports } from '@spartan-ng/brain/popover';

/**
 * A button that opens a floating panel (Spartan popover: focus handling, Esc / outside click to close).
 * Project the button content with `denPopoverTrigger`, the panel as default content.
 */
@Component({
  selector: 'den-popover',
  imports: [BrnPopoverImports],
  templateUrl: './den-popover.html',
  styleUrl: './den-popover.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenPopover {
  /** Accessible name of the trigger button. */
  readonly label = input.required<string>();
  readonly align = input<'start' | 'center' | 'end'>('end');
}
