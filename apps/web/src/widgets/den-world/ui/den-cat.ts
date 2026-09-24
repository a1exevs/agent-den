import type { AgentState } from '@agent-den/contracts';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { actionFor, type Skin } from '@entities';
import { DenPixelSprite } from '@shared';

const WALK_MS = 1200;
const CAT_SCALE = 3;
const KITTEN_SCALE = 2;

/** One agent as a character. Walks from `originX` to `targetX` on arrival and between stations. */
@Component({
  selector: 'den-cat',
  imports: [DenPixelSprite],
  templateUrl: './den-cat.html',
  styleUrl: './den-cat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cat',
    '[class.cat--kitten]': 'isKitten()',
    '[class.cat--walking]': 'walking()',
    '[class.cat--waiting]': 'action() === "wait"',
    '[style.left]': 'left()',
    '[style.--walk-ms]': 'walkMs',
  },
})
export class DenCat {
  readonly agent = input.required<AgentState>();
  readonly skin = input.required<Skin>();
  /** Target station position, percent of the room width. */
  readonly targetX = input.required<number>();
  /** Where the character enters from (door for cats, box for kittens), percent. */
  readonly originX = input.required<number>();
  /** Nudge in px so characters at the same station don't overlap. */
  readonly offset = input<number>(0);

  private readonly arrived = signal(false);
  protected readonly walking = signal(false);
  protected readonly facingLeft = signal(false);
  protected readonly walkMs = WALK_MS;

  protected readonly isKitten = computed(() => Boolean(this.agent().parentAgentId));
  protected readonly scale = computed(() => (this.isKitten() ? KITTEN_SCALE : CAT_SCALE));
  protected readonly action = computed(() => (this.walking() ? 'idle' : actionFor(this.agent())));
  protected readonly art = computed(() => this.skin().characterArt(this.action()));
  protected readonly palette = computed(() => this.skin().characterPalette(this.agent().sessionId));
  protected readonly name = computed(() => this.skin().characterName(this.agent().agentId));
  protected readonly bubble = computed(() => (this.walking() ? undefined : this.skin().bubble[this.action()]));
  protected readonly x = computed(() => (this.arrived() ? this.targetX() : this.originX()));
  protected readonly left = computed(() => `calc(${this.x()}% + ${this.offset()}px)`);

  protected readonly caption = computed(() => {
    const agent = this.agent();
    return [agent.toolName, agent.detail].filter(Boolean).join(' · ') || agent.activity;
  });

  private previousX: number | undefined;
  private walkTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Next frame: start walking from the origin to the station.
    afterNextRender(() => requestAnimationFrame(() => this.arrived.set(true)));

    effect(onCleanup => {
      const x = this.x();
      const previous = this.previousX;
      this.previousX = x;
      if (previous === undefined || previous === x) {
        return;
      }
      this.facingLeft.set(x < previous);
      this.walking.set(true);
      clearTimeout(this.walkTimer);
      this.walkTimer = setTimeout(() => this.walking.set(false), WALK_MS);
      onCleanup(() => clearTimeout(this.walkTimer));
    });
  }
}
