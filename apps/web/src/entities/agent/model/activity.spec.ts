import type { AgentState } from '@agent-den/contracts';

import { isBusy } from './activity';

describe('isBusy', () => {
  const agent = (activity: AgentState['activity']): AgentState => ({
    agentId: 'a',
    sessionId: 'a',
    source: 'mock',
    activity,
    startedAt: 0,
    updatedAt: 0,
    toolCounts: {},
  });

  it('is true while thinking, using a tool or waiting — those come back by themselves', () => {
    expect(['thinking', 'tool', 'waiting'].map(activity => isBusy(agent(activity as AgentState['activity'])))).toEqual([
      true,
      true,
      true,
    ]);
    expect(['done', 'interrupted', 'idle'].map(activity => isBusy(agent(activity as AgentState['activity'])))).toEqual([
      false,
      false,
      false,
    ]);
  });
});
