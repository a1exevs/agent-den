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

/**
 * DNS rebinding guard: a website can point its own domain at 127.0.0.1 and then read us with same-origin requests,
 * which carry no Origin header. The Host header still names that domain — only local host names are accepted.
 */
export function isAllowedHost(host: string | undefined): boolean {
  if (!host) {
    return false;
  }
  try {
    return LOCAL_HOSTS.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}
