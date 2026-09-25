import { type ClientMessage, COLLECTOR_PORT, type DenEvent, type ServerMessage } from '@agent-den/contracts';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';

import { type ClaudeCodeHookPayload, fromClaudeCodeHook } from './adapters/claude-code';
import { type CursorHookPayload, fromCursorHook } from './adapters/cursor';
import { loadDen, saveDen } from './den-state';
import { DenStore } from './den-store';
import { isAllowedHost, isAllowedOrigin } from './local-origin';
import { readStaticFile } from './static-web';
import { followTranscript } from './transcripts/transcript-follower';
import { TranscriptRegistry } from './transcripts/transcript-registry';
import { TranscriptReconciler } from './transcripts/reconcile';
import { scanTranscripts } from './transcripts/transcript-scanner';

const port = Number(process.env['AGENT_DEN_PORT'] ?? COLLECTOR_PORT);
/** Set by the plugin's launcher: the version it started, so a newer plugin can replace an older collector. */
const version = process.env['AGENT_DEN_VERSION'] ?? 'dev';
/** Built web app to serve on the same port (the packaged plugin); in development `ng serve` serves it. */
const webDir = process.env['AGENT_DEN_WEB_DIR'];
const store = new DenStore();
const transcripts = new TranscriptRegistry();

/** Set by the plugin's launcher: the den survives restarts (updates, reboots). Unset in development. */
const stateFile = process.env['AGENT_DEN_STATE_FILE'];
const SAVE_INTERVAL_MS = 60_000;
let unsaved = false;

async function save(): Promise<void> {
  if (!stateFile || !unsaved) {
    return;
  }
  unsaved = false;
  await saveDen(stateFile, store, transcripts).catch((error: unknown) => {
    unsaved = true;
    process.stderr.write(`saving the den failed: ${String(error)}\n`);
  });
}

if (stateFile) {
  const restored = await loadDen(stateFile, store, transcripts);
  // Retire right away whatever went quiet while the collector was down (a reboot overnight).
  store.sweep();
  process.stdout.write(`restored ${restored} agent(s) from ${stateFile}\n`);
  store.subscribe(() => {
    unsaved = true;
  });
  setInterval(() => void save(), SAVE_INTERVAL_MS);
}

async function shutdown(): Promise<never> {
  await save();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
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
  if (!isAllowedHost(c.req.header('host'))) {
    return c.text('forbidden host', 403);
  }
  if (!isAllowedOrigin(c.req.header('origin'))) {
    return c.text('forbidden origin', 403);
  }
  await next();
});
app.use('*', cors({ origin: origin => (isAllowedOrigin(origin) ? origin : null) }));

app.get('/health', c => c.json({ ok: true, version }));
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

/** Lets a newer plugin version replace this collector. Local origins only, like everything else here. */
app.post('/shutdown', c => {
  // Answer first, then save and exit: the new version loads what this one saved.
  setTimeout(() => void shutdown(), 100);
  return c.body(null, 204);
});

/** Already normalized events — used by the mock generator. */
app.post('/events', async c => {
  store.push(await c.req.json<DenEvent>());
  return c.body(null, 204);
});

if (webDir) {
  app.get('*', async c => {
    const file = await readStaticFile(webDir, c.req.path);
    if (!file) {
      return c.notFound();
    }
    // Hashed bundles may be cached forever; the page itself must pick up a new plugin version at once.
    const cacheControl = file.contentType.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600';
    return c.body(new Uint8Array(file.body), 200, { 'content-type': file.contentType, 'cache-control': cacheControl });
  });
}

// Bind to loopback only: hook payloads contain prompts and file paths.
const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, info => {
  const den = webDir ? `, the den is at http://localhost:${info.port}` : '';
  process.stdout.write(`agent-den collector ${version} listening on http://127.0.0.1:${info.port}${den}\n`);
});

const wss = new WebSocketServer({
  server: server as never,
  path: '/ws',
  verifyClient: ({ origin, req }: { origin?: string; req: { headers: { host?: string } } }) =>
    isAllowedOrigin(origin) && isAllowedHost(req.headers.host),
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
