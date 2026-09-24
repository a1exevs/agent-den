import type { AgentActivity, AgentState, DenEvent, DenEventKind } from './events';

const activityByKind: Record<DenEventKind, AgentActivity> = {
  'session-start': 'idle',
  'session-end': 'gone',
  prompt: 'thinking',
  'tool-start': 'tool',
  'tool-end': 'thinking',
  'tool-error': 'error',
  'subagent-start': 'thinking',
  'subagent-stop': 'done',
  waiting: 'waiting',
  stop: 'done',
};

/**
 * Pure reducer: applies one event to the agents map (keyed by `agentId`).
 * Shared by the collector (to build snapshots) and the web app (to apply live events).
 */
export function reduceAgents(agents: ReadonlyMap<string, AgentState>, event: DenEvent): Map<string, AgentState> {
  const next = new Map(agents);
  const previous = agents.get(event.agentId);
  const toolCounts = { ...previous?.toolCounts };

  if (event.kind === 'tool-start' && event.toolCategory) {
    toolCounts[event.toolCategory] = (toolCounts[event.toolCategory] ?? 0) + 1;
  }

  const isToolKind = event.kind === 'tool-start' || event.kind === 'tool-error';

  next.set(event.agentId, {
    agentId: event.agentId,
    sessionId: event.sessionId,
    parentAgentId: event.parentAgentId ?? previous?.parentAgentId,
    source: event.source,
    // Sticky: the first known directory is the agent's room, later `cd`s don't move it.
    cwd: previous?.cwd ?? event.cwd,
    activity: activityByKind[event.kind],
    toolName: isToolKind ? event.toolName : undefined,
    toolCategory: isToolKind ? event.toolCategory : undefined,
    detail: event.detail ?? (isToolKind ? undefined : previous?.detail),
    title: event.title ?? previous?.title,
    startedAt: previous?.startedAt ?? event.timestamp,
    updatedAt: event.timestamp,
    toolCounts,
  });

  // A finished session takes its subagents with it.
  if (event.kind === 'session-end') {
    for (const [id, agent] of next) {
      if (agent.sessionId === event.sessionId) {
        next.set(id, { ...agent, activity: 'gone', updatedAt: event.timestamp });
      }
    }
  }

  return next;
}
