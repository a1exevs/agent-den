import type { AgentTransition } from '@entities/agent';
import type { SkinSound } from '@entities/skin';

import { FRESH_EVENT_MS } from '../config/alerts';

export type Alert = {
  agentId: string;
  sound: SkinSound;
  title: string;
  body: string;
};

/**
 * Should this change call the user? Yes when an agent starts waiting for permission, and when a session (not a
 * kitten) finishes its turn. Never for replayed (stale) events, repeats, interruptions — the user caused those.
 */
export function decideAlert(transition: AgentTransition, name: string, now: number): Alert | null {
  const { agent, from, event } = transition;
  if (now - event.timestamp > FRESH_EVENT_MS || from === agent.activity) {
    return null;
  }

  if (agent.activity === 'waiting') {
    const what = [event.toolName, event.detail].filter(Boolean).join(' · ');
    return { agentId: agent.agentId, sound: 'needs-you', title: `${name} needs you`, body: what || 'Waiting for you' };
  }

  if (agent.activity === 'done' && !agent.parentAgentId && from !== undefined) {
    return { agentId: agent.agentId, sound: 'finished', title: `${name} finished`, body: agent.title ?? 'Turn done' };
  }

  return null;
}
