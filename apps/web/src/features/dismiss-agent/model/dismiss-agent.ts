import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { AgentSelection } from '@entities/agent';
import { CollectorSocket } from '@shared/api';

import { UNDO_MS } from '../config/dismiss';

type LastDismissed = { agentId: string; name: string };

/**
 * Sends agents home (hides them for every open tab) and calls them back. Nothing is ever deleted: hidden agents
 * stay in the collector, show up in the "hidden" list and return by themselves as soon as they do something.
 */
@Injectable({ providedIn: 'root' })
export class DismissAgent {
  private readonly socket = inject(CollectorSocket);
  private readonly selection = inject(AgentSelection);
  private readonly last = signal<LastDismissed | null>(null);
  private undoTimer: ReturnType<typeof setTimeout> | undefined;

  /** The latest dismissal, while it can still be undone. */
  readonly lastDismissed = this.last.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.undoTimer));
  }

  dismiss(agentId: string, name: string): void {
    this.socket.send({ type: 'dismiss', agentId });
    if (this.selection.agentId() === agentId) {
      this.selection.select(null);
    }
    this.last.set({ agentId, name });
    clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.last.set(null), UNDO_MS);
  }

  recall(agentId: string): void {
    this.socket.send({ type: 'recall', agentId });
    if (this.last()?.agentId === agentId) {
      this.last.set(null);
    }
  }

  undo(): void {
    const last = this.last();
    if (last) {
      this.recall(last.agentId);
    }
  }
}
