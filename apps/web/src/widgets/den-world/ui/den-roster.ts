import type { AgentState } from '@agent-den/contracts';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  input,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';

import { DenAgentAvatar, type Skin } from '@entities/skin';
import { DenScrollStrip } from '@shared/ui';

import { buildRoster } from '../model/roster';

/**
 * A room's roll call under the scene: one chip per agent (kittens right after their cat), so a busy cat is easy to
 * pick even while it runs between stations. Scrolls sideways when the room is crowded.
 */
@Component({
  selector: 'den-roster',
  imports: [DenAgentAvatar, DenScrollStrip],
  templateUrl: './den-roster.html',
  styleUrl: './den-roster.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenRoster {
  readonly roomName = input.required<string>();
  readonly agents = input.required<readonly AgentState[]>();
  readonly skin = input.required<Skin>();
  readonly selectedAgentId = input<string | null>(null);
  readonly staleAgentIds = input<ReadonlySet<string>>(new Set());
  readonly picked = output<string>();

  protected readonly entries = computed(() => buildRoster(this.agents(), this.staleAgentIds()));
  protected readonly label = computed(() => `Cats in ${this.roomName()}`);

  private readonly strip = viewChild.required(DenScrollStrip);
  private readonly chips = viewChildren<ElementRef<HTMLElement>>('chip');

  constructor() {
    // Picking a cat on the scene scrolls its chip into view.
    effect(() => {
      const selected = this.selectedAgentId();
      const chip = this.chips().find(ref => ref.nativeElement.dataset['agentId'] === selected);
      if (chip) {
        this.strip().reveal(chip.nativeElement);
      }
    });
  }

  protected nameOf(agent: AgentState): string {
    return this.skin().characterName(agent.agentId);
  }
}
