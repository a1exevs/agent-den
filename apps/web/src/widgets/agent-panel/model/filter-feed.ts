import type { FeedEntry } from './build-feed';

export type FeedFilter = {
  query: string;
  showTools: boolean;
  showThinking: boolean;
};

function matches(entry: FeedEntry, query: string): boolean {
  const haystack =
    entry.kind === 'tool'
      ? `${entry.name} ${entry.summary ?? ''} ${entry.input} ${entry.result?.text ?? ''}`
      : entry.text;
  return haystack.toLowerCase().includes(query);
}

/** Applies the feed toolbar: hidden kinds and a case-insensitive search over text, tool names, inputs and results. */
export function filterFeed(entries: readonly FeedEntry[], filter: FeedFilter): FeedEntry[] {
  const query = filter.query.trim().toLowerCase();
  return entries.filter(
    entry =>
      (filter.showTools || entry.kind !== 'tool') &&
      (filter.showThinking || entry.kind !== 'thinking') &&
      (!query || matches(entry, query)),
  );
}
