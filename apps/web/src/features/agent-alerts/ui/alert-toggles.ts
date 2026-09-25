import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DenToggle } from '@shared/ui';

import { AgentAlerts } from '../model/agent-alerts';
import { AlertSettings } from '../model/alert-settings';

/** Sound and browser-notification switches for agent alerts. */
@Component({
  selector: 'den-alert-toggles',
  imports: [DenToggle],
  templateUrl: './alert-toggles.html',
  styleUrl: './alert-toggles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenAlertToggles {
  protected readonly settings = inject(AlertSettings);
  private readonly alerts = inject(AgentAlerts);

  protected readonly notificationsBlocked = computed(() => {
    const permission = this.settings.permission();
    return permission === 'denied' || permission === 'unsupported';
  });

  protected readonly notificationsHint = computed(() => {
    switch (this.settings.permission()) {
      case 'denied':
        return 'Notifications are blocked for this site — allow them in the browser settings';
      case 'unsupported':
        return 'This browser has no notifications';
      default:
        return 'Notify me while the tab is in the background';
    }
  });

  protected onSoundChange(on: boolean): void {
    this.settings.setSound(on);
    if (on) {
      this.alerts.preview();
    }
  }

  protected onNotificationsChange(on: boolean): void {
    void this.settings.setNotifications(on);
  }
}
