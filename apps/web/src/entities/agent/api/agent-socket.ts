import type { ServerMessage } from '@agent-den/contracts';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

type SocketHandlers = {
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
};

const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 10_000;

/** Connects to the collector and keeps reconnecting with backoff. Returns a disconnect function. */
export function connectAgentSocket(url: string, handlers: SocketHandlers): () => void {
  let socket: WebSocket | undefined;
  let retryMs = MIN_RETRY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let closedByUser = false;

  const open = (): void => {
    handlers.onStatus('connecting');
    socket = new WebSocket(url);

    socket.addEventListener('open', (): void => {
      retryMs = MIN_RETRY_MS;
      handlers.onStatus('online');
    });

    socket.addEventListener('message', (event: MessageEvent<string>): void => {
      handlers.onMessage(JSON.parse(event.data) as ServerMessage);
    });

    socket.addEventListener('close', (): void => {
      if (closedByUser) {
        return;
      }
      handlers.onStatus('offline');
      retryTimer = setTimeout(open, retryMs);
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    });
  };

  open();

  return (): void => {
    closedByUser = true;
    clearTimeout(retryTimer);
    socket?.close();
  };
}
