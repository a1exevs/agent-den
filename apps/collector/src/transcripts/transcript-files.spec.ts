import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parentTranscriptPath } from './transcript-files';

describe('parentTranscriptPath', () => {
  it('maps <project>/<session>/subagents/agent-<id>.jsonl to <project>/<session>.jsonl', () => {
    const project = join('home', '.claude', 'projects', 'D--projects-agent-den');
    const subagent = join(project, 'session-1', 'subagents', 'agent-abc.jsonl');
    expect(parentTranscriptPath(subagent)).toBe(join(project, 'session-1.jsonl'));
  });
});
