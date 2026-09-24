import { type AgentState, reduceAgents, type ServerMessage } from '@agent-den/contracts';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { collectorSocketUrl, injectNow } from '@shared';

import { connectAgentSocket, type ConnectionStatus } from 'src/entities/agent/api/agent-socket';

/** How long a finished kitten stays around before it hops back into the box. */
const KITTEN_LINGER_MS = 3000;

/** Live agents streamed from the collector. */
@Injectable({ providedIn: 'root' })
export class AgentStore {
  private readonly agents = signal<ReadonlyMap<string, AgentState>>(new Map());
  private readonly connection = signal<ConnectionStatus>('connecting');
  private readonly now = injectNow(1000);
  private disconnect: (() => void) | undefined;

  readonly status = this.connection.asReadonly();

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
    inject(DestroyRef).onDestroy(() => this.disconnect?.());
  }

  /** Idempotent: opens the collector socket once. */
  connect(): void {
    if (this.disconnect) {
      return;
    }
    this.disconnect = connectAgentSocket(collectorSocketUrl, {
      onMessage: (message: ServerMessage): void => this.apply(message),
      onStatus: (status: ConnectionStatus): void => this.connection.set(status),
    });
  }

  private apply(message: ServerMessage): void {
    if (message.type === 'snapshot') {
      this.agents.set(new Map(message.agents.map(agent => [agent.agentId, agent])));
      return;
    }
    this.agents.update(agents => reduceAgents(agents, message.event));
  }
}
