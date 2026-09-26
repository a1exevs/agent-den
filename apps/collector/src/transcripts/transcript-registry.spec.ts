import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TranscriptRegistry } from './transcript-registry';

const sessionPath = join('/t', 'agent-transcripts', 'c1', 'c1.jsonl');

describe('TranscriptRegistry.rememberCursorHook', () => {
  it('keeps the session transcript and finds subagent transcripts next to it', () => {
    const registry = new TranscriptRegistry();
    registry.rememberCursorHook({ conversation_id: 'c1', transcript_path: sessionPath });
    registry.rememberCursorHook({
      conversation_id: 'c1',
      transcript_path: sessionPath,
      subagent_id: 'k1',
      parent_conversation_id: 'c1',
    });
    registry.rememberCursorHook({ conversation_id: 'k1', transcript_path: null, subagent_id: 'k2' });

    expect(registry.get('c1')).toBe(sessionPath);
    expect(registry.get('k1')).toBe(join('/t', 'agent-transcripts', 'c1', 'subagents', 'k1.jsonl'));
    expect(registry.get('k2')).toBe(join('/t', 'agent-transcripts', 'c1', 'subagents', 'k2.jsonl'));
  });

  it('prefers the path subagentStop reports', () => {
    const registry = new TranscriptRegistry();
    registry.rememberCursorHook({ conversation_id: 'c1', subagent_id: 'k1', agent_transcript_path: '/x/k1.jsonl' });
    expect(registry.get('k1')).toBe('/x/k1.jsonl');
  });

  it('does not let a subagent hook (transcript_path null) overwrite anything', () => {
    const registry = new TranscriptRegistry();
    registry.set('k1', '/x/k1.jsonl');
    registry.rememberCursorHook({ conversation_id: 'k1', transcript_path: null });
    expect(registry.get('k1')).toBe('/x/k1.jsonl');
  });
});
