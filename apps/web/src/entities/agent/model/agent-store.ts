import {
  type AgentActivity,
  type AgentState,
  type DenEvent,
  isStale,
  reduceAgents,
  type ServerMessage,
} from '@agent-den/contracts';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import { CollectorSocket } from '@shared/api';
import { injectNow } from '@shared/lib';

/** How long a finished kitten stays around before it hops back into the box. */
const KITTEN_LINGER_MS = 3000;
/** How long a leaving character stays on screen: time to walk out of the door. */
const LEAVE_MS = 2500;

/** One agent changed because of a live event (never from a snapshot). */
export type AgentTransition = {
  agent: AgentState;
  /** Activity before the event; undefined for an agent we see for the first time. */
  from: AgentActivity | undefined;
  event: DenEvent;
};

type TransitionListener = (transition: AgentTransition) => void;

const isResting = (agent: AgentState): boolean => agent.activity === 'done' || agent.activity === 'interrupted';

/** Live agents streamed from the collector. */
@Injectable({ providedIn: 'root' })
export class AgentStore {
  private readonly socket = inject(CollectorSocket);
  private readonly agents = signal<ReadonlyMap<string, AgentState>>(new Map());
  private readonly now = injectNow(1000);
  private readonly transitionListeners = new Set<TransitionListener>();

  readonly status = this.socket.status;

  /** Agents that should be drawn right now — including those still walking out after their session ended. */
  readonly visible = computed(() => {
    const now = this.now();
    return [...this.agents().values()].filter(agent => {
      if (agent.dismissed) {
        return false;
      }
      const since = now - agent.updatedAt;
      if (agent.activity === 'gone') {
        return since < LEAVE_MS;
      }
      return !(agent.parentAgentId && isResting(agent) && since > KITTEN_LINGER_MS);
    });
  });

  /** Agents the user sent home that are still around — they can be called back. Kittens of a hidden cat are not listed. */
  readonly hidden = computed(() => {
    const agents = this.agents();
    return [...agents.values()].filter(agent => {
      if (!agent.dismissed || agent.activity === 'gone') {
        return false;
      }
      // A kitten hidden together with its cat comes back with it — list only the cat.
      return !agent.parentAgentId || agents.get(agent.parentAgentId)?.dismissed !== true;
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

  /** Called for every agent change caused by a live event — alerts, sounds, counters subscribe here. */
  onTransition(listener: TransitionListener): () => void {
    this.transitionListeners.add(listener);
    return () => this.transitionListeners.delete(listener);
  }

  /** Live state of one agent (including ones that already left). */
  byId(agentId: string): AgentState | undefined {
    return this.agents().get(agentId);
  }

  private apply(message: ServerMessage): void {
    if (message.type === 'snapshot') {
      this.agents.set(new Map(message.agents.map(agent => [agent.agentId, agent])));
    } else if (message.type === 'event') {
      const { event } = message;
      const from = this.agents().get(event.agentId)?.activity;
      this.agents.update(agents => reduceAgents(agents, event));
      const agent = this.agents().get(event.agentId);
      if (agent) {
        this.transitionListeners.forEach(listener => listener({ agent, from, event }));
      }
    }
  }
}
