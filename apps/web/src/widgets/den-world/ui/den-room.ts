import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { type Room } from '@entities/agent';
import { type Skin } from '@entities/skin';
import { DenPixelSprite } from '@shared/ui';

import { DenCat } from './den-cat';
import { STATION_SCALE } from '../config/scene';
import { placeAgents } from '../model/placements';

@Component({
  selector: 'den-room',
  imports: [DenPixelSprite, DenCat],
  templateUrl: './den-room.html',
  styleUrl: './den-room.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenRoom {
  readonly room = input.required<Room>();
  readonly skin = input.required<Skin>();
  readonly selectedAgentId = input<string | null>(null);
  readonly agentPicked = output<string>();

  protected readonly stationScale = STATION_SCALE;

  protected readonly catCount = computed(() => this.room().agents.filter(agent => !agent.parentAgentId).length);
  protected readonly kittenCount = computed(() => this.room().agents.length - this.catCount());

  protected readonly placements = computed(() => placeAgents(this.room().agents, this.skin()));
}
