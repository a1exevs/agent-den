import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';

/**
 * Side panel on top of Spartan's sheet (focus handling, Esc to close, aria).
 * Non-modal: the den stays visible and clickable, so another character can be picked while it's open.
 */
@Component({
  selector: 'den-sheet',
  imports: [BrnSheetImports],
  templateUrl: './den-sheet.html',
  styleUrl: './den-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenSheet {
  readonly open = input.required<boolean>();
  readonly label = input.required<string>();
  readonly side = input<'left' | 'right'>('right');
  readonly closed = output();
}
