import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parentTranscriptPath } from './transcript-files';

describe('parentTranscriptPath', () => {
  it('maps <project>/<session>/subagents/agent-<id>.jsonl to <project>/<session>.jsonl', () => {
    const project = join('home', '.claude', 'projects', 'D--projects-agent-den');
    const subagent = join(project, 'session-1', 'subagents', 'agent-abc.jsonl');
    expect(parentTranscriptPath(subagent)).toBe(join(project, 'session-1.jsonl'));
  });

  it('maps a Cursor subagent file to the session file nested in the same folder', () => {
    const session = join('home', '.cursor', 'projects', 'agent-den', 'agent-transcripts', 'c1');
    expect(parentTranscriptPath(join(session, 'subagents', 'k1.jsonl'))).toBe(join(session, 'c1.jsonl'));
  });
});
