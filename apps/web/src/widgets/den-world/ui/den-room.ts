import type { AgentState } from '@agent-den/contracts';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { type Room } from '@entities/agent';
import { type Skin, slotFor, type StationSlot } from '@entities/skin';
import { DenPixelSprite } from '@shared/ui';

import { DenCat } from './den-cat';

type Placement = {
  agent: AgentState;
  targetX: number;
  originX: number;
  offset: number;
};

const SPREAD_PX = 30;
const STATION_SCALE = 5;

/** Alternating nudges: 0, +30, -30, +60, -60, ... */
function spread(index: number): number {
  const step = Math.ceil(index / 2) * SPREAD_PX;
  return index % 2 === 1 ? step : -step;
}

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

  private readonly stationX = computed(
    () => new Map(this.skin().stations.map(station => [station.slot, station.x] as const)),
  );

  protected readonly catCount = computed(() => this.room().agents.filter(agent => !agent.parentAgentId).length);
  protected readonly kittenCount = computed(() => this.room().agents.length - this.catCount());

  protected readonly placements = computed<Placement[]>(() => {
    const xBySlot = this.stationX();
    const xOf = (slot: StationSlot): number => xBySlot.get(slot) ?? 50;
    const occupancy = new Map<StationSlot, number>();

    return this.room().agents.map(agent => {
      const slot = slotFor(agent);
      const index = occupancy.get(slot) ?? 0;
      occupancy.set(slot, index + 1);
      return {
        agent,
        targetX: xOf(slot),
        originX: xOf(agent.parentAgentId ? 'spawn' : 'entrance'),
        offset: spread(index),
      };
    });
  });
}
