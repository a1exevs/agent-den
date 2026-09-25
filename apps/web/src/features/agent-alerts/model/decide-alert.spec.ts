import type { AgentActivity, AgentState, DenEvent } from '@agent-den/contracts';

import type { AgentTransition } from '@entities/agent';

import { decideAlert } from './decide-alert';

const now = 1_000_000;

function transition(
  activity: AgentActivity,
  from: AgentActivity | undefined,
  extra: { agent?: Partial<AgentState>; event?: Partial<DenEvent> } = {},
): AgentTransition {
  const agent: AgentState = {
    agentId: 's1',
    sessionId: 's1',
    source: 'claude-code',
    activity,
    startedAt: 0,
    updatedAt: now,
    toolCounts: {},
    ...extra.agent,
  };
  const event: DenEvent = {
    id: 'e',
    source: 'claude-code',
    kind: 'waiting',
    sessionId: 's1',
    agentId: agent.agentId,
    timestamp: now,
    ...extra.event,
  };
  return { agent, from, event };
}

describe('decideAlert', () => {
  it('meows when an agent starts waiting, telling what for', () => {
    const alert = decideAlert(
      transition('waiting', 'tool', { event: { toolName: 'Bash', detail: 'rm -rf dist' } }),
      'Barsik',
      now,
    );
    expect(alert).toEqual({ agentId: 's1', sound: 'needs-you', title: 'Barsik needs you', body: 'Bash · rm -rf dist' });
  });

  it('chirps when a session finishes its turn, with the session title', () => {
    const alert = decideAlert(transition('done', 'thinking', { agent: { title: 'Fix the cat' } }), 'Barsik', now);
    expect(alert).toMatchObject({ sound: 'finished', title: 'Barsik finished', body: 'Fix the cat' });
  });

  it('stays quiet for kittens finishing, interruptions, repeats and first sightings', () => {
    expect(decideAlert(transition('done', 'tool', { agent: { parentAgentId: 'p' } }), 'K', now)).toBeNull();
    expect(decideAlert(transition('interrupted', 'tool'), 'B', now)).toBeNull();
    expect(decideAlert(transition('waiting', 'waiting'), 'B', now)).toBeNull();
    expect(decideAlert(transition('done', undefined), 'B', now)).toBeNull();
  });

  it('ignores replayed events (transcript backfill has old timestamps)', () => {
    expect(decideAlert(transition('waiting', 'tool', { event: { timestamp: now - 60_000 } }), 'B', now)).toBeNull();
  });
});
