---
paths:
  - "apps/web/**"
---

<!-- Generated from .cursor/rules/fsd-architecture.mdc by scripts/sync-agent-rules.mjs — edit the .mdc, not this file. -->

# Feature-Sliced Design

`apps/web` follows standard [Feature-Sliced Design](https://feature-sliced.design/ru/docs/get-started/overview).
`npm run lint` enforces almost all of it — see [§9 Enforcement](#9-enforcement). What no tool can check is marked there.

Structure: **layer → slice → segment → file**. `app` and `shared` have no slices (layer → segment → file).

## 1. Layers

```
app → pages → widgets → features → entities → shared        (arrows = "may import")
```

| Layer | What lives here | Has slices | May import |
|---|---|---|---|
| `app/` | bootstrap: `app.config.ts`, routes, root component, global providers | no | pages, widgets, features, entities, shared |
| `pages/` | one slice per route/screen; composes widgets | yes | widgets, features, entities, shared |
| `widgets/` | big self-contained UI blocks that combine entities/features | yes | features, entities, shared |
| `features/` | one user action that brings value (toggle sound, switch skin) | yes | entities, shared |
| `entities/` | domain objects: state, types, domain logic, their own small UI | yes | shared |
| `shared/` | domain-agnostic code: UI kit, collector socket, config, helpers | no | — (only other `shared` segments) |

- Only **downwards**. Never sideways between slices of one layer (see §6), never upwards.
- A layer is created when its first slice appears — no empty folders.
- `app/` is imported only by `main.ts`, directly by file. While it is small (root component, config, routes) its
  files sit in `app/` itself; split it into segments by purpose (`routes/`, `providers/`, `styles/`) once it grows.

## 2. Where does new code go?

Walk from the top and stop at the first "yes":

1. Is it app-wide wiring (provider, route, global error handling)? → `app/`
2. Is it a whole screen? → `pages/<screen>/`
3. Is it one user action (a button + the logic it triggers)? → `features/<verb-noun>/`
4. Is it a big UI block assembled from several entities/features? → `widgets/<block>/`
5. Is it a domain concept of this app (agent, skin, transcript, achievement)? → `entities/<noun>/`
6. Would it make sense in any other project (no knowledge of agents/cats)? → `shared/<segment>/`

**Pages first:** put code in the page/widget that uses it; extract a widget, feature or entity only when a second
consumer appears. Steiger's `fsd/insignificant-slice` warning points at slices with a single consumer.

Our examples:

| Code | Place | Why |
|---|---|---|
| `DenPage` | `pages/den/ui` | a screen |
| rooms with cats and stations | `widgets/den-world` | big block over the agent + skin entities |
| details sheet with the transcript | `widgets/agent-panel` | big block over agent + transcript + skin |
| sound + notifications (toggles and the alerting itself) | `features/agent-alerts` | a user-facing capability with its own settings |
| skin switcher | `features/switch-skin` | a user action |
| `AgentStore`, `groupIntoRooms` | `entities/agent/model` | domain state and logic |
| cat sprites, stations, poses | `entities/skin/model` | domain (how an agent looks) |
| `DenAgentAvatar` (pose sprite in session colors) | `entities/skin/ui` | entity UI: how an agent looks, reused by `den-world` and `agent-panel` |
| `DenCat` (walks, bubbles, labels, picking) | `widgets/den-world/ui` | behaviour on the den scene — knows rooms and stations, so not entity UI |
| `CollectorSocket` | `shared/api` | transport, knows nothing about cats |
| `DenSheet`, `DenToggle`, `DenPixelSprite` | `shared/ui` | UI kit |
| `injectNow`, `pickByHash`, `PixelArt` + sprite-sheet rendering | `shared/lib` | generic helpers |
| room layout (`placeAgents`), walk/scale constants | `widgets/den-world/model`, `widgets/den-world/config` | logic and constants of the scene, out of its components |

`shared` never knows about the domain: no agents, cats or skins there, and it never imports from other layers.

## 3. Slices

- A slice = one business thing, named in kebab-case: noun for entities (`agent`), verb-noun for features
  (`toggle-sound`), block name for widgets/pages (`den-world`, `den`).
- Slices are **isolated**: a slice doesn't import another slice of the same layer (§6).
- A slice consists of segments (§4) and has a public API `index.ts` (§5). No files directly in the slice root
  other than `index.ts`.

## 4. Segments

Five standard segments; a custom one is named by **purpose**, never `components`/`hooks`/`types`/`utils`.

| Segment | Put here | Examples |
|---|---|---|
| `ui/` | components (`.ts` + `.html` + `.css`), their display formatters | `den-cat`, `transcript-feed` |
| `model/` | signal stores, domain types, business logic, view-model derivation | `agent-store`, `rooms`, `build-feed` |
| `api/` | talking to the outside world: socket, HTTP, mapping raw responses | `collector-socket` |
| `lib/` | helpers used inside the slice, pure utilities | `describe-agent`, `hash`, `now` |
| `config/` | constants, configuration, feature flags | `collectorSocketUrl` |

- Create only the segments you need. Sub-folders inside a segment are fine for grouping (`entities/skin/model/cats/`).
- `ui/` files hold components only. A constant, type or function found next to a component moves to its FSD home in
  the same slice: `config/`, `model/` or `lib/` — named by purpose (`config/scene.ts`, `model/placements.ts`), never
  `consts.ts` / `types.ts` / `utils.ts`.
- Tests (`*.spec.ts`) sit next to the file they test, in the same segment.

**Between segments of one slice** imports are free (relative paths), but keep the direction:

```
ui ──→ model ──→ api
 │       │        │
 └───────┴────────┴──→ lib, config
```

| Segment | may import (code) | may also `import type` from |
|---|---|---|
| `ui` | `model`, `api`, `lib`, `config` | — |
| `model` | `api`, `lib`, `config` | — |
| `api` | `lib`, `config` | `model` |
| `lib` | — | `model` |
| `config` | — | `model` |

- **Types flow down, code doesn't:** `api`, `lib` and `config` may `import type` domain types from their slice's
  `model` (a mapper returning `AgentState`, a typed helper) — type imports are erased, so at runtime `model` still
  depends on them, never the other way round.
- **`ui` stays on top:** no segment imports `ui`, not even its types.
- The same applies to the segments of `shared` (`shared/ui` may use `shared/lib`, `shared/api` uses `shared/config`).

## 5. Public API (`index.ts`)

| Where | `index.ts`? | Why |
|---|---|---|
| slice (`entities/agent/index.ts`) | **required** | the slice's public API; re-exports straight from files |
| segment of `shared` (`shared/ui/index.ts`) | **required** | `shared` has no slices — its segments are the public API |
| segment inside a slice (`entities/agent/model/index.ts`) | **forbidden** | nobody may import it: outsiders use the slice index, insiders import files — it would be a dead barrel |
| layer (`src/entities/index.ts`) | **forbidden** | layer barrels hide dependencies and create cycles |
| `app/index.ts` | **forbidden** | only `main.ts` imports `app`, and it imports the files directly — nobody needs a public API |

- Explicit named re-exports only (`export { X }`, `export { type Y }`), never `export *`.
- Export **only what other slices use** — knip fails on unused exports.
- Index files re-export with relative paths.

```typescript
// src/entities/agent/index.ts
export { AgentStore } from './model/agent-store';
export { groupIntoRooms, type Room } from './model/rooms';

// src/shared/ui/index.ts
export { DenSheet } from './sheet';
export { DenToggle } from './toggle';
```

## 6. Imports

As the [FSD docs](https://feature-sliced.design/docs/reference/public-api) put it: **relative inside a slice,
alias across slices.**

| From → to | Allowed? | How | Example |
|---|---|---|---|
| file → file of the same segment | ✅ | relative | `import { DenCat } from './den-cat';` |
| segment → segment of the same slice | ✅ (direction §4) | relative, to the **file** | `import { buildFeed } from '../model/build-feed';` |
| segment → segment of `shared` (inside `shared`) | ✅ | relative | `import { collectorSocketUrl } from '../config';` |
| slice → slice of a **lower** layer | ✅ | alias to its `index.ts` | `import { AgentStore } from '@entities/agent';` |
| slice → `shared` segment | ✅ | alias to the segment | `import { DenSheet } from '@shared/ui';` |
| anything → workspace package | ✅ | package name | `import { reduceAgents } from '@agent-den/contracts';` |
| slice → another slice of the **same** layer | ❌ | — compose them one layer up | |
| anything → **upper** layer | ❌ | — | |
| anything → inside another slice's segments | ❌ | — use its public API | |
| a file → its own slice's `index.ts` | ❌ | — cycle | |

Forbidden — and who catches it:

```typescript
import { cn } from 'src/shared/lib';                              // ❌ `src/` paths — ESLint (alias not in tsconfig)
import { AgentStore } from '@entities/agent/model/agent-store'; // ❌ public-API sidestep — ESLint
import { DenSheet } from '@shared/ui/sheet';                     // ❌ shared segment sidestep — ESLint
import { catsSkin } from '@entities/skin';                        // ❌ in entities/agent: cross-slice — ESLint
import { DenAgentPanel } from '../../agent-panel';                // ❌ relative path into another slice — Steiger
import { DenWorld } from '@widgets/den-world';                    // ❌ in entities: upper layer — ESLint
import { BrnSheet } from '@spartan-ng/brain/sheet';               // ❌ outside shared — ESLint
```

**When two slices of one layer need each other:** the thing that uses both belongs one layer up (the `den` page links
`den-world` and `agent-panel` through the selected agent). Only for `entities` FSD allows the
[`@x` notation](https://feature-sliced.design/docs/reference/public-api#public-api-for-cross-imports)
(`entities/agent/@x/skin.ts` — a narrow API for `skin`); discuss before adding one.

## 7. UI kit boundary

- `@spartan-ng/*` is imported **only** inside `src/shared/**`.
- Every primitive is wrapped in `shared/ui/<name>/` (`den-*` selector, own styles) and exported from `@shared/ui`.
- A wrapper is missing? Add it to `shared/ui` first — upper layers never use Spartan directives directly.

## 8. Checklist for new code

1. Pick the place with §2 (pages first).
2. Create the slice folder (kebab-case) and only the segments you need (§4).
3. Add the slice `index.ts` (re-export straight from files; no `index.ts` in its segments); export only what other slices use (§5).
4. Imports: relative inside the slice, `@layer/slice` / `@shared/segment` across (§6).
5. `npm run lint` green.

## 9. Enforcement

| Rule | Checked by |
|---|---|
| Only downwards between layers | ESLint `no-restricted-imports` (aliases), Steiger `forbidden-imports` (relative paths) |
| No imports between slices of one layer | ESLint (aliases), Steiger `forbidden-imports` (relative paths) |
| Through the public API only | ESLint (aliases), Steiger `no-public-api-sidestep` (relative paths) |
| No `src/...` paths | ESLint + tsc (no such alias) |
| No import of your own slice/segment index | ESLint `no-restricted-imports` (`.` / `..`) |
| No dependency cycles | ESLint `import/no-cycle`, `import/no-self-import` |
| Segment direction `ui → model → api → lib, config` | ESLint `import/no-restricted-paths` (zones generated per slice: `linter/rules/segment-direction-rule.ts`) |
| api / lib / config → model: `import type` only | ESLint `@typescript-eslint/no-restricted-imports` with `allowTypeImports` (`modelTypeOnlyRule`) |
| `index.ts` placement (§5), no `export *` | `scripts/check-structure.mjs`, Steiger `public-api`, `no-layer-public-api`, `no-wildcard-exports` |
| Only the five standard segments; nothing but `index.ts` in a slice root | `scripts/check-structure.mjs` |
| kebab-case names | `scripts/check-structure.mjs` |
| No unused exports / files / dependencies | knip (`knip.json`) |
| Spartan only in `shared` | ESLint |
| `ui/` files hold components only (no top-level const/type/function) | ESLint `no-restricted-syntax` on `ui/**` |
| Pages first | Steiger `insignificant-slice` — **warning only** |
| `shared` knows nothing about the domain | ❌ not checkable (upward imports are caught, domain concepts are not) — review |
| Which layer new code belongs to (§2) | ❌ a design decision — review |

## Current structure

```
src/
├── main.ts
├── styles.css
├── app/             app.ts/.html, app.config.ts, app.routes.ts
├── pages/
│   └── den/         index.ts, ui/ (den-page)
├── widgets/
│   ├── den-world/   index.ts, ui/ (den-world, den-room, den-cat, den-roster),
│   │                model/ (placements, roster, collapsed-rooms), config/ (scene)
│   └── agent-panel/ index.ts, ui/ (agent-panel, transcript-feed), model/ (build-feed, filter-feed),
│                    lib/ (describe-agent), config/ (feed)
├── features/
│   └── agent-alerts/ index.ts, ui/ (alert-toggles), model/ (agent-alerts, alert-settings, decide-alert), config/
├── entities/
│   ├── agent/       index.ts, model/ (agent-store, agent-selection, rooms)
│   ├── skin/        index.ts, model/ (skin, cats/… incl. cat-sounds), ui/ (agent-avatar)
│   └── transcript/  index.ts, model/ (transcript-store)
└── shared/
    ├── api/         index.ts, collector-socket
    ├── config/      index.ts
    ├── lib/         index.ts, audio, hash, now, pixel-art
    └── ui/          index.ts, collapsible/, pixel-sprite/, scroll-strip/, search-field/, sheet/, toggle/
```
