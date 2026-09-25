import type { DenEvent } from '@agent-den/contracts';

import type { AgentTransition } from '@entities/agent';
import type { SkinSound } from '@entities/skin';

import { FRESH_EVENT_MS } from '../config/alerts';

export type Alert = {
  agentId: string;
  sound: SkinSound;
  title: string;
  body: string;
};

/** What else matters for "finished": a session isn't done while its kittens work, and it purrs once per prompt. */
export type TurnContext = {
  /** A kitten of this agent is still thinking, using a tool or waiting. */
  kittensBusy: boolean;
  /** This agent already purred since the user's last prompt. */
  finishedThisTurn: boolean;
};

/**
 * A prompt typed by the user. Claude Code also wakes a session with a `<task-notification>` "prompt" when a background
 * subagent finishes — that is still the same piece of work, not a new turn.
 */
export function startsUserTurn(event: DenEvent): boolean {
  return event.kind === 'prompt' && !event.detail?.trimStart().startsWith('<task-notification>');
}

/**
 * Should this change call the user? Yes when an agent starts waiting for permission, and when a session (not a
 * kitten) finishes its turn — once per prompt, when no kitten is left working. Never for replayed (stale) events, repeats, interruptions — the user caused those.
 */
export function decideAlert(transition: AgentTransition, name: string, now: number, turn: TurnContext): Alert | null {
  const { agent, from, event } = transition;
  if (now - event.timestamp > FRESH_EVENT_MS || from === agent.activity) {
    return null;
  }

  if (agent.activity === 'waiting') {
    const what = [event.toolName, event.detail].filter(Boolean).join(' · ');
    return { agentId: agent.agentId, sound: 'needs-you', title: `${name} needs you`, body: what || 'Waiting for you' };
  }

  if (
    agent.activity === 'done' &&
    !agent.parentAgentId &&
    from !== undefined &&
    !turn.kittensBusy &&
    !turn.finishedThisTurn
  ) {
    return { agentId: agent.agentId, sound: 'finished', title: `${name} finished`, body: agent.title ?? 'Turn done' };
  }

  return null;
}
