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

import type { FeedEntry } from 'src/widgets/agent-panel/model/build-feed';

/** Distance from the bottom (px) that still counts as "following". */
const FOLLOW_THRESHOLD_PX = 48;

function matches(entry: FeedEntry, query: string): boolean {
  const haystack =
    entry.kind === 'tool'
      ? `${entry.name} ${entry.summary ?? ''} ${entry.input} ${entry.result?.text ?? ''}`
      : entry.text;
  return haystack.toLowerCase().includes(query);
}

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

  protected readonly visible = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.entries().filter(
      entry =>
        (this.showTools() || entry.kind !== 'tool') &&
        (this.showThinking() || entry.kind !== 'thinking') &&
        (!query || matches(entry, query)),
    );
  });

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
