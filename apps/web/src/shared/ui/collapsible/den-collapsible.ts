import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { BrnCollapsible, BrnCollapsibleContent, BrnCollapsibleTrigger } from '@spartan-ng/brain/collapsible';

/**
 * A section whose header toggles its body (Spartan collapsible: `aria-expanded`, `aria-controls`, the closed body
 * is `inert`). The trigger sits inside a heading (WAI-ARIA accordion pattern), so the projected
 * `denCollapsibleHeader` must be phrasing content (spans, no headings). The body is the default content.
 */
@Component({
  selector: 'den-collapsible',
  imports: [BrnCollapsible, BrnCollapsibleContent, BrnCollapsibleTrigger],
  templateUrl: './den-collapsible.html',
  styleUrl: './den-collapsible.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenCollapsible {
  readonly expanded = model<boolean>(true);
  readonly headingLevel = input<1 | 2 | 3 | 4 | 5 | 6>(2);
}
