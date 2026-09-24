---
paths:
  - "apps/web/**"
---

<!-- Generated from .cursor/rules/component-architecture.mdc by scripts/sync-agent-rules.mjs — edit the .mdc, not this file. -->

# Component Architecture

## Baseline

- Standalone components only (no NgModules). App is **zoneless** — never rely on zone.js.
- `changeDetection: ChangeDetectionStrategy.OnPush` on every component (ESLint enforced).
- Selector prefix `den-` (elements, kebab-case) / `den` (attribute directives, camelCase).
- Signal APIs only: `input()`, `input.required()`, `output()`, `model()`, `viewChild()`, `computed()`;
  `effect()` / `afterRenderEffect()` sparingly. No `@Input()` / `@Output()` decorators.
- `inject()` instead of constructor injection.
- Built-in control flow (`@if`, `@for` with `track`, `@switch`, `@defer`) — no `*ngIf` / `*ngFor`.
- Always three files: `*.ts`, `*.html` (`templateUrl`) and `*.css` (`styleUrl`, omit if the component has no styles).
  No inline `template` / `styles`, even for tiny components (ESLint `component-max-inline-declarations: 0`).
- Host bindings via the `host` metadata object, not `@HostBinding` / `@HostListener`.

## Container / Presentational

**Container** (page, widget root): injects stores from entities, derives view models with `computed()`, passes data
down, handles outputs.

**Presentational** (`shared/ui`, inner widget components): inputs + outputs only. No store injection, no transport.

```typescript
// Container — widgets/den-world/ui/den-world.ts
export class DenWorld {
  private readonly store = inject(AgentStore);
  protected readonly rooms = computed(() => groupIntoRooms(this.store.visible()));
}

// Presentational — widgets/den-world/ui/den-cat.ts
export class DenCat {
  readonly agent = input.required<AgentState>();
  readonly picked = output<string>();
}
```

## Typing & templates

- Explicit types for inputs (`input.required<AgentState>()`) and outputs (`output<string>()`; `output()` for void).
- Template event handlers call component methods; no logic in templates beyond simple expressions.
- Class members used only by the template are `protected`; the public API of a component is its inputs/outputs.
- Interactive non-button elements get `role`, `tabindex` and keyboard handlers (`keydown.enter`, `keydown.space`).

## File naming

`den-cat.ts`, `den-cat.html`, `den-cat.css`, `den-cat.spec.ts`. Class name = selector in PascalCase:
`den-cat` → `DenCat`. See file-naming.
