import { DestroyRef, effect, inject, Injectable } from '@angular/core';

import { AgentSelection, AgentStore, type AgentTransition } from '@entities/agent';
import { catsSkin } from '@entities/skin';
import { playSound, unlockAudioOnFirstGesture } from '@shared/lib';

import { AlertSettings } from './alert-settings';
import { type Alert, decideAlert } from './decide-alert';
import { PER_AGENT_COOLDOWN_MS } from '../config/alerts';

const BASE_TITLE = 'agent-den';

/**
 * Calls the user when an agent needs them: a skin sound, a browser notification while the tab is in the background
 * (clicking it opens that agent's details) and a "🔔 N" prefix in the tab title while anyone is waiting.
 */
@Injectable({ providedIn: 'root' })
export class AgentAlerts {
  private readonly agents = inject(AgentStore);
  private readonly selection = inject(AgentSelection);
  private readonly settings = inject(AlertSettings);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lastAlertAt = new Map<string, number>();
  private readonly skin = catsSkin;
  private started = false;

  constructor() {
    effect(() => {
      const waiting = this.agents.visible().filter(agent => agent.activity === 'waiting').length;
      document.title = waiting > 0 ? `🔔 ${waiting} · ${BASE_TITLE}` : BASE_TITLE;
    });
  }

  /** Idempotent. Called once at app start. */
  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    unlockAudioOnFirstGesture();
    const unsubscribe = this.agents.onTransition(transition => this.handle(transition));
    this.destroyRef.onDestroy(unsubscribe);
  }

  private handle(transition: AgentTransition): void {
    const now = Date.now();
    const alert = decideAlert(transition, this.skin.characterName(transition.agent.agentId), now);
    if (!alert || now - (this.lastAlertAt.get(alert.agentId) ?? 0) < PER_AGENT_COOLDOWN_MS) {
      return;
    }
    this.lastAlertAt.set(alert.agentId, now);

    if (this.settings.sound()) {
      playSound(this.skin.sounds[alert.sound]);
    }
    if (this.settings.notifications() && document.hidden) {
      this.notify(alert);
    }
  }

  private notify(alert: Alert): void {
    // One notification per agent: a newer one replaces the older.
    const notification = new Notification(alert.title, { body: alert.body, tag: alert.agentId, icon: 'favicon.ico' });
    notification.onclick = (): void => {
      window.focus();
      this.selection.select(alert.agentId);
      notification.close();
    };
  }
}
