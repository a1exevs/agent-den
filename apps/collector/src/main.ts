import { COLLECTOR_PORT, type DenEvent, type ServerMessage } from '@agent-den/contracts';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';

import { type ClaudeCodeHookPayload, fromClaudeCodeHook } from './adapters/claude-code';
import { type CursorHookPayload, fromCursorHook } from './adapters/cursor';
import { DenStore } from './den-store';

const port = Number(process.env['AGENT_DEN_PORT'] ?? COLLECTOR_PORT);
const store = new DenStore();
const app = new Hono();

app.use('*', cors({ origin: origin => (origin.startsWith('http://localhost') ? origin : null) }));

app.get('/health', c => c.json({ ok: true }));
app.get('/agents', c => c.json(store.snapshot()));

app.post('/hooks/claude-code', async c => {
  const event = fromClaudeCodeHook(await c.req.json<ClaudeCodeHookPayload>());
  if (event) {
    store.push(event);
  }
  return c.body(null, 204);
});

app.post('/hooks/cursor', async c => {
  const event = fromCursorHook(await c.req.json<CursorHookPayload>());
  if (event) {
    store.push(event);
  }
  return c.body(null, 204);
});

/** Already normalized events — used by the mock generator. */
app.post('/events', async c => {
  store.push(await c.req.json<DenEvent>());
  return c.body(null, 204);
});

// Bind to loopback only: hook payloads contain prompts and file paths.
const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, info => {
  process.stdout.write(`agent-den collector listening on http://127.0.0.1:${info.port}\n`);
});

const wss = new WebSocketServer({ server: server as never, path: '/ws' });

wss.on('connection', socket => {
  const send = (message: ServerMessage): void => socket.send(JSON.stringify(message));
  send({ type: 'snapshot', agents: store.snapshot() });
  const unsubscribe = store.subscribe(event => send({ type: 'event', event }));
  socket.on('close', unsubscribe);
});
