import { DestroyRef, inject, type Signal, signal } from '@angular/core';

/** Signal with the current epoch ms, refreshed every `periodMs`. Must run in an injection context. */
export function injectNow(periodMs = 1000): Signal<number> {
  const now = signal(Date.now());
  const timer = setInterval(() => now.set(Date.now()), periodMs);
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return now.asReadonly();
}
