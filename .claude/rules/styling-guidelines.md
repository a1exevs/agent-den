---
paths:
  - "apps/web/**"
---

<!-- Generated from .cursor/rules/styling-guidelines.mdc by scripts/sync-agent-rules.mjs — edit the .mdc, not this file. -->

# Styling Guidelines

## Plain CSS

No SCSS/LESS, no Tailwind. Use modern CSS: nesting, custom properties, `@layer`, `color-mix()`, `light-dark()`,
container queries, `@property` for animatable variables.

## Component styles

- `component-name.css` next to the component, referenced via `styleUrl`. Angular emulated encapsulation scopes it.
- Class names: **kebab-case**, BEM-ish (`.cat`, `.cat--sleeping`, `.cat__tail`).
- Conditional classes via `[class.cat--sleeping]="isSleeping()"` or `cn()` from `@shared/lib`. No `[ngClass]`.
- Dynamic values (sprite frame, position) → CSS custom properties bound from the template
  (`[style.--frame]="frame()"`), not inline style strings.

## Global styles

Only in `src/styles.css`, organized by `@layer reset, tokens, base`. Design tokens are `--den-*` custom properties
defined in the `tokens` layer; components consume tokens and never hardcode palette values.

## Pixel art

- Sprites are code-defined pixel art (`@shared/ui` `DenPixelSprite`), rendered with `image-rendering: pixelated` at an integer `scale`.
- Frame animation via `steps()` timing on `background-position` or a frame custom property.
- Respect `prefers-reduced-motion`: reduce idle animations, keep state changes readable.

## Shared UI

Components in `src/shared/ui/` own their styles and are reusable; they are the only place styling Spartan primitives.
