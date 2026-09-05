# optimize-immutable-update

[![CI](https://github.com/KODerFunk/optimize-immutable-update/actions/workflows/main.yml/badge.svg)](https://github.com/KODerFunk/optimize-immutable-update/actions/workflows/main.yml)
[![npm](https://img.shields.io/npm/v/optimize-immutable-update)](https://www.npmjs.com/package/optimize-immutable-update)
[![license](https://img.shields.io/npm/l/optimize-immutable-update)](./LICENSE)

Maximize node reuse between two immutable state trees.

`optimizeImmutableUpdate(prev, next)` deeply compares two versions of an immutable tree and returns a new tree where every unchanged subtree is the **same reference** it was in `prev`, while changed subtrees come from `next`. If nothing changed at all, it returns `prev` as is.

This makes reference-equality tools — `React.memo`, `useMemo`, `useSelector`, `useSyncExternalStore`, `reselect`, `Vue` computed, change-detection hacks — actually work for deeply updated immutable state, and eliminates redundant allocations of identical nodes.

## Contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [Where it pays off](#where-it-pays-off)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Matching array items by id](#matching-array-items-by-id)
- [Behavior notes](#behavior-notes)
- [Alternatives](#alternatives)
- [Recipes](#recipes)
- [React hooks](#react-hooks)
- [Benchmarks](#benchmarks)
- [Development](#development)
- [Motivation](#motivation)

## The problem

Immutable updates (spread, `structuredClone`, immer, normalized reducers…) create a **new** tree: every untouched branch is a fresh object with a new identity, even when its content is identical.

```ts
const prev = {
  user: { name: 'Ann' },
  cart: { total: 100 },
}

const next = {
  user: { name: 'Ann' },      // same content, but a NEW object
  cart: { total: 150 },
}

next.user === prev.user        // false — memoization is broken
```

`React.memo(() => …)` re-renders, selectors recompute, effects re-run — only because a deep-but-unchanged node got a new reference.

## The solution

```ts
import optimizeImmutableUpdate from 'optimize-immutable-update'

const state = optimizeImmutableUpdate(prev, next)

state === next                  // true  — the tree really changed
state.user === prev.user        // true  — unchanged subtree reused, zero allocations
state.cart === next.cart        // true  — changed subtree taken from next
```

And when the whole tree is unchanged, the original reference is kept, so consumers can cheaply detect "nothing happened":

```ts
optimizeImmutableUpdate(prev, identicalNext) === prev   // true
```

## Where it pays off

The library targets apps where **fresh immutable trees arrive constantly while their content mostly stays the same**:

- polling and background refetching — dashboards, feeds, monitoring,
- server push over WebSocket/SSE,
- store hydration from server snapshots,
- normalized caches updated after every mutation.

Every parsed response is a tree of brand-new objects, so on every tick — even when the payload is byte-identical to the previous one — the app silently does a cascade of work:

1. selectors, `useMemo` and `useCallback` recompute,
2. `React.memo` components re-render because their props are "new" objects,
3. React reconciles those subtrees — and the DOM ends up unchanged,
4. the freshly allocated copy of the tree immediately turns into garbage, feeding GC pressure.

That work is proportional to **tree size × number of consumers × update frequency**, and all of it exists just to discover "nothing actually changed". Applied once at the data boundary, `optimizeImmutableUpdate` replaces the whole cascade with a single deep pass over the incoming tree: unchanged subtrees keep their old references and never reach the re-render machinery at all.

The effect is most dramatic when:

- responses are large but change in one small branch — one row of a list, one field of a form: everything else keeps its references;
- the server **reorders** list items — id-based matching keeps every row object identical, so keyed `React.memo` rows skip rendering entirely;
- responses repeat without changes — the function returns the old `prev` reference, and `useSyncExternalStore`/selector subscribers detect "nothing happened" for free.

Honest cost: the optimizer itself is one extra deep comparison per update (`O(size of next)`). When trees really change wholesale every time, it adds that pass without saving downstream work — though untouched branches still get stable references, which may pay off through consumer memoization alone.

## Installation

```shell
npm install optimize-immutable-update
```
or
```shell
yarn add optimize-immutable-update
```
or
```shell
pnpm add optimize-immutable-update
```

Requires Node.js >= 20 (runtime dependency is only [`is-plain-object`](https://www.npmjs.com/package/is-plain-object)). TypeScript declarations are bundled.

React is **not** required and is never installed as a dependency: the [React hooks](#react-hooks) subpath uses whatever React (`>= 16.8`) your project already has.

## Usage

```ts
import optimizeImmutableUpdate from 'optimize-immutable-update'

const optimizedNextValue = optimizeImmutableUpdate(prevValue, nextValue)
```

A typical place is right where a fresh immutable tree is produced — after a reducer, a store update, or a deep clone:

```ts
// Redux-style
function rootReducer(prevState: State, action: Action): State {
  // …any immutable update logic: spread, immer, cloneDeep…
  const nextState = nextStateFrom(prevState, action)
  return optimizeImmutableUpdate(prevState, nextState)
}
```

Now every reference-equality consumer down the stream sees stable identities for untouched branches:

```tsx
const UserAvatar = memo(function UserAvatar({ user }: { user: User }) {
  return <Avatar name={user.name} />
})

// After optimization an update to `cart` no longer re-renders UserAvatar:
// state.user keeps pointing to the exact object from the previous render.
```

## API

```ts
function optimizeImmutableUpdate<S>(
  prev: S | undefined,
  next: S,
  idStructure?: IOptimizeImmutableUpdateIdStructure,
): S

type IOptimizeImmutableUpdateIdStructure =
  | undefined                                       // auto-detect item ids
  | string                                          // key name to match array items
  | IOptimizeImmutableUpdateIdStructure[]           // per-index structure for arrays
  | { [key: string]: IOptimizeImmutableUpdateIdStructure } // per-key structure for objects
```

Recursively merges `next` onto `prev` with maximum node reuse:

| Value kind | Result |
|---|---|
| `prev` is `undefined` | `next` as is |
| `next === prev` (same reference) | `prev` |
| Primitives, `null`, functions | `next` |
| `Date` | `prev` when times are equal, otherwise `next` |
| `RegExp` | `prev` when `source` + `flags` are equal (`lastIndex` ignored), otherwise `next` |
| Arrays | Deeply merged; items matched by id (see below), order/inserts/removals supported |
| Plain objects | Deeply merged per key, unchanged keys keep `prev` references |
| Class instances, `Symbol`, `Map`, `Set`, … | `next` (reference comparison only) |

An object branch is considered unchanged when both key sets and all values match — in that case the whole `prev` object reference is returned.

> **The `next` tree is mutated in place**: wherever an unchanged subtree is found, its slot in `next` is overwritten with the `prev` reference. Pass a fresh, single-use tree (the normal product of an immutable update) and use the return value.

How `idStructure` scopes down the tree:

| Form | Scope |
|---|---|
| `undefined` | auto-detection (`id`, then `uuid`) at every array level |
| `'code'` | the **top-level array only**; deeper levels fall back to auto-detection |
| `{ users: 'userId', settings: undefined }` | the named object keys, recursing into each value's own structure |
| `['rowId', undefined]` | the top-level array items **by position**; nested arrays follow their entry's own structure |

## Matching array items by id

Arrays are not merged positionally. When items are objects with an identifier, the optimizer matches `next` items to `prev` items **by id**, so reordering, inserting, removing and swapping keep untouched items reusable even if their positions changed:

```ts
const prev = [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }]
const next = [{ id: 2, name: 'Bob' }, { id: 1, name: 'Ann' }]

const result = optimizeImmutableUpdate(prev, next)
result[0] === prev[1]   // true — the very same object, despite the new position
result[1] === prev[0]   // true
```

By default the item key is auto-detected: `id` first, then `uuid` (probed on the first array item). Use the third argument when your items are keyed differently or when nested arrays need their own rules:

```ts
// 1. Custom key name for array items
optimizeImmutableUpdate(prev, next, 'code')

// 2. Per-key structure: which key to use for each object property
optimizeImmutableUpdate(prev, next, {
  users: 'userId',          // match `users` items by `userId`
  settings: undefined,      // fall back to auto-detection
})

// 3. Per-index structure for arrays
optimizeImmutableUpdate(prev, next, {
  matrix: [
    undefined,              // first row: auto-detect ids
    'rowId',                // second row: match by `rowId`
  ],
})
```

Arrays of primitives (or items without ids) are compared element-wise by position.

## Behavior notes

- **The `next` tree is mutated in place**: wherever an unchanged subtree is found, its slot in `next` is overwritten with the `prev` reference. Pass a fresh, single-use tree (the normal product of an immutable update) and use the return value.
- When **nothing** changed, the function returns the original `prev` object — a cheap "no changes" signal.
- Comparisons use `Object.is`: equal `NaN` reuses `prev`; `+0` vs `-0` counts as a change.
- `Date` and `RegExp` are compared by value — `source` + `flags` for the latter; the mutable `lastIndex` is ignored.
- Non-plain objects (class instances, `Map`, `Set`, `Symbol`, …) are treated as opaque values and compared by reference only.
- Holes in sparse arrays are preserved: no slot is materialized as `undefined`, and a hole where `prev` had a value (or vice versa) counts as a change.
- Non-writable `next` slots (frozen/sealed `next`, getter-only properties) degrade gracefully: the reuse write is skipped instead of throwing, so a deep-equal frozen `next` still returns `prev`, a changed one returns `next` as-is — identical in strict and sloppy mode.
- Duplicate ids in a `prev` array collapse to the **last** item in the id map — output stays correct, reuse degrades.
- Duplicate ids in a `next` array may reuse the **same** `prev` item for several positions — values stay correct, but distinct input items can end up aliasing one reference.
- Per-index `idStructure` entries resolve by position in `next`: after a reorder a matched item may be optimized with a "wrong" entry — prefer key-based structures for reorderable arrays.
- Cyclic references are not supported (recursion has no memo of visited nodes).

## Alternatives

Libraries that align ready-made trees with maximum reference reuse:

| Library | Input | Unchanged subtrees keep old refs | Array items matched by id | Id key auto-detected | Circular refs | `Map`/`Set` values |
|---|---|---|---|---|---|---|
| **optimize-immutable-update** | two full trees | ✅ | ✅ `id`/`uuid` | ✅ | ❌ | ❌ opaque |
| TanStack Query [`replaceEqualDeep`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts) | two full trees | ✅ | ❌ positional | ❌ | ❌ | ❌ |
| [`gattai-merge`](https://www.npmjs.com/package/gattai-merge) | target + partial sources | ✅ | ⚠️ via custom function | ❌ | ✅ | ✅ merged |
| [`@b2m9/keyfold`](https://www.npmjs.com/package/@b2m9/keyfold) | base + partial delta | ✅ | ✅ via `keyBy` | ❌ | ❌ | ❌ JSON-shaped only |
| [`emerge`](https://www.npmjs.com/package/emerge) | two dicts (variadic) | ✅ | ❌ positional | ❌ | ❌ | ❌ dicts only |

✅ out of the box · ⚠️ possible with extra setup · ❌ not supported

- TanStack Query [`replaceEqualDeep`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts) — the default `structuralSharing` of TanStack Query (`@tanstack/query-core`), assumes JSON-serializable data; this package is a drop-in replacement for that option (see [Recipes](#recipes)).
- [`gattai-merge`](https://www.npmjs.com/package/gattai-merge) — merge semantics: keys present only in the target survive; wins on circular references and merged `Map`/`Set`.
- [`@b2m9/keyfold`](https://www.npmjs.com/package/@b2m9/keyfold) — partial-delta semantics (RFC 7396, explicit deletes); identities are strict — duplicate or missing ids throw, where this package degrades gracefully (see [Behavior notes](#behavior-notes)).
- [`emerge`](https://www.npmjs.com/package/emerge) — Clojure-inspired `patch`/`merge` over plain dicts (a non-dict root throws), reusing deep-equal parts even when overrides are redundant; arrays merge positionally, without id matching.

Producer-based tools (immer and friends) create structural sharing while the update is being written, not afterwards — a different insertion point, so they are out of scope here.

## Recipes

### TanStack Query: structural sharing by id

TanStack Query already preserves unchanged references via its default `structuralSharing` (`replaceEqualDeep`), but it matches array items **positionally**. `optimizeImmutableUpdate` is a drop-in replacement that also matches items **by `id`/`uuid`**, so a reordered or shifted response no longer invalidates memoized rows:

```ts
import { QueryClient } from '@tanstack/query-core'
import optimizeImmutableUpdate from 'optimize-immutable-update'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      structuralSharing: optimizeImmutableUpdate,
    },
  },
})
```

Any `(prevData, data) => data` function fits the option, so the whole `idStructure` toolbox works here too.

### Skip re-renders of list rows

```tsx
import { useOptimizedMemo } from 'optimize-immutable-update/react'

function TodoListContainer({ state }: { state: State }) {
  // deps change on every fetch, but rows keep prev objects for unchanged todos
  const todos = useOptimizedMemo(() => state.todos, [state.todos])

  return <TodoList todos={todos} />
}

// memoized rows don't re-render while their todo object is reused:
const TodoRow = memo(function TodoRow({ todo }: { todo: Todo }) {
  return <li>{todo.title}</li>
})
```

The same without hooks — right where a fresh tree is produced:

```ts
const todos = optimizeImmutableUpdate(prevTodos, nextTodos)
```

### Stabilize selector results

```ts
const selectItems = (state: State) => state.items

// somewhere in the store subscription:
const items = optimizeImmutableUpdate(prevItems, selectItems(state))
// `items === prevItems` whenever the content is identical
```

## React hooks

The package ships two hooks behind the `optimize-immutable-update/react` subpath. React is an **optional peer dependency**: this package never installs React by itself, and the hooks use whichever React (`>= 16.8`) your project already has.

```ts
import { useOptimizedMemo, useOptimizedState } from 'optimize-immutable-update/react'
```

### `useOptimizedState`

A drop-in `useState` that runs every update through the optimizer:

```tsx
const [state, setState] = useOptimizedState({ user: { name: 'Ann' }, cart: { total: 100 } })

setState({ user: { name: 'Ann' }, cart: { total: 150 } })
// re-render happens, but state.user is the very same object as before

setState((prev) => ({ ...prev, cart: { total: prev.cart.total } }))
// deep-equal result: the updater returns the previous reference
// and React bails out of the re-render entirely
```

Same semantics as `useState` (value and functional updates, lazy initializer), plus:

- untouched subtrees keep their references across updates,
- updates that change nothing skip the re-render — React's own bail-out on an unchanged reference, working for objects and primitives alike (`NaN` included),
- batched sequential updates always compare against the latest queued state, never a stale render snapshot.

### `useOptimizedMemo`

A `useMemo` that stabilizes its result reference:

```tsx
const todos = useOptimizedMemo(() => buildExpensiveView(state), [state])

// when `state` changes but the built view is deep-equal,
// `todos` keeps the previous reference → memoized rows and effect deps stay quiet
```

When deps change, the factory re-runs as usual. If the new result is deep-equal to the previous one, the **old reference** is returned, so downstream `memo` components and `useEffect` dependencies see no change. Array items are matched by id, so reorders don't invalidate rows.

## Benchmarks

The suite lives in `benchmark/` and compares the direct analogs on deterministic seeded trees:

```shell
npm run bench
```

Every timed operation includes a `structuredClone` of `next` — this library mutates `next` in place, so a fresh input is required per op; the identical clone cost is added to every participant to keep the comparison uniform.

`gattai-merge` is timed in a deep-array configuration — the built-in `arrays: 'merge'` for trees plus the merge-by-id array function from its own README for id-keyed lists. Its default `arrays: 'replace'` never deep-compares arrays (a plain `slice()`), so it does strictly less work than every sharing participant and is not a comparable workload.

Snapshot (2026-09-04, Node v24.19.0, Apple M2 Max; ops/sec, median):

| Scenario | optimize-immutable-update | replaceEqualDeep | gattai-merge | emerge | deepmerge | dequal+keep-prev |
|---|---|---|---|---|---|---|
| tiny tree (69 nodes) / unchanged | 23 211 | 22 792 (−1.8%) | 26 403 (+13.7%) | 23 739 (+2.3%) | 9 848 (−57.6%) | 28 402 (+22.4%) |
| tiny tree / one leaf changed | 23 279 | 22 835 (−1.9%) | 26 316 (+13.0%) | 23 599 (+1.4%) | 9 784 (−58.0%) | 28 336 (+21.7%) |
| mid tree (4.2k nodes) / unchanged | 340 | 342 (+0.6%) | 383 (+12.6%) | 348 (+2.4%) | 137 (−59.7%) | 413 (+21.5%) |
| mid tree / one leaf changed | 342 | 339 (−0.9%) | 381 (+11.4%) | 344 (+0.6%) | 138 (−59.6%) | 417 (+21.9%) |
| mid tree / half leaves changed | 491 | 335 (−31.8%) | 321 (−34.6%) | 335 (−31.8%) | 137 (−72.1%) | 539 (+9.8%) |
| big tree (44k nodes) / one leaf changed | 32 | 32 (+0.0%) | 36 (+12.5%) | 32 (+0.0%) | 12 (−62.5%) | 48 (+50.0%) |
| id array (1k items) / same order | 871 | 831 (−4.6%) | 847 (−2.8%) | 896 (+2.9%) | 452 (−48.1%) | 1 028 (+18.0%) |
| id array (1k items) / reversed | 808 | 850 (+5.2%) | 838 (+3.7%) | 897 (+11.0%) | 453 (−43.9%) | 1 310 (+62.1%) |

Deltas are relative to `optimize-immutable-update` (positive — faster).

Reading notes:

- On identical workloads `optimizeImmutableUpdate` performs on par with TanStack's `replaceEqualDeep`, and ahead of it when half the leaves change — it reuses `next` in place instead of building fresh copies.
- `gattai-merge` with the comparable deep-array workload lands within −35%…+14% of this library — faster only on object-heavy trees, slower where mass changes or id-keyed lists dominate. Its default `arrays: 'replace'` is faster still, but never deep-compares arrays: less compare work, less reuse delivered.
- In the reversed-array scenario all sharing libraries take comparable time, but only this library returns all 1 000 item references from `prev` — `replaceEqualDeep`'s positional compare invalidates every row downstream.
- `dequal + keep-prev` is the cheap root-only pattern: it returns either `prev` or `next` wholesale and never stabilizes deep subtrees.
- Microbenchmarks measure the merge pass only — not the re-renders, selector recomputations and allocations each reused reference saves downstream. Run your own numbers before drawing conclusions.

## Development

```shell
npm install         # install dependencies
npm run ts-check    # TypeScript check
npm run lint:ci     # ESLint (flat config)
npm run test        # Jest with coverage (100%)
npm run build       # Build to ./dist (CJS + declarations)
npm run bench       # Benchmarks against the alternatives
npm run release     # Publish via np
```

## Motivation

- [How to get altered tree from immutable tree, maximising reuse of nodes](https://stackoverflow.com/questions/41298577/how-to-get-altered-tree-from-immutable-tree-maximising-reuse-of-nodes)
- [Performance of programs using immutable objects](https://stackoverflow.com/questions/71455345/performance-of-programs-using-immutable-objects)

---

Copyright (c) 2018-present Dmitry Karpunin <koderfunk@gmail.com>
