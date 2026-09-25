import { type ClientMessage, COLLECTOR_PORT, type DenEvent, type ServerMessage } from '@agent-den/contracts';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';

import { type ClaudeCodeHookPayload, fromClaudeCodeHook } from './adapters/claude-code';
import { type CursorHookPayload, fromCursorHook } from './adapters/cursor';
import { DenStore } from './den-store';
import { isAllowedOrigin } from './local-origin';
import { followTranscript } from './transcripts/transcript-follower';
import { TranscriptRegistry } from './transcripts/transcript-registry';
import { TranscriptReconciler } from './transcripts/reconcile';
import { scanTranscripts } from './transcripts/transcript-scanner';

const port = Number(process.env['AGENT_DEN_PORT'] ?? COLLECTOR_PORT);
const store = new DenStore();
const transcripts = new TranscriptRegistry();
const app = new Hono();

/** Last raw hook payloads — to inspect what agents actually send (`GET /debug/hooks`). */
const recentHooks: unknown[] = [];
const RECENT_HOOKS_LIMIT = 50;

function remember(payload: unknown): void {
  recentHooks.push(payload);
  if (recentHooks.length > RECENT_HOOKS_LIMIT) {
    recentHooks.shift();
  }
}

app.use('*', async (c, next) => {
  if (!isAllowedOrigin(c.req.header('origin'))) {
    return c.text('forbidden origin', 403);
  }
  await next();
});
app.use('*', cors({ origin: origin => (isAllowedOrigin(origin) ? origin : null) }));

app.get('/health', c => c.json({ ok: true }));
app.get('/agents', c => c.json(store.snapshot()));
app.get('/debug/hooks', c => c.json(recentHooks));

app.post('/hooks/claude-code', async c => {
  const payload = await c.req.json<ClaudeCodeHookPayload>();
  remember(payload);
  transcripts.rememberHook(payload);
  const event = fromClaudeCodeHook(payload);
  if (event) {
    store.push(event);
  }
  return c.body(null, 204);
});

app.post('/hooks/cursor', async c => {
  const payload = await c.req.json<CursorHookPayload>();
  remember(payload);
  const event = fromCursorHook(payload);
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

const wss = new WebSocketServer({
  server: server as never,
  path: '/ws',
  verifyClient: ({ origin }: { origin?: string }) => isAllowedOrigin(origin),
});

const SCAN_INTERVAL_MS = 30_000;
const SWEEP_INTERVAL_MS = 60_000;
const RECONCILE_INTERVAL_MS = 5_000;
const reconciler = new TranscriptReconciler(store, transcripts);

const scan = (): void => {
  scanTranscripts(store, transcripts)
    .then(added => {
      if (added > 0) {
        process.stdout.write(`backfilled ${added} agent(s) from transcripts\n`);
      }
    })
    .catch((error: unknown) => process.stderr.write(`transcript scan failed: ${String(error)}\n`));
};

scan();
setInterval(scan, SCAN_INTERVAL_MS);
setInterval(() => store.sweep(), SWEEP_INTERVAL_MS);
setInterval(() => {
  reconciler.reconcile().catch((error: unknown) => process.stderr.write(`reconcile failed: ${String(error)}\n`));
}, RECONCILE_INTERVAL_MS);

function parseClientMessage(data: unknown): ClientMessage | null {
  try {
    const message = JSON.parse(String(data)) as ClientMessage;
    const known: ClientMessage['type'][] = ['watch-transcript', 'unwatch-transcript', 'dismiss', 'recall'];
    return known.includes(message.type) ? message : null;
  } catch {
    return null;
  }
}

wss.on('connection', socket => {
  const send = (message: ServerMessage): void => socket.send(JSON.stringify(message));
  send({ type: 'snapshot', agents: store.snapshot() });
  const unsubscribe = store.subscribe(event => send({ type: 'event', event }));

  // One watched transcript per connection: the details panel shows one agent at a time.
  let stopFollowing: (() => void) | undefined;

  socket.on('message', data => {
    const message = parseClientMessage(data);
    if (!message) {
      return;
    }
    if (message.type === 'dismiss' || message.type === 'recall') {
      // Shared state: every open tab sees the cat leave (or come back).
      store.setDismissed(message.agentId, message.type === 'dismiss');
      return;
    }
    stopFollowing?.();
    stopFollowing = undefined;
    if (message.type === 'unwatch-transcript') {
      return;
    }
    const { agentId } = message;
    const path = transcripts.get(agentId);
    if (!path) {
      send({ type: 'transcript-missing', agentId });
      return;
    }
    stopFollowing = followTranscript(
      path,
      (items, reset) => send({ type: 'transcript', agentId, items, reset }),
      () => send({ type: 'transcript-missing', agentId }),
    );
  });

  socket.on('close', () => {
    unsubscribe();
    stopFollowing?.();
  });
});
