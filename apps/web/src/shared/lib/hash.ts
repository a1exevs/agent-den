/** Small stable string hash (FNV-1a) — deterministic picks like fur color or cat name. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Picks a stable item for a key. */
export function pickByHash<T>(key: string, items: readonly T[]): T {
  const item = items[hashString(key) % items.length];
  if (item === undefined) {
    throw new Error('pickByHash: items must not be empty');
  }
  return item;
}
