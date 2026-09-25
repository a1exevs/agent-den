/**
 * WebSocket endpoint of the local collector, on the page's own origin: the packaged den is served by the collector
 * itself, and `ng serve` proxies `/ws` to it (`proxy.conf.json`).
 */
export function collectorSocketUrl(): string {
  const url = new URL('/ws', location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
