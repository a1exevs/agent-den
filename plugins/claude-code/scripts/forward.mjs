// Forwarding a hook payload to the collector. Must never block or fail the agent: short timeout, errors swallowed,
// no stdout (SessionStart stdout would land in the model's context).

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

export async function forward(raw) {
  try {
    // `cwd` follows the agent's `cd`s; the project root is what maps to a room.
    const payload = { ...JSON.parse(raw), project_dir: process.env.CLAUDE_PROJECT_DIR };
    await fetch(`${collectorUrl}/hooks/claude-code`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1000),
    });
  } catch {
    // Collector is not running — the den is simply empty.
  }
}
