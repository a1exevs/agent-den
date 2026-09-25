import type { AgentState } from '@agent-den/contracts';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AgentStore } from '@entities/agent';
import { catsSkin, DenAgentAvatar } from '@entities/skin';
import { DenPopover } from '@shared/ui';

import { roomLabel } from '../lib/room-label';
import { DismissAgent } from '../model/dismiss-agent';

/** "🙈 hidden (N)" in the page header: every cat sent home, each one can be called back. */
@Component({
  selector: 'den-hidden-cats',
  imports: [DenAgentAvatar, DenPopover],
  templateUrl: './hidden-cats.html',
  styleUrl: './hidden-cats.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenHiddenCats {
  protected readonly hidden = inject(AgentStore).hidden;
  protected readonly skin = catsSkin;
  private readonly dismissAgent = inject(DismissAgent);

  protected nameOf(agent: AgentState): string {
    return this.skin.characterName(agent.agentId);
  }

  protected roomOf(agent: AgentState): string {
    return roomLabel(agent.cwd);
  }

  protected recall(agent: AgentState): void {
    this.dismissAgent.recall(agent.agentId);
  }

  protected recallAll(): void {
    this.hidden().forEach(agent => this.dismissAgent.recall(agent.agentId));
  }
}
