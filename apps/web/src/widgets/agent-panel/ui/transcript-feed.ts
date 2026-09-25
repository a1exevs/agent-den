import { DatePipe } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { type TranscriptStatus } from '@entities/transcript';
import { DenSearchField, DenToggle } from '@shared/ui';

import { FOLLOW_THRESHOLD_PX } from '../config/feed';
import type { FeedEntry } from '../model/build-feed';
import { filterFeed } from '../model/filter-feed';

@Component({
  selector: 'den-transcript-feed',
  imports: [DatePipe, DenSearchField, DenToggle],
  templateUrl: './transcript-feed.html',
  styleUrl: './transcript-feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenTranscriptFeed {
  readonly entries = input.required<readonly FeedEntry[]>();
  readonly status = input.required<TranscriptStatus>();

  protected readonly query = signal('');
  protected readonly showTools = signal(true);
  protected readonly showThinking = signal(false);
  protected readonly follow = signal(true);

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  protected readonly visible = computed(() =>
    filterFeed(this.entries(), { query: this.query(), showTools: this.showTools(), showThinking: this.showThinking() }),
  );

  protected readonly emptyText = computed(() => {
    switch (this.status()) {
      case 'loading':
        return 'Sniffing the transcript…';
      case 'missing':
        return 'No transcript for this agent (yet).';
      default:
        return this.query() ? 'Nothing matches.' : 'Quiet so far.';
    }
  });

  constructor() {
    afterRenderEffect({
      write: () => {
        this.visible();
        if (this.follow()) {
          const element = this.list().nativeElement;
          element.scrollTop = element.scrollHeight;
        }
      },
    });
  }

  protected onScroll(): void {
    const element = this.list().nativeElement;
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < FOLLOW_THRESHOLD_PX;
    if (atBottom !== this.follow()) {
      this.follow.set(atBottom);
    }
  }
}
