import type { AgentState } from '@agent-den/contracts';

import { groupIntoRooms } from './rooms';

function agent(partial: Partial<AgentState> & Pick<AgentState, 'agentId'>): AgentState {
  return {
    sessionId: 's',
    source: 'mock',
    activity: 'thinking',
    startedAt: 0,
    updatedAt: 0,
    toolCounts: {},
    ...partial,
  };
}

describe('groupIntoRooms', () => {
  it('groups by project folder, ignoring slash direction and case', () => {
    const rooms = groupIntoRooms([
      agent({ agentId: 'a', cwd: 'D:\\projects\\agent-den' }),
      agent({ agentId: 'b', cwd: 'd:/projects/agent-den' }),
      agent({ agentId: 'c', cwd: 'D:/projects/set-forge' }),
    ]);
    expect(rooms.map(room => [room.name, room.agents.length])).toEqual([
      ['agent-den', 2],
      ['set-forge', 1],
    ]);
  });

  it('keeps a kitten in its cat’s room even if the kitten reported another folder', () => {
    const rooms = groupIntoRooms([
      agent({ agentId: 'cat', cwd: 'D:/projects/agent-den' }),
      agent({ agentId: 'kitten', parentAgentId: 'cat', cwd: 'D:/projects/cat-herder' }),
    ]);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.agents.map(a => a.agentId)).toEqual(['cat', 'kitten']);
  });
});
