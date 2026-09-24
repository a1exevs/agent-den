const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Hook senders (node) send no Origin; browsers always do. Only pages served from this machine may talk to us —
 * otherwise any website could read prompts over the WebSocket or inject fake events.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  try {
    return LOCAL_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}
