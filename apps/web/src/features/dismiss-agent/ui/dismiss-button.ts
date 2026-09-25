import type { AgentState } from '@agent-den/contracts';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { DismissAgent, isBusy } from '../model/dismiss-agent';

/** "Send home" for a resting agent, "hide" for a busy one (it comes back on its next activity). */
@Component({
  selector: 'den-dismiss-button',
  templateUrl: './dismiss-button.html',
  styleUrl: './dismiss-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenDismissButton {
  readonly agent = input.required<AgentState>();
  /** The character's name, for the undo message. */
  readonly name = input.required<string>();

  private readonly dismissAgent = inject(DismissAgent);

  protected readonly busy = computed(() => isBusy(this.agent()));
  protected readonly label = computed(() => (this.busy() ? '🙈 hide' : '🏠 send home'));
  protected readonly hint = computed(() =>
    this.busy()
      ? 'Hide for now — it comes back as soon as it does something'
      : 'Send home — it comes back if the session starts working again; the hidden list calls it back anytime',
  );

  protected dismiss(): void {
    this.dismissAgent.dismiss(this.agent().agentId, this.name());
  }
}
