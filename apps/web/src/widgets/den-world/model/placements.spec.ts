import type { AgentState } from '@agent-den/contracts';

import { catsSkin } from '@entities/skin';

import { placeAgents } from './placements';

function agent(partial: Partial<AgentState> & Pick<AgentState, 'agentId' | 'activity'>): AgentState {
  return { sessionId: 's1', source: 'mock', startedAt: 0, updatedAt: 0, toolCounts: {}, ...partial };
}

const xOf = (slot: string): number | undefined => catsSkin.stations.find(station => station.slot === slot)?.x;

describe('placeAgents', () => {
  it('sends agents to the station of their activity and enters cats from the door, kittens from the box', () => {
    const [cat, kitten] = placeAgents(
      [
        agent({ agentId: 's1', activity: 'tool', toolCategory: 'edit' }),
        agent({ agentId: 'k1', parentAgentId: 's1', activity: 'tool', toolCategory: 'read' }),
      ],
      catsSkin,
    );

    expect(cat).toMatchObject({ targetX: xOf('edit'), originX: xOf('entrance'), offset: 0 });
    expect(kitten).toMatchObject({ targetX: xOf('read'), originX: xOf('spawn'), offset: 0 });
  });

  it('spreads characters sharing a station: 0, +30, -30', () => {
    const offsets = placeAgents(
      ['a', 'b', 'c'].map(agentId => agent({ agentId, activity: 'thinking' })),
      catsSkin,
    ).map(placement => placement.offset);

    expect(offsets).toEqual([0, 30, -30]);
  });
});

describe('placeAgents — leaving the den', () => {
  it('sends a cat whose session ended to the door and a kitten to its box', () => {
    const [cat, kitten] = placeAgents(
      [agent({ agentId: 's1', activity: 'gone' }), agent({ agentId: 'k1', parentAgentId: 's1', activity: 'gone' })],
      catsSkin,
    );
    expect(cat?.targetX).toBe(xOf('entrance'));
    expect(kitten?.targetX).toBe(xOf('spawn'));
  });

  it('sends an interrupted kitten back to the box, an interrupted cat to the rug', () => {
    const [cat, kitten] = placeAgents(
      [
        agent({ agentId: 's1', activity: 'interrupted' }),
        agent({ agentId: 'k1', parentAgentId: 's1', activity: 'interrupted' }),
      ],
      catsSkin,
    );
    expect(cat?.targetX).toBe(xOf('center'));
    expect(kitten?.targetX).toBe(xOf('spawn'));
  });
});
