---
paths:
  - "apps/**"
  - "packages/**"
  - "tools/**"
---

<!-- Generated from .cursor/rules/typescript-guidelines.mdc by scripts/sync-agent-rules.mjs — edit the .mdc, not this file. -->

# TypeScript Guidelines

## Strict Mode

TS strict mode enabled. All strict checks enforced.

## Type Safety Rules

- NEVER use `any`. Use `unknown` + type narrowing when type is unknown.
- Always handle `null`/`undefined` explicitly (optional chaining, nullish coalescing, guards).
- Array index access returns `T | undefined` — always check before use.
- Minimize `as` assertions — prefer type guards or proper typing.
- Use `as const` for literal types.

## Explicit Return Types

Named functions, class methods and exported arrow functions declare their return type, including `void`.
Short inline callbacks (`computed(() => ...)`, `.map(x => ...)`, event handlers in `addEventListener`) may rely on
inference.

```typescript
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

const handleClick = (e: MouseEvent): void => {
  this.picked.emit(e.button);
};
```

## Type Definitions

- `interface` — ONLY for business entities and wire contracts (AgentState, DenEvent, etc.)
- `type` — for everything else: unions, intersections, view models, utility types

## Type Exports

Mark type-only re-exports in barrel files with `type` (`export { type X }` or `export type { X }`):

```typescript
export { AgentStore, groupIntoRooms, type Room } from './model';
```

## General Practices

- Use generics for reusable type-safe code
- Use built-in utility types (Omit, Pick, Partial, Required, Readonly)
- Use discriminated unions for complex state
- Create type guards (`value is T`) for runtime checks
- Type DOM event handlers explicitly (MouseEvent, KeyboardEvent)
- Follow `@typescript-eslint` strict rules

## Control flow (`if` / `else`)

- **`if`, `else if`, and `else`** MUST use **curly braces** always, even for a single statement (`return`, one function call, etc.).
- Put the **body on its own lines** inside the block — do not write one-line `if (x) foo();`.

```typescript
// BAD
if (!value) return;
if (el) doThing(el);

// GOOD
if (!value) {
  return;
}

if (el) {
  doThing(el);
}
```
