import { describe, expect, it } from 'vitest';

import { normalizeEntry } from './normalize';

describe('normalizeEntry', () => {
  it('keeps a plain user prompt', () => {
    expect(normalizeEntry({ type: 'user', uuid: 'u1', message: { content: 'pet the cat' } })).toEqual({
      id: 'u1',
      role: 'user',
      timestamp: undefined,
      blocks: [{ kind: 'text', text: 'pet the cat' }],
    });
  });

  it('maps tool use and tool results, clipping long output', () => {
    const toolUse = normalizeEntry({
      type: 'assistant',
      uuid: 'a1',
      message: { content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'cat.ts' } }] },
    });
    expect(toolUse?.blocks[0]).toMatchObject({ kind: 'tool-use', id: 't1', name: 'Read' });

    const result = normalizeEntry({
      type: 'user',
      uuid: 'u2',
      message: {
        content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: 'x'.repeat(9000) }] }],
      },
    });
    expect(result?.blocks[0]).toMatchObject({ kind: 'tool-result', toolUseId: 't1', clipped: true, isError: false });
  });

  it('drops meta, bookkeeping and empty entries', () => {
    expect(normalizeEntry({ type: 'user', isMeta: true, message: { content: 'reminder' } })).toBeNull();
    expect(normalizeEntry({ type: 'file-history-snapshot' })).toBeNull();
    expect(
      normalizeEntry({ type: 'assistant', message: { content: [{ type: 'thinking', thinking: '' }] } }),
    ).toBeNull();
  });
});
