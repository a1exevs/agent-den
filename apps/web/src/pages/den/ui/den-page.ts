import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AgentSelection } from '@entities/agent';
import { DenAlertToggles } from '@features/agent-alerts';
import { DenAgentPanel } from '@widgets/agent-panel';
import { DenWorld } from '@widgets/den-world';

/** Main screen: the den with rooms per project; click a character to see what it's up to. */
@Component({
  selector: 'den-den-page',
  imports: [DenAgentPanel, DenAlertToggles, DenWorld],
  templateUrl: './den-page.html',
  styleUrl: './den-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenPage {
  protected readonly selection = inject(AgentSelection);
}
