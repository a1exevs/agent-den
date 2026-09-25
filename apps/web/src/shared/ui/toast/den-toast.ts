import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A short status message at the bottom of the screen with an optional action ("Undo").
 * Announced politely to screen readers. Visibility and timing belong to the caller.
 */
@Component({
  selector: 'den-toast',
  templateUrl: './den-toast.html',
  styleUrl: './den-toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenToast {
  readonly message = input.required<string>();
  /** Label of the action button; no button without it. */
  readonly action = input<string | undefined>(undefined);
  readonly acted = output();
}
