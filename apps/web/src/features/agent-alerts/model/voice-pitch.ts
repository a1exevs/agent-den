import type { AgentState } from '@agent-den/contracts';

import { pickByHash } from '@shared/lib';

import { CAT_VOICES, KITTEN_VOICE_BOOST } from '../config/alerts';

/** The same cat always meows in the same voice; kittens are higher. */
export function voicePitch(agent: Pick<AgentState, 'agentId' | 'parentAgentId'>): number {
  const voice = pickByHash(agent.agentId, CAT_VOICES);
  return agent.parentAgentId ? voice * KITTEN_VOICE_BOOST : voice;
}
