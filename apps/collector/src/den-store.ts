import { randomUUID } from 'node:crypto';

import { type AgentState, type DenEvent, type DenEventKind, reduceAgents } from '@agent-den/contracts';

type Listener = (event: DenEvent) => void;

const MINUTE = 60_000;
/** A busy agent that went silent this long has most likely crashed or was closed without `SessionEnd`. */
const SILENT_BUSY_MS = 30 * MINUTE;
/** A sleeping cat leaves the den after this long. */
const SLEEPING_MS = 60 * MINUTE;
/** Not busy: done, interrupted by the user, or idle before the first prompt. */
const RESTING = new Set<AgentState['activity']>(['done', 'interrupted', 'idle']);

/** A kitten without `SubagentStop` goes back into the box. */
const SILENT_KITTEN_MS = 10 * MINUTE;

/** In-memory state of all known agents + fan-out to subscribers. */
export class DenStore {
  private agents = new Map<string, AgentState>();
  private readonly listeners = new Set<Listener>();

  push(event: DenEvent): void {
    this.agents = reduceAgents(this.agents, event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Known in any state, including `gone` — so backfill never resurrects a session that ended. */
  /** Hide an agent (its kittens too, for a session) or call it back. Unknown or ended agents are ignored. */
  setDismissed(agentId: string, dismissed: boolean): void {
    const agent = this.agents.get(agentId);
    if (!agent || agent.activity === 'gone') {
      return;
    }
    this.push({
      id: randomUUID(),
      source: agent.source,
      kind: dismissed ? 'dismissed' : 'recalled',
      sessionId: agent.sessionId,
      agentId,
      parentAgentId: agent.parentAgentId,
      timestamp: Date.now(),
    });
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  snapshot(): AgentState[] {
    return [...this.agents.values()].filter(agent => agent.activity !== 'gone');
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Ends agents that stopped reporting. Emits regular events, so clients animate the exit. */
  sweep(now = Date.now()): number {
    const expired: { agent: AgentState; kind: DenEventKind }[] = [];

    for (const agent of this.agents.values()) {
      const silentFor = now - agent.updatedAt;
      if (agent.activity === 'gone') {
        continue;
      }
      const resting = RESTING.has(agent.activity);
      if (agent.parentAgentId) {
        if (!resting && silentFor > SILENT_KITTEN_MS) {
          expired.push({ agent, kind: 'subagent-stop' });
        }
        continue;
      }
      const limit = resting ? SLEEPING_MS : SILENT_BUSY_MS;
      if (silentFor > limit) {
        expired.push({ agent, kind: 'session-end' });
      }
    }

    for (const { agent, kind } of expired) {
      // Ending a session already took its kittens along — don't resurrect them.
      if (this.agents.get(agent.agentId)?.activity === 'gone') {
        continue;
      }
      this.push({
        id: randomUUID(),
        source: agent.source,
        kind,
        sessionId: agent.sessionId,
        agentId: agent.agentId,
        parentAgentId: agent.parentAgentId,
        detail: 'went quiet',
        timestamp: now,
      });
    }
    return expired.length;
  }
}
