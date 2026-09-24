import { type AgentState, reduceAgents, type ServerMessage } from '@agent-den/contracts';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { CollectorSocket, injectNow } from '@shared';

/** How long a finished kitten stays around before it hops back into the box. */
const KITTEN_LINGER_MS = 3000;

/** Live agents streamed from the collector. */
@Injectable({ providedIn: 'root' })
export class AgentStore {
  private readonly socket = inject(CollectorSocket);
  private readonly agents = signal<ReadonlyMap<string, AgentState>>(new Map());
  private readonly now = injectNow(1000);

  readonly status = this.socket.status;

  /** Agents that should be drawn right now. */
  readonly visible = computed(() => {
    const now = this.now();
    return [...this.agents().values()].filter(
      agent =>
        agent.activity !== 'gone' &&
        !(agent.parentAgentId && agent.activity === 'done' && now - agent.updatedAt > KITTEN_LINGER_MS),
    );
  });

  constructor() {
    const unsubscribe = this.socket.onMessage(message => this.apply(message));
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  /** Idempotent: opens the collector socket once. */
  connect(): void {
    this.socket.connect();
  }

  /** Live state of one agent (including ones that already left). */
  byId(agentId: string): AgentState | undefined {
    return this.agents().get(agentId);
  }

  private apply(message: ServerMessage): void {
    if (message.type === 'snapshot') {
      this.agents.set(new Map(message.agents.map(agent => [agent.agentId, agent])));
    } else if (message.type === 'event') {
      this.agents.update(agents => reduceAgents(agents, message.event));
    }
  }
}
