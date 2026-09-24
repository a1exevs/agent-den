import type { TranscriptItem } from '@agent-den/contracts';

import { buildFeed } from './build-feed';

describe('buildFeed', () => {
  it('attaches tool results to their calls and keeps order', () => {
    const items: TranscriptItem[] = [
      { id: 'u1', role: 'user', blocks: [{ kind: 'text', text: 'find the port' }] },
      {
        id: 'a1',
        role: 'assistant',
        blocks: [
          { kind: 'thinking', text: 'grep it' },
          { kind: 'tool-use', id: 't1', name: 'Grep', input: '{}', summary: 'COLLECTOR_PORT' },
        ],
      },
      {
        id: 'u2',
        role: 'user',
        blocks: [{ kind: 'tool-result', toolUseId: 't1', text: 'index.ts:14', isError: false, clipped: false }],
      },
      { id: 'a2', role: 'assistant', blocks: [{ kind: 'text', text: 'It is 4317' }] },
    ];

    const feed = buildFeed(items);

    expect(feed.map(entry => entry.kind)).toEqual(['prompt', 'thinking', 'tool', 'reply']);
    expect(feed[2]).toMatchObject({ name: 'Grep', result: { text: 'index.ts:14', isError: false } });
  });

  it('treats harness-injected user text as a note', () => {
    const feed = buildFeed([
      { id: 'u1', role: 'user', blocks: [{ kind: 'text', text: '<task-notification>done</task-notification>' }] },
    ]);
    expect(feed[0]?.kind).toBe('note');
  });
});
