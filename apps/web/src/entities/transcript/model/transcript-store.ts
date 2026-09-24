import type { ServerMessage, TranscriptItem } from '@agent-den/contracts';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { CollectorSocket } from '@shared';

export type TranscriptStatus = 'idle' | 'loading' | 'ready' | 'missing';

/** Keeps the page light on very long sessions. */
const MAX_ITEMS = 1000;

/** Live transcript of the one agent shown in the details panel. */
@Injectable({ providedIn: 'root' })
export class TranscriptStore {
  private readonly socket = inject(CollectorSocket);
  private readonly watched = signal<string | null>(null);
  private readonly itemsState = signal<readonly TranscriptItem[]>([]);
  private readonly statusState = signal<TranscriptStatus>('idle');

  readonly agentId = this.watched.asReadonly();
  readonly items = this.itemsState.asReadonly();
  readonly status = this.statusState.asReadonly();

  constructor() {
    const offMessage = this.socket.onMessage(message => this.apply(message));
    // After a reconnect the collector has forgotten our subscription.
    const offOpen = this.socket.onOpen(() => this.subscribe());
    inject(DestroyRef).onDestroy(() => {
      offMessage();
      offOpen();
    });
  }

  watch(agentId: string | null): void {
    if (agentId === this.watched()) {
      return;
    }
    this.watched.set(agentId);
    this.itemsState.set([]);
    this.statusState.set(agentId ? 'loading' : 'idle');
    this.subscribe();
  }

  private subscribe(): void {
    const agentId = this.watched();
    this.socket.send(agentId ? { type: 'watch-transcript', agentId } : { type: 'unwatch-transcript' });
  }

  private apply(message: ServerMessage): void {
    if (message.type === 'transcript-missing' && message.agentId === this.watched()) {
      this.statusState.set('missing');
      return;
    }
    if (message.type !== 'transcript' || message.agentId !== this.watched()) {
      return;
    }
    this.itemsState.update(items => (message.reset ? message.items : [...items, ...message.items]).slice(-MAX_ITEMS));
    this.statusState.set('ready');
  }
}
