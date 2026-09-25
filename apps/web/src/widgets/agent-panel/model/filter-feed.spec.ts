import type { FeedEntry } from './build-feed';
import { filterFeed } from './filter-feed';

const entries: FeedEntry[] = [
  { kind: 'prompt', id: '1', text: 'Find the PORT' },
  { kind: 'thinking', id: '2', text: 'grep it' },
  { kind: 'tool', id: '3', name: 'Grep', input: '{}', result: { text: 'index.ts:14', isError: false, clipped: false } },
  { kind: 'reply', id: '4', text: 'It is 4317' },
];

const ids = (list: FeedEntry[]): string[] => list.map(entry => entry.id);

describe('filterFeed', () => {
  it('hides thinking by default toggle and keeps the rest', () => {
    expect(ids(filterFeed(entries, { query: '', showTools: true, showThinking: false }))).toEqual(['1', '3', '4']);
  });

  it('hides tools when toggled off', () => {
    expect(ids(filterFeed(entries, { query: '', showTools: false, showThinking: true }))).toEqual(['1', '2', '4']);
  });

  it('searches case-insensitively, including tool results', () => {
    expect(ids(filterFeed(entries, { query: 'port', showTools: true, showThinking: true }))).toEqual(['1']);
    expect(ids(filterFeed(entries, { query: 'INDEX.TS', showTools: true, showThinking: true }))).toEqual(['3']);
  });
});
