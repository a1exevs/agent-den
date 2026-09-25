import { Injectable, signal } from '@angular/core';

import { COLLAPSED_ROOMS_STORAGE_KEY } from '../config/scene';

function load(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_ROOMS_STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function save(ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(COLLAPSED_ROOMS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable (private mode, quota) — the preference just won't survive a reload.
  }
}

/** Which rooms the viewer folded; remembered in localStorage across reloads. */
@Injectable({ providedIn: 'root' })
export class CollapsedRooms {
  private readonly ids = signal<ReadonlySet<string>>(load());

  isCollapsed(roomId: string): boolean {
    return this.ids().has(roomId);
  }

  setCollapsed(roomId: string, collapsed: boolean): void {
    this.ids.update(ids => {
      const next = new Set(ids);
      if (collapsed) {
        next.add(roomId);
      } else {
        next.delete(roomId);
      }
      save(next);
      return next;
    });
  }
}
