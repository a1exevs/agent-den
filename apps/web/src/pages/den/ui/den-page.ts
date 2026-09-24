import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Main screen: the den with rooms per project. The world widget lands here next. */
@Component({
  selector: 'den-den-page',
  template: `
    <main class="den-page">
      <h1>agent-den</h1>
      <p>The cats are on their way 🐾</p>
    </main>
  `,
  styles: `
    .den-page {
      display: grid;
      place-content: center;
      gap: 1rem;
      min-height: 100dvh;
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenPage {}
