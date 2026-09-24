import type { AgentState } from '@agent-den/contracts';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DenPixelSprite } from '@shared/ui';

import { type Action, actionFor, type Skin } from '../model/skin';

/**
 * How an agent looks in a skin: the pose sprite for its current action, in its session's colors.
 * Knows nothing about where it is drawn — scenes and panels place it.
 */
@Component({
  selector: 'den-agent-avatar',
  imports: [DenPixelSprite],
  templateUrl: './agent-avatar.html',
  styleUrl: './agent-avatar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DenAgentAvatar {
  readonly agent = input.required<AgentState>();
  readonly skin = input.required<Skin>();
  /** Overrides the pose derived from the agent's activity (e.g. `idle` while walking). */
  readonly action = input<Action | undefined>(undefined);
  /** Screen pixels per art pixel. */
  readonly scale = input<number>(3);
  readonly flip = input<boolean>(false);

  protected readonly art = computed(() => this.skin().characterArt(this.action() ?? actionFor(this.agent())));
  protected readonly palette = computed(() => this.skin().characterPalette(this.agent().sessionId));
}
