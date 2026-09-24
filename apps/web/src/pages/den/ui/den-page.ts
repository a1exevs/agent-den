import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DenWorld } from '@widgets';

/** Main screen: the den with rooms per project. */
@Component({
  selector: 'den-den-page',
  imports: [DenWorld],
  template: `
    <main class="page">
      <header class="page__header">
        <h1 class="page__title">agent-den</h1>
        <p class="page__subtitle">where your agents nap between tool calls</p>
      </header>
      <den-world />
    </main>
  `,
  styles: `
    .page {
      display: grid;
      gap: 24px;
      max-width: 1200px;
      margin-inline: auto;
      padding: 24px 16px 48px;
    }

    .page__title {
      font-size: 28px;
      letter-spacing: 0.08em;
    }

    .page__subtitle {
      font-size: 13px;
      opacity: 0.7;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenPage {}
