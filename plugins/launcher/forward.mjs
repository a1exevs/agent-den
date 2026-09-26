// Forwarding a hook payload to the collector. Must never block or fail the agent: short timeout, errors swallowed,
// no stdout (a hook's stdout is read by the agent: SessionStart output would land in the model's context).

export const port = process.env.AGENT_DEN_PORT ?? '4317';
export const collectorUrl = `http://127.0.0.1:${port}`;

/** Resolves with everything on stdin (the hook payload). */
export function readStdin() {
  return new Promise(resolve => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => (raw += chunk));
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

/**
 * Posts the payload to `/hooks/<source>`, merged with `extra` (what the plugin knows beyond the payload).
 * @param {object} payload the parsed hook payload
 * @param {'claude-code' | 'cursor'} source
 * @param {object} [extra]
 */
export async function forward(payload, source, extra = {}) {
  try {
    await fetch(`${collectorUrl}/hooks/${source}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, ...extra }),
      signal: AbortSignal.timeout(1000),
    });
  } catch {
    // Collector is not running — the den is simply empty.
  }
}

/** The payload as an object; `null` for anything that isn't a JSON object. */
export function parsePayload(raw) {
  try {
    const payload = JSON.parse(raw);
    return typeof payload === 'object' && payload !== null ? payload : null;
  } catch {
    return null;
  }
}
