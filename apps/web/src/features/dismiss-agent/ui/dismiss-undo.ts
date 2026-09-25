import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DenToast } from '@shared/ui';

import { DismissAgent } from '../model/dismiss-agent';

/** "Barsik went home · Undo" right after sending a cat home. */
@Component({
  selector: 'den-dismiss-undo',
  imports: [DenToast],
  templateUrl: './dismiss-undo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenDismissUndo {
  protected readonly dismissAgent = inject(DismissAgent);
  protected readonly message = computed(() => {
    const last = this.dismissAgent.lastDismissed();
    return last ? `${last.name} went home` : '';
  });
}
