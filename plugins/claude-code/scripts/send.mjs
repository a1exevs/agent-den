// Reads a Claude Code hook payload from stdin and forwards it to the agent-den collector.
// Must never block or fail the agent: short timeout, errors swallowed, always exit 0, no stdout.

const port = process.env.AGENT_DEN_PORT ?? '4317';
const endpoint = `http://127.0.0.1:${port}/hooks/claude-code`;

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (raw += chunk));
process.stdin.on('end', async () => {
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
      signal: AbortSignal.timeout(1000),
    });
  } catch {
    // Collector is not running — the den is simply empty.
  }
  process.exit(0);
});
