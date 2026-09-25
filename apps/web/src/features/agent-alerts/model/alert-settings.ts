import { Injectable, signal } from '@angular/core';

import { unlockAudio } from '@shared/lib';

import { ALERT_SETTINGS_STORAGE_KEY } from '../config/alerts';

type StoredSettings = { sound?: boolean; notifications?: boolean };

export type NotificationPermissionState = NotificationPermission | 'unsupported';

function load(): StoredSettings {
  try {
    const raw = localStorage.getItem(ALERT_SETTINGS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null ? (parsed as StoredSettings) : {};
  } catch {
    return {};
  }
}

function currentPermission(): NotificationPermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** The viewer's alert preferences, remembered in localStorage. Sound is on by default, notifications opt-in. */
@Injectable({ providedIn: 'root' })
export class AlertSettings {
  private readonly stored = load();
  private readonly soundState = signal(this.stored.sound ?? true);
  private readonly permissionState = signal<NotificationPermissionState>(currentPermission());
  private readonly notificationsState = signal(
    (this.stored.notifications ?? false) && this.permissionState() === 'granted',
  );

  readonly sound = this.soundState.asReadonly();
  readonly notifications = this.notificationsState.asReadonly();
  readonly permission = this.permissionState.asReadonly();

  /** Call from the toggle's click — the gesture also unlocks browser audio. */
  setSound(on: boolean): void {
    if (on) {
      unlockAudio();
    }
    this.soundState.set(on);
    this.save();
  }

  /** Asks the browser for permission the first time notifications are switched on. */
  async setNotifications(on: boolean): Promise<void> {
    if (on && this.permissionState() === 'default') {
      this.permissionState.set(await Notification.requestPermission());
    }
    this.notificationsState.set(on && this.permissionState() === 'granted');
    this.save();
  }

  private save(): void {
    try {
      const settings: StoredSettings = { sound: this.soundState(), notifications: this.notificationsState() };
      localStorage.setItem(ALERT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable — preferences last for this visit only.
    }
  }
}
