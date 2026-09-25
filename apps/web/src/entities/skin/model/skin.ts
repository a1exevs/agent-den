import type { AgentState, ToolCategory } from '@agent-den/contracts';

import type { Palette, PixelArt, SoundSpec } from '@shared/lib';

/** What the character is doing, independent of the skin. */
export type Action =
  | 'idle'
  | 'think'
  | 'read'
  | 'edit'
  | 'shell'
  | 'web'
  | 'delegate'
  | 'wait'
  | 'error'
  | 'sleep'
  /** The user interrupted the turn (Esc). */
  | 'interrupted'
  /** Busy but silent for too long — drawn dusty. Set by the scene (see `isStale`), not derived from activity. */
  | 'stale';

/** Moments a skin has a sound for. */
export type SkinSound = 'needs-you' | 'finished';

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
  /** What the den sounds like when an agent needs the user / finished its turn. */
  sounds: Record<SkinSound, SoundSpec>;
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
    case 'interrupted':
      return agent.parentAgentId ? 'idle' : 'interrupted';
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
  interrupted: 'center',
  stale: 'center',
};

export function slotFor(agent: AgentState): StationSlot {
  const isKitten = Boolean(agent.parentAgentId);
  // Leaving the den: cats walk out of the door, kittens hop back into the box.
  if (agent.activity === 'gone') {
    return isKitten ? 'spawn' : 'entrance';
  }
  // A finished or interrupted kitten heads back into its box.
  if (isKitten && (agent.activity === 'done' || agent.activity === 'interrupted')) {
    return 'spawn';
  }
  return slotByAction[actionFor(agent)];
}
