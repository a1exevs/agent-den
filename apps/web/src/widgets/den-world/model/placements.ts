import type { AgentState } from '@agent-den/contracts';

import { type Skin, slotFor, type StationSlot } from '@entities/skin';

import { FALLBACK_STATION_X, SPREAD_PX } from '../config/scene';

/** Where one character stands in a room. */
export type Placement = {
  agent: AgentState;
  /** Station the character walks to, percent of the room width. */
  targetX: number;
  /** Where it enters from: the door for cats, the box for kittens. */
  originX: number;
  /** Nudge in px so characters at the same station don't overlap. */
  offset: number;
};

/** Alternating nudges: 0, +step, -step, +2·step, -2·step, ... */
function spread(index: number): number {
  if (index === 0) {
    return 0;
  }
  const step = Math.ceil(index / 2) * SPREAD_PX;
  return index % 2 === 1 ? step : -step;
}

/** Sends every agent to the station of its current activity, spreading those that share one. */
export function placeAgents(agents: readonly AgentState[], skin: Skin): Placement[] {
  const xBySlot = new Map(skin.stations.map(station => [station.slot, station.x] as const));
  const xOf = (slot: StationSlot): number => xBySlot.get(slot) ?? FALLBACK_STATION_X;
  const occupancy = new Map<StationSlot, number>();

  return agents.map(agent => {
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
}
