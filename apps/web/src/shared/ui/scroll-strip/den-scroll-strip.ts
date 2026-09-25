import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * A horizontal strip for overflowing content (tabs, chips): native scrolling, the mouse wheel scrolls sideways,
 * and arrow buttons appear at an edge when there is more content beyond it.
 */
@Component({
  selector: 'den-scroll-strip',
  templateUrl: './den-scroll-strip.html',
  styleUrl: './den-scroll-strip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenScrollStrip {
  /** Accessible name of the scrollable region. */
  readonly label = input.required<string>();

  protected readonly canScrollLeft = signal(false);
  protected readonly canScrollRight = signal(false);

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.updateArrows());
      observer.observe(this.viewport().nativeElement);
      observer.observe(this.track().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
      this.updateArrows();
    });
  }

  /**
   * Scrolls sideways just enough to show `element` (a child of the strip). Unlike `scrollIntoView`, never scrolls the
   * page vertically.
   */
  reveal(element: HTMLElement): void {
    const viewport = this.viewport().nativeElement;
    const margin = 8;
    const left = element.offsetLeft;
    const right = left + element.offsetWidth;
    if (left - margin < viewport.scrollLeft) {
      viewport.scrollTo({ left: left - margin, behavior: 'smooth' });
    } else if (right + margin > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollTo({ left: right + margin - viewport.clientWidth, behavior: 'smooth' });
    }
  }

  /** Scrolls by most of the visible width, keeping a bit of the previous view for orientation. */
  protected scrollByPage(direction: -1 | 1): void {
    const element = this.viewport().nativeElement;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: 'smooth' });
  }

  /** Vertical wheel scrolls sideways — there is nothing to scroll vertically here. */
  protected onWheel(event: WheelEvent): void {
    const element = this.viewport().nativeElement;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || element.scrollWidth <= element.clientWidth) {
      return;
    }
    event.preventDefault();
    element.scrollBy({ left: event.deltaY });
  }

  protected updateArrows(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.viewport().nativeElement;
    this.canScrollLeft.set(scrollLeft > 1);
    this.canScrollRight.set(scrollLeft + clientWidth < scrollWidth - 1);
  }
}
