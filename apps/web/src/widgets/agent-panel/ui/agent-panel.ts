import type { ToolCategory } from '@agent-den/contracts';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';

import { AgentStore } from '@entities/agent';
import { actionFor, catsSkin } from '@entities/skin';
import { TranscriptStore } from '@entities/transcript';
import { injectNow } from '@shared/lib';
import { DenPixelSprite, DenSheet } from '@shared/ui';

import { activityLabel, formatDuration, toolCategoryLabels } from 'src/widgets/agent-panel/lib/describe-agent';
import { buildFeed } from 'src/widgets/agent-panel/model/build-feed';
import { DenTranscriptFeed } from 'src/widgets/agent-panel/ui/transcript-feed';

/** Details of one agent: who, where, what it's doing, and its live transcript. */
@Component({
  selector: 'den-agent-panel',
  imports: [DatePipe, DenPixelSprite, DenSheet, DenTranscriptFeed],
  templateUrl: './agent-panel.html',
  styleUrl: './agent-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenAgentPanel {
  readonly agentId = input<string | null>(null);
  readonly closed = output();

  private readonly agents = inject(AgentStore);
  private readonly transcripts = inject(TranscriptStore);
  private readonly now = injectNow(1000);

  protected readonly skin = catsSkin;
  protected readonly agent = computed(() => {
    const id = this.agentId();
    return id ? this.agents.byId(id) : undefined;
  });
  protected readonly isOpen = computed(() => this.agent() !== undefined);

  protected readonly name = computed(() => {
    const agent = this.agent();
    return agent ? this.skin.characterName(agent.agentId) : '';
  });
  protected readonly art = computed(() => {
    const agent = this.agent();
    return this.skin.characterArt(agent ? actionFor(agent) : 'idle');
  });
  protected readonly palette = computed(() => this.skin.characterPalette(this.agent()?.sessionId ?? ''));
  protected readonly status = computed(() => {
    const agent = this.agent();
    return agent ? activityLabel(agent) : '';
  });
  protected readonly duration = computed(() => {
    const agent = this.agent();
    return agent ? formatDuration(this.now() - agent.startedAt) : '';
  });
  protected readonly toolCounts = computed(() =>
    Object.entries(this.agent()?.toolCounts ?? {}).map(([category, count]) => ({
      label: toolCategoryLabels[category as ToolCategory],
      count,
    })),
  );

  protected readonly feed = computed(() => buildFeed(this.transcripts.items()));
  protected readonly transcriptStatus = this.transcripts.status;

  constructor() {
    effect(() => this.transcripts.watch(this.isOpen() ? this.agentId() : null));
  }
}
