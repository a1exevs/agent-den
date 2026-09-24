import { type AgentState, type DenEvent, reduceAgents } from '@agent-den/contracts';

type Listener = (event: DenEvent) => void;

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

  snapshot(): AgentState[] {
    return [...this.agents.values()].filter(agent => agent.activity !== 'gone');
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
