import { type AgentState, isStale, reduceAgents, type ServerMessage } from '@agent-den/contracts';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { CollectorSocket } from '@shared/api';
import { injectNow } from '@shared/lib';

/** How long a finished kitten stays around before it hops back into the box. */
const KITTEN_LINGER_MS = 3000;
/** How long a leaving character stays on screen: time to walk out of the door. */
const LEAVE_MS = 2500;

const isResting = (agent: AgentState): boolean => agent.activity === 'done' || agent.activity === 'interrupted';

/** Live agents streamed from the collector. */
@Injectable({ providedIn: 'root' })
export class AgentStore {
  private readonly socket = inject(CollectorSocket);
  private readonly agents = signal<ReadonlyMap<string, AgentState>>(new Map());
  private readonly now = injectNow(1000);

  readonly status = this.socket.status;

  /** Agents that should be drawn right now — including those still walking out after their session ended. */
  readonly visible = computed(() => {
    const now = this.now();
    return [...this.agents().values()].filter(agent => {
      const since = now - agent.updatedAt;
      if (agent.activity === 'gone') {
        return since < LEAVE_MS;
      }
      return !(agent.parentAgentId && isResting(agent) && since > KITTEN_LINGER_MS);
    });
  });

  /** Busy agents we haven't heard from for a while (drawn dusty). */
  readonly staleIds = computed(() => {
    const now = this.now();
    return new Set(
      this.visible()
        .filter(agent => isStale(agent, now))
        .map(agent => agent.agentId),
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
