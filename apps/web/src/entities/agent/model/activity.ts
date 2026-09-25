import type { AgentState } from '@agent-den/contracts';

/** Busy = in the middle of something: thinking, using a tool or waiting for the user. */
export function isBusy(agent: AgentState): boolean {
  return agent.activity === 'thinking' || agent.activity === 'tool' || agent.activity === 'waiting';
}
