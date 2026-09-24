import type { ClientMessage, ServerMessage } from '@agent-den/contracts';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { collectorSocketUrl } from '../config';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

type MessageListener = (message: ServerMessage) => void;
type OpenListener = () => void;

const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 10_000;

/** The single WebSocket to the collector, with reconnect + backoff. Lazily opened on first `connect()`. */
@Injectable({ providedIn: 'root' })
export class CollectorSocket {
  private readonly connection = signal<ConnectionStatus>('connecting');
  private readonly messageListeners = new Set<MessageListener>();
  private readonly openListeners = new Set<OpenListener>();
  private socket: WebSocket | undefined;
  private retryMs = MIN_RETRY_MS;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private started = false;
  private destroyed = false;

  readonly status = this.connection.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.retryTimer);
      this.socket?.close();
    });
  }

  connect(): void {
    if (!this.started) {
      this.started = true;
      this.open();
    }
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /** Runs on every (re)connect — re-send subscriptions here. */
  onOpen(listener: OpenListener): () => void {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }

  /** Dropped while offline; callers re-send from `onOpen`. */
  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private open(): void {
    this.connection.set('connecting');
    const socket = new WebSocket(collectorSocketUrl);
    this.socket = socket;

    socket.addEventListener('open', (): void => {
      this.retryMs = MIN_RETRY_MS;
      this.connection.set('online');
      this.openListeners.forEach(listener => listener());
    });

    socket.addEventListener('message', (event: MessageEvent<string>): void => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.messageListeners.forEach(listener => listener(message));
    });

    socket.addEventListener('close', (): void => {
      if (this.destroyed) {
        return;
      }
      this.connection.set('offline');
      this.retryTimer = setTimeout(() => this.open(), this.retryMs);
      this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
    });
  }
}
