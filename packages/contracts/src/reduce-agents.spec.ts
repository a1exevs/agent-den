import { describe, expect, it } from 'vitest';

import type { AgentState, DenEvent } from './events';
import { reduceAgents } from './reduce-agents';

let clock = 1_000;

function apply(agents: ReadonlyMap<string, AgentState>, partial: Partial<DenEvent> & Pick<DenEvent, 'kind'>) {
  clock += 1_000;
  const event: DenEvent = {
    id: `e${clock}`,
    source: 'mock',
    sessionId: 's1',
    agentId: 's1',
    timestamp: clock,
    ...partial,
  };
  return reduceAgents(agents, event);
}

describe('reduceAgents', () => {
  it('tracks activity, the current tool and counts tool calls per category', () => {
    let agents = apply(new Map(), { kind: 'session-start', cwd: 'D:/projects/agent-den', title: 'Fix it' });
    agents = apply(agents, { kind: 'tool-start', toolName: 'Edit', toolCategory: 'edit', detail: 'cat.ts' });
    agents = apply(agents, { kind: 'tool-end' });
    agents = apply(agents, { kind: 'tool-start', toolName: 'Write', toolCategory: 'edit' });

    expect(agents.get('s1')).toMatchObject({
      activity: 'tool',
      toolName: 'Write',
      toolCounts: { edit: 2 },
      cwd: 'D:/projects/agent-den',
      title: 'Fix it',
      startedAt: 2_000,
    });
  });

  it('keeps the first directory (room) even when later events report another', () => {
    let agents = apply(new Map(), { kind: 'prompt', cwd: 'D:/projects/agent-den' });
    agents = apply(agents, { kind: 'tool-start', cwd: 'D:/projects/agent-den/apps/web' });
    expect(agents.get('s1')?.cwd).toBe('D:/projects/agent-den');
  });

  it('ends a session together with its kittens', () => {
    let agents = apply(new Map(), { kind: 'prompt' });
    agents = apply(agents, { kind: 'subagent-start', agentId: 'k1', parentAgentId: 's1' });
    agents = apply(agents, { kind: 'session-end' });
    expect([...agents.values()].map(agent => agent.activity)).toEqual(['gone', 'gone']);
  });

  describe('dismiss / recall', () => {
    it('hides a session with its kittens without touching activity or updatedAt', () => {
      let agents = apply(new Map(), { kind: 'stop' });
      agents = apply(agents, { kind: 'subagent-start', agentId: 'k1', parentAgentId: 's1' });
      const before = agents.get('s1');
      agents = apply(agents, { kind: 'dismissed' });

      expect(agents.get('s1')).toEqual({ ...before, dismissed: true });
      expect(agents.get('k1')?.dismissed).toBe(true);
    });

    it('hides only the kitten when a kitten is dismissed', () => {
      let agents = apply(new Map(), { kind: 'prompt' });
      agents = apply(agents, { kind: 'subagent-start', agentId: 'k1', parentAgentId: 's1' });
      agents = apply(agents, { kind: 'dismissed', agentId: 'k1' });
      expect(agents.get('s1')?.dismissed).toBe(false);
      expect(agents.get('k1')?.dismissed).toBe(true);
    });

    it('brings the agent back on recall — and on any new activity', () => {
      let agents = apply(new Map(), { kind: 'stop' });
      agents = apply(agents, { kind: 'dismissed' });
      expect(apply(agents, { kind: 'recalled' }).get('s1')?.dismissed).toBe(false);
      expect(apply(agents, { kind: 'prompt' }).get('s1')).toMatchObject({ dismissed: false, activity: 'thinking' });
    });

    it('ignores dismissing an unknown agent', () => {
      expect(apply(new Map(), { kind: 'dismissed', agentId: 'nobody' }).size).toBe(0);
    });
  });
});
