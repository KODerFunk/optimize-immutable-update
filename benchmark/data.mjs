// Deterministic data generators for the benchmark suite.
// A seeded PRNG keeps every run — and every participant — on identical inputs.

function mulberry32(seed) {
  let a = seed >>> 0

  return function random() {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const KEY_NAMES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']

export function countLeaves(value) {
  if (value === null || typeof value !== 'object') return 1
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countLeaves(item), 0)
  return Object.values(value).reduce((sum, item) => sum + countLeaves(item), 0)
}

export function countNodes(value) {
  if (value === null || typeof value !== 'object') return 0
  if (Array.isArray(value)) return 1 + value.reduce((sum, item) => sum + countNodes(item), 0)
  return 1 + Object.values(value).reduce((sum, item) => sum + countNodes(item), 0)
}

/**
 * A plain-object tree: nested objects, arrays of `{ id, name, score, tags? }`
 * items, numeric and string leaves. Approximately `targetNodes` object/array
 * nodes deep-bounded by the recursion depth.
 */
export function makeTree(seed, targetNodes, maxDepth = 6) {
  const random = mulberry32(seed)
  let nodes = 0
  let itemId = 0

  function makeLeaf() {
    return random() < 0.5
      ? Math.floor(random() * 1_000_000)
      : `str-${Math.floor(random() * 1_000_000)}`
  }

  function makeItem(depth) {
    itemId += 1
    const item = { id: itemId, name: `item-${itemId}`, score: Math.floor(random() * 1_000) }
    if (random() < 0.5) item.tags = [`tag-${Math.floor(random() * 100)}`]
    if (depth > 0 && nodes < targetNodes) item.details = makeBranch(depth - 1)
    return item
  }

  function makeBranch(depth) {
    if (nodes >= targetNodes || depth === 0) return makeLeaf()

    nodes += 1
    if (random() < 0.3) {
      const length = 4 + Math.floor(random() * 8)
      return Array.from({ length }, () => makeItem(depth - 1))
    }

    const branch = {}
    const keyCount = 3 + Math.floor(random() * 3)
    for (let k = 0; k < keyCount; k += 1) {
      branch[`${KEY_NAMES[k % KEY_NAMES.length]}${k}`] = makeBranch(depth - 1)
    }
    return branch
  }

  return makeBranch(maxDepth)
}

function collectLeafPaths(value, prefix, out) {
  if (value === null || typeof value !== 'object') {
    out.push(prefix)
    return
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) collectLeafPaths(value[i], [...prefix, i], out)
    return
  }
  for (const key of Object.keys(value)) collectLeafPaths(value[key], [...prefix, key], out)
}

function pickN(list, n, random) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(n, copy.length))
}

/**
 * `next` template: a deep clone of `prev` with `changesCount` leaves replaced
 * by new values (deterministic given `seed`).
 */
export function withChanges(prev, seed, changesCount) {
  const next = structuredClone(prev)
  const paths = []
  collectLeafPaths(next, [], paths)

  const targets = pickN(paths, changesCount, mulberry32(seed))
  for (const path of targets) {
    const holder = path.slice(0, -1).reduce((node, key) => node[key], next)
    const key = path[path.length - 1]
    const old = holder[key]
    holder[key] = typeof old === 'number' ? old + 1 : `${old}-changed`
  }
  return next
}

/** A dedicated keyed-list tree: ~flat array of `length` items with `id`. */
export function makeIdArray(seed, length) {
  const random = mulberry32(seed)

  return {
    meta: { title: 'list', version: Math.floor(random() * 100) },
    items: Array.from({ length }, (_, i) => ({
      id: i + 1,
      name: `item-${i + 1}`,
      score: Math.floor(random() * 1_000),
      tags: [`tag-${Math.floor(random() * 50)}`],
    })),
  }
}

/** `next` with the item order reversed — ids intact, contents deep-equal. */
export function reversed(prev) {
  const next = structuredClone(prev)
  next.items.reverse()
  return next
}
