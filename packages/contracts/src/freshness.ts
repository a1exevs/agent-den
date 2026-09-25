import type { AgentActivity, AgentState } from './events';

const MINUTE = 60_000;

/**
 * How long a busy agent may stay silent before it counts as "no news" (a dusty cat).
 * Tools get longer: a build or a test run can legitimately take minutes.
 */
const STALE_AFTER_MS: Partial<Record<AgentActivity, number>> = {
  thinking: 5 * MINUTE,
  tool: 10 * MINUTE,
};

/** A busy agent (thinking / using a tool) we haven't heard from for a while — crashed, closed or just slow. */
export function isStale(agent: AgentState, now: number): boolean {
  const limit = STALE_AFTER_MS[agent.activity];
  return limit !== undefined && now - agent.updatedAt > limit;
}
