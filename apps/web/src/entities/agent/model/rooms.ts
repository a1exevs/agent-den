import type { AgentState } from '@agent-den/contracts';

/** A project directory — one room in the den. */
export interface Room {
  id: string;
  name: string;
  agents: AgentState[];
}

const UNKNOWN_ROOM = 'somewhere';

function roomName(cwd: string): string {
  return cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? cwd;
}

/** Groups agents by working directory; subagents always follow their parent. */
export function groupIntoRooms(agents: readonly AgentState[]): Room[] {
  const byId = new Map(agents.map(agent => [agent.agentId, agent]));
  const rooms = new Map<string, Room>();

  for (const agent of agents) {
    // A kitten always lives in its cat's room, whatever directory its own events reported.
    const parentCwd = agent.parentAgentId ? byId.get(agent.parentAgentId)?.cwd : undefined;
    const cwd = parentCwd ?? agent.cwd ?? UNKNOWN_ROOM;
    const key = cwd.replaceAll('\\', '/').toLowerCase();
    const room = rooms.get(key) ?? { id: key, name: roomName(cwd), agents: [] };
    room.agents.push(agent);
    rooms.set(key, room);
  }

  return [...rooms.values()].sort((a, b) => a.name.localeCompare(b.name));
}
