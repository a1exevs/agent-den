import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { AgentStore, groupIntoRooms } from '@entities/agent';
import { catsSkin } from '@entities/skin';

import { DenRoom } from './den-room';
import { CollapsedRooms } from '../model/collapsed-rooms';

/** The whole den: one room per project, live from the collector. */
@Component({
  selector: 'den-world',
  imports: [DenRoom],
  templateUrl: './den-world.html',
  styleUrl: './den-world.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenWorld {
  private readonly store = inject(AgentStore);

  readonly selectedAgentId = input<string | null>(null);
  readonly agentPicked = output<string>();

  protected readonly collapsedRooms = inject(CollapsedRooms);
  protected readonly skin = catsSkin;
  protected readonly status = this.store.status;
  protected readonly rooms = computed(() => groupIntoRooms(this.store.visible()));

  constructor() {
    this.store.connect();
  }
}
