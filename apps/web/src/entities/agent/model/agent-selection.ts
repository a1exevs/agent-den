import { Injectable, signal } from '@angular/core';

/** Which agent the viewer is looking at — set by clicks on the scene or the roster, and by notification clicks. */
@Injectable({ providedIn: 'root' })
export class AgentSelection {
  private readonly selected = signal<string | null>(null);

  readonly agentId = this.selected.asReadonly();

  select(agentId: string | null): void {
    this.selected.set(agentId);
  }

  /** Clicking the selected agent again closes its details. */
  toggle(agentId: string): void {
    this.selected.update(current => (current === agentId ? null : agentId));
  }
}
