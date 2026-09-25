import type { AgentActivity, AgentState, DenEvent, DenEventKind } from './events';

type VisibilityKind = 'dismissed' | 'recalled';

const activityByKind: Record<Exclude<DenEventKind, VisibilityKind>, AgentActivity> = {
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
  interrupted: 'interrupted',
};

const isVisibilityKind = (kind: DenEventKind): kind is VisibilityKind => kind === 'dismissed' || kind === 'recalled';

/** The activity an event puts its agent into; undefined for dismiss/recall, which only toggle visibility. */
export function activityOf(kind: DenEventKind): AgentActivity | undefined {
  return isVisibilityKind(kind) ? undefined : activityByKind[kind];
}

/**
 * Dismiss / recall: flips `dismissed` on the agent — for a session also on all its kittens. Activity and
 * `updatedAt` stay, so staleness and the sweep keep their own clock.
 */
function applyVisibility(
  agents: ReadonlyMap<string, AgentState>,
  event: DenEvent & { kind: VisibilityKind },
): Map<string, AgentState> {
  const next = new Map(agents);
  const target = agents.get(event.agentId);
  if (!target) {
    return next;
  }
  const dismissed = event.kind === 'dismissed';
  const isSession = !target.parentAgentId;
  for (const [id, agent] of agents) {
    if (id === target.agentId || (isSession && agent.sessionId === target.sessionId)) {
      next.set(id, { ...agent, dismissed });
    }
  }
  return next;
}

/**
 * Pure reducer: applies one event to the agents map (keyed by `agentId`).
 * Shared by the collector (to build snapshots) and the web app (to apply live events).
 */
export function reduceAgents(agents: ReadonlyMap<string, AgentState>, event: DenEvent): Map<string, AgentState> {
  if (isVisibilityKind(event.kind)) {
    return applyVisibility(agents, event as DenEvent & { kind: VisibilityKind });
  }

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
    // Any activity brings a hidden agent back: a live agent can never get lost.
    dismissed: false,
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
