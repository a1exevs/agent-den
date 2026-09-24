import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AgentStore, catsSkin, groupIntoRooms } from '@entities';

import { DenRoom } from 'src/widgets/den-world/ui/den-room';

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

  protected readonly skin = catsSkin;
  protected readonly status = this.store.status;
  protected readonly rooms = computed(() => groupIntoRooms(this.store.visible()));

  constructor() {
    this.store.connect();
  }
}
