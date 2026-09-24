import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'den-search-field',
  templateUrl: './den-search-field.html',
  styleUrl: './den-search-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenSearchField {
  readonly value = model<string>('');
  readonly label = input.required<string>();
  readonly placeholder = input<string>('');

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
