import { describe, expect, it } from 'vitest';

import { inferState, inferSubagentVerdict } from './infer-state';

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

  it('uses stop_reason: end_turn ends the turn, tool_use keeps the tool running', () => {
    const text = { type: 'text', text: 'done' };
    expect(inferState([{ type: 'assistant', message: { content: [text], stop_reason: 'end_turn' } }])?.kind).toBe(
      'stop',
    );
    expect(inferState([{ type: 'assistant', message: { content: [text], stop_reason: 'tool_use' } }])?.kind).toBe(
      'tool-start',
    );
  });

  it('detects an interruption (Esc), both the plain and the "for tool use" variant', () => {
    for (const text of ['[Request interrupted by user]', '[Request interrupted by user for tool use]']) {
      const state = inferState([
        { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash' }], stop_reason: 'tool_use' } },
        { type: 'user', message: { content: [{ type: 'text', text }] } },
      ]);
      expect(state?.kind).toBe('interrupted');
    }
  });

  it('does not mistake the marker inside tool output for an interruption', () => {
    const state = inferState([
      {
        type: 'user',
        message: { content: [{ type: 'tool_result', content: '[Request interrupted — a line from some source file' }] },
      },
    ]);
    expect(state?.kind).toBe('tool-end');
  });
});

describe('inferSubagentVerdict', () => {
  const notification = (status: string): unknown => ({
    type: 'user',
    message: {
      content: `<task-notification><tool-use-id>toolu_1</tool-use-id><status>${status}</status></task-notification>`,
    },
  });

  it('reads the background task notification status', () => {
    expect(inferSubagentVerdict([notification('completed')], 'toolu_1')).toBe('done');
    expect(inferSubagentVerdict([notification('failed')], 'toolu_1')).toBe('stopped');
    expect(inferSubagentVerdict([notification('stopped')], 'toolu_1')).toBe('stopped');
  });

  it('reads the tool_result of a foreground Agent call, but not the "async launched" ack', () => {
    const result = (extra: object): unknown => ({
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] },
      ...extra,
    });
    expect(inferSubagentVerdict([result({})], 'toolu_1')).toBe('done');
    expect(inferSubagentVerdict([result({ toolUseResult: { status: 'async_launched' } })], 'toolu_1')).toBeNull();
  });

  it('is null while the parent has heard nothing about this subagent', () => {
    expect(inferSubagentVerdict([notification('completed')], 'toolu_other')).toBeNull();
  });
});
