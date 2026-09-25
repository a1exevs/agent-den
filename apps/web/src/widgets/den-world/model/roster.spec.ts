import type { AgentState } from '@agent-den/contracts';

import { buildRoster } from './roster';

function agent(partial: Partial<AgentState> & Pick<AgentState, 'agentId' | 'activity'>): AgentState {
  return { sessionId: 's', source: 'mock', startedAt: 0, updatedAt: 0, toolCounts: {}, ...partial };
}

describe('buildRoster', () => {
  it('puts every cat right before its own kittens, orphan kittens last', () => {
    const roster = buildRoster(
      [
        agent({ agentId: 'k2', parentAgentId: 'c2', activity: 'thinking' }),
        agent({ agentId: 'c1', activity: 'thinking' }),
        agent({ agentId: 'orphan', parentAgentId: 'elsewhere', activity: 'thinking' }),
        agent({ agentId: 'c2', activity: 'thinking' }),
        agent({ agentId: 'k1', parentAgentId: 'c1', activity: 'thinking' }),
      ],
      new Set(),
    );

    expect(roster.map(entry => entry.agent.agentId)).toEqual(['c1', 'k1', 'c2', 'k2', 'orphan']);
    expect(roster.map(entry => entry.isKitten)).toEqual([false, true, false, true, true]);
  });

  it('describes the status in a word or two and flags what needs the user', () => {
    const roster = buildRoster(
      [
        agent({ agentId: 'a', activity: 'tool', toolName: 'Bash' }),
        agent({ agentId: 'b', activity: 'waiting' }),
        agent({ agentId: 'c', activity: 'done' }),
        agent({ agentId: 'd', activity: 'tool', toolName: 'Edit' }),
        agent({ agentId: 'e', activity: 'tool', toolName: 'mcp__Claude_Browser__browser_batch' }),
      ],
      new Set(['d']),
    );

    expect(roster.map(({ status, alert }) => [status, alert])).toEqual([
      ['Bash', false],
      ['waiting', true],
      ['napping', false],
      ['no news', false],
      ['browser_batch', false],
    ]);
  });
});
