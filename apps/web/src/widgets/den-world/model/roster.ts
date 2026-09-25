import type { AgentState } from '@agent-den/contracts';

/** One chip of a room's roster toolbar. */
export type RosterEntry = {
  agent: AgentState;
  isKitten: boolean;
  /** One or two words: what the agent is up to right now. */
  status: string;
  /** Needs the user: waiting for permission, or a failed tool. */
  alert: boolean;
};

/** `mcp__Claude_Browser__browser_batch` → `browser_batch`: the server prefix is noise in a chip. */
function shortToolName(toolName: string): string {
  return toolName.startsWith('mcp__') ? (toolName.split('__').at(-1) ?? toolName) : toolName;
}

function rosterStatus(agent: AgentState, stale: boolean): string {
  if (stale) {
    return 'no news';
  }
  switch (agent.activity) {
    case 'tool':
      return agent.toolName ? shortToolName(agent.toolName) : 'tool';
    case 'thinking':
      return 'thinking';
    case 'waiting':
      return 'waiting';
    case 'error':
      return 'failed';
    case 'done':
      return agent.parentAgentId ? 'finished' : 'napping';
    case 'interrupted':
      return 'stopped';
    case 'gone':
      return 'leaving';
    default:
      return 'idle';
  }
}

/**
 * A room's agents as roster chips: each cat followed by its own kittens (in the order they came), orphan kittens
 * (parent not in this room) at the end.
 */
export function buildRoster(agents: readonly AgentState[], staleIds: ReadonlySet<string>): RosterEntry[] {
  const toEntry = (agent: AgentState): RosterEntry => ({
    agent,
    isKitten: Boolean(agent.parentAgentId),
    status: rosterStatus(agent, staleIds.has(agent.agentId)),
    alert: agent.activity === 'waiting' || agent.activity === 'error',
  });

  const cats = agents.filter(agent => !agent.parentAgentId);
  const catIds = new Set(cats.map(cat => cat.agentId));
  const kittensOf = (catId: string): AgentState[] => agents.filter(agent => agent.parentAgentId === catId);
  const orphans = agents.filter(agent => agent.parentAgentId && !catIds.has(agent.parentAgentId));

  return [...cats.flatMap(cat => [cat, ...kittensOf(cat.agentId)]), ...orphans].map(toEntry);
}
