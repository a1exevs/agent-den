import { DestroyRef, effect, inject, Injectable } from '@angular/core';

import { AgentSelection, AgentStore, type AgentTransition, isBusy } from '@entities/agent';
import { catsSkin } from '@entities/skin';
import { playSound, preloadSound, unlockAudio, unlockAudioOnFirstGesture } from '@shared/lib';

import { AlertSettings } from './alert-settings';
import { type Alert, decideAlert, startsUserTurn } from './decide-alert';
import { voicePitch } from './voice-pitch';
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
  /** Sessions that already purred since the user's last prompt. */
  private readonly finishedThisTurn = new Set<string>();
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
    Object.values(this.skin.sounds).forEach(preloadSound);
    const unsubscribe = this.agents.onTransition(transition => this.handle(transition));
    this.destroyRef.onDestroy(unsubscribe);
  }

  /** A sample meow, so switching the sound on answers right away. Call from a user gesture. */
  preview(): void {
    void unlockAudio().then(() => playSound(this.skin.sounds['needs-you']));
  }

  private handle(transition: AgentTransition): void {
    const { agent, event } = transition;
    if (startsUserTurn(event)) {
      this.finishedThisTurn.delete(agent.agentId);
    }
    const now = Date.now();
    const alert = decideAlert(transition, this.skin.characterName(agent.agentId), now, {
      kittensBusy: this.agents.visible().some(other => other.parentAgentId === agent.agentId && isBusy(other)),
      finishedThisTurn: this.finishedThisTurn.has(agent.agentId),
    });
    if (!alert || now - (this.lastAlertAt.get(alert.agentId) ?? 0) < PER_AGENT_COOLDOWN_MS) {
      return;
    }
    this.lastAlertAt.set(alert.agentId, now);
    if (alert.sound === 'finished') {
      this.finishedThisTurn.add(alert.agentId);
    }

    if (this.settings.sound()) {
      playSound(this.skin.sounds[alert.sound], { pitchScale: voicePitch(agent) });
    }
    if (this.settings.notifications() && document.hidden) {
      this.notify(alert);
    }
  }

  private notify(alert: Alert): void {
    // One notification per agent: a newer one replaces the older.
    // Our meow already plays: keep the system notification chime quiet so there is one sound, not two.
    const notification = new Notification(alert.title, {
      body: alert.body,
      tag: alert.agentId,
      icon: 'favicon.ico',
      silent: this.settings.sound(),
    });
    notification.onclick = (): void => {
      window.focus();
      this.selection.select(alert.agentId);
      notification.close();
    };
  }
}
