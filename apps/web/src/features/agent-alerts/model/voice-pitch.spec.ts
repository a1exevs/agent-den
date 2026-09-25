import { voicePitch } from './voice-pitch';
import { CAT_VOICES, KITTEN_VOICE_BOOST } from '../config/alerts';

describe('voicePitch', () => {
  it('gives a cat one of the voices, the same every time', () => {
    const pitch = voicePitch({ agentId: 'session-1' });
    expect(CAT_VOICES).toContain(pitch);
    expect(voicePitch({ agentId: 'session-1' })).toBe(pitch);
  });

  it('spreads different cats over several voices', () => {
    const pitches = new Set(Array.from({ length: 30 }, (_, index) => voicePitch({ agentId: `session-${index}` })));
    expect(pitches.size).toBeGreaterThan(2);
  });

  it('makes a kitten higher than the same id as a grown cat', () => {
    const cat = voicePitch({ agentId: 'agent-7' });
    expect(voicePitch({ agentId: 'agent-7', parentAgentId: 'session-1' })).toBeCloseTo(cat * KITTEN_VOICE_BOOST);
  });
});
