import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { DenAgentPanel } from '@widgets/agent-panel';
import { DenWorld } from '@widgets/den-world';

/** Main screen: the den with rooms per project; click a character to see what it's up to. */
@Component({
  selector: 'den-den-page',
  imports: [DenAgentPanel, DenWorld],
  templateUrl: './den-page.html',
  styleUrl: './den-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenPage {
  protected readonly selected = signal<string | null>(null);

  protected toggle(agentId: string): void {
    this.selected.update(current => (current === agentId ? null : agentId));
  }
}
