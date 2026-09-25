import type { AgentState, ClientMessage } from '@agent-den/contracts';
import { TestBed } from '@angular/core/testing';

import { AgentSelection } from '@entities/agent';
import { CollectorSocket } from '@shared/api';

import { DismissAgent, isBusy } from './dismiss-agent';

describe('DismissAgent', () => {
  let sent: ClientMessage[];

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: CollectorSocket, useValue: { send: (message: ClientMessage): number => sent.push(message) } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('sends the cat home, closes its details and offers an undo that calls it back', () => {
    const selection = TestBed.inject(AgentSelection);
    const dismissAgent = TestBed.inject(DismissAgent);
    selection.select('s1');

    dismissAgent.dismiss('s1', 'Null');
    expect(sent).toEqual([{ type: 'dismiss', agentId: 's1' }]);
    expect(selection.agentId()).toBeNull();
    expect(dismissAgent.lastDismissed()).toEqual({ agentId: 's1', name: 'Null' });

    dismissAgent.undo();
    expect(sent.at(-1)).toEqual({ type: 'recall', agentId: 's1' });
    expect(dismissAgent.lastDismissed()).toBeNull();
  });

  it('forgets the undo after a few seconds', () => {
    const dismissAgent = TestBed.inject(DismissAgent);
    dismissAgent.dismiss('s1', 'Null');
    vi.advanceTimersByTime(6_000);
    expect(dismissAgent.lastDismissed()).toBeNull();
  });
});

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
