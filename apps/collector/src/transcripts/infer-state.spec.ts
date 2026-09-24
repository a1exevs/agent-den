import { describe, expect, it } from 'vitest';

import { inferState } from './infer-state';

const cwd = 'D:/projects/agent-den';

describe('inferState', () => {
  it('reports a running tool when the last assistant turn ends with tool_use', () => {
    const state = inferState([
      { type: 'user', cwd, message: { content: 'fix the cat' } },
      {
        type: 'assistant',
        cwd,
        message: { content: [{ type: 'text' }, { type: 'tool_use', name: 'Edit', input: { file_path: 'cat.ts' } }] },
      },
    ]);
    expect(state).toEqual({ kind: 'tool-start', toolName: 'Edit', detail: 'cat.ts', cwd });
  });

  it('is thinking after a tool result', () => {
    const state = inferState([
      { type: 'assistant', cwd, message: { content: [{ type: 'tool_use', name: 'Read' }] } },
      { type: 'user', cwd, message: { content: [{ type: 'tool_result' }] } },
    ]);
    expect(state?.kind).toBe('tool-end');
  });

  it('is done after the stop hook summary, skipping bookkeeping entries', () => {
    const state = inferState([
      { type: 'assistant', cwd, message: { content: [{ type: 'text' }] } },
      { type: 'system', subtype: 'stop_hook_summary', cwd },
      { type: 'file-history-snapshot' },
      { type: 'custom-title', customTitle: 'x' },
    ]);
    expect(state).toEqual({ kind: 'stop', cwd });
  });

  it('treats a fresh user prompt as thinking', () => {
    expect(inferState([{ type: 'user', cwd, message: { content: 'hello' } }])?.kind).toBe('prompt');
  });

  it('returns null when nothing meaningful is found', () => {
    expect(inferState([{ type: 'queue-operation' }, 'garbage', null])).toBeNull();
  });
});
