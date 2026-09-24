import type { AgentState, ToolCategory } from '@agent-den/contracts';

import type { Palette, PixelArt } from '@shared/ui';

/** What the character is doing, independent of the skin. */
export type Action = 'idle' | 'think' | 'read' | 'edit' | 'shell' | 'web' | 'delegate' | 'wait' | 'error' | 'sleep';

/** Station slots every skin must draw. `entrance` doubles as the "waiting for you" spot. */
export type StationSlot = 'entrance' | 'web' | 'read' | 'center' | 'edit' | 'shell' | 'spawn' | 'rest';

type SkinStation = {
  slot: StationSlot;
  art: PixelArt;
  /** Horizontal position in the room, percent. */
  x: number;
  /** Raise above the floor, in art pixels (e.g. a window hangs on the wall). */
  lift?: number;
};

export interface Skin {
  id: string;
  name: string;
  stations: readonly SkinStation[];
  stationPalette: Palette;
  characterArt: (action: Action) => PixelArt;
  characterPalette: (sessionId: string) => Palette;
  characterName: (agentId: string) => string;
  /** Speech bubble text per action, if any. */
  bubble: Partial<Record<Action, string>>;
}

const actionByCategory: Record<ToolCategory, Action> = {
  read: 'read',
  edit: 'edit',
  shell: 'shell',
  web: 'web',
  delegate: 'delegate',
  other: 'think',
};

export function actionFor(agent: AgentState): Action {
  switch (agent.activity) {
    case 'tool':
      return actionByCategory[agent.toolCategory ?? 'other'];
    case 'thinking':
      return 'think';
    case 'waiting':
      return 'wait';
    case 'error':
      return 'error';
    case 'done':
      return agent.parentAgentId ? 'idle' : 'sleep';
    default:
      return 'idle';
  }
}

const slotByAction: Record<Action, StationSlot> = {
  idle: 'center',
  think: 'center',
  read: 'read',
  edit: 'edit',
  shell: 'shell',
  web: 'web',
  delegate: 'spawn',
  wait: 'entrance',
  error: 'center',
  sleep: 'rest',
};

export function slotFor(agent: AgentState): StationSlot {
  // A finished kitten heads back into its box.
  if (agent.parentAgentId && agent.activity === 'done') {
    return 'spawn';
  }
  return slotByAction[actionFor(agent)];
}
