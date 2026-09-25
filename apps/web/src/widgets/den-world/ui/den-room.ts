import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';

import { type Room } from '@entities/agent';
import { DenAgentAvatar, type Skin } from '@entities/skin';
import { DenCollapsible, DenPixelSprite } from '@shared/ui';

import { DenCat } from './den-cat';
import { STATION_SCALE } from '../config/scene';
import { placeAgents } from '../model/placements';

@Component({
  selector: 'den-room',
  imports: [DenAgentAvatar, DenCat, DenCollapsible, DenPixelSprite],
  templateUrl: './den-room.html',
  styleUrl: './den-room.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenRoom {
  readonly room = input.required<Room>();
  readonly skin = input.required<Skin>();
  readonly selectedAgentId = input<string | null>(null);
  /** Busy agents with no news for a while — drawn dusty. */
  readonly staleAgentIds = input<ReadonlySet<string>>(new Set());
  readonly agentPicked = output<string>();
  /** Folded rooms show only the header: avatars, counts and who is waiting. */
  readonly expanded = model<boolean>(true);

  protected readonly stationScale = STATION_SCALE;

  protected readonly cats = computed(() => this.room().agents.filter(agent => !agent.parentAgentId));
  protected readonly kittenCount = computed(() => this.room().agents.length - this.cats().length);
  protected readonly waitingCount = computed(
    () => this.room().agents.filter(agent => agent.activity === 'waiting').length,
  );

  protected readonly placements = computed(() => placeAgents(this.room().agents, this.skin()));
}
