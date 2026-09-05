// Performance comparison against the direct analogs (README → Alternatives).
//
// Fairness notes:
// - `optimizeImmutableUpdate` mutates `next` in place, so every timed op clones
//   the `next` template; the identical `structuredClone` cost is added to every
//   participant to keep the comparison uniform.
// - `deepmerge` merges reversed arrays index-wise, so its output for the reorder
//   scenario is semantically wrong; it is timed here only as a non-sharing baseline.
// - `gattai-merge` is timed in a deep-array configuration — the built-in
//   `arrays: 'merge'` for plain trees plus the merge-by-id array function from
//   its own README for id-keyed lists — because the default `arrays: 'replace'`
//   never deep-compares arrays (a plain `slice()`): less work, not a comparable
//   workload. Index-wise `'merge'` is semantically wrong on reordered arrays
//   (like deepmerge above) and merge-by-id keeps the target order — timed for
//   workload parity, not output equality.
import { Bench } from 'tinybench'
import { createRequire } from 'node:module'
import os from 'node:os'
import { countLeaves, countNodes, makeIdArray, makeTree, reversed, withChanges } from './data.mjs'

const require = createRequire(import.meta.url)

const oiu = require('../dist/optimizeImmutableUpdate.js').default
const { replaceEqualDeep } = require('@tanstack/query-core')
const { gattaiMerge } = require('gattai-merge')
const { patch } = require('emerge')
const deepmerge = require('deepmerge')
const { dequal } = require('dequal')

// gattai's documented merge-by-id `ArrayMergeFunction` (README → "Custom array
// merge function"), with a replace fallback for arrays whose items carry no `id`
// (e.g. the tag string lists inside items).
const mergeById = {
  arrays: (target, source, { merge, clone }) => {
    const [first] = target

    if (target.length === 0 || typeof first !== 'object' || first === null || !('id' in first)) {
      return [...source]
    }

    const map = new Map()

    for (const item of target) map.set(item.id, item)
    for (const item of source) {
      map.set(item.id, map.has(item.id) ? merge(map.get(item.id), item) : clone(item))
    }
    return [...map.values()]
  },
}

const deepArrays = { arrays: 'merge' }

const libs = [
  { label: 'optimize-immutable-update', fn: (prev, next) => oiu(prev, next) },
  { label: 'replaceEqualDeep', fn: (prev, next) => replaceEqualDeep(prev, next) },
  { label: 'gattai-merge', fn: (prev, next, keyed) => gattaiMerge(prev, next, keyed ? mergeById : deepArrays) },
  { label: 'emerge', fn: (prev, next) => patch(prev, next) },
  { label: 'deepmerge', fn: (prev, next) => deepmerge(prev, next) },
  { label: 'dequal+keep-prev', fn: (prev, next) => (dequal(prev, next) ? prev : next) },
]

function versionOf(name) {
  try {
    return require(`${name}/package.json`).version
  } catch {
    return 'n/a'
  }
}

function scenario(bench, name, prev, next, keyed = false) {
  for (const lib of libs) {
    bench.add(`${name} :: ${lib.label}`, () => {
      const freshNext = structuredClone(next)

      return lib.fn(prev, freshNext, keyed)
    })
  }
}

const tiny = makeTree(42, 10, 6)
const mid = makeTree(42, 1_000, 9)
const big = makeTree(42, 10_000, 14)
const idArray = makeIdArray(7, 1_000)

const ownVersion = require('../package.json').version

console.log(`# benchmarks — ${new Date().toISOString().slice(0, 10)}`)
console.log(`# node ${process.version} — ${os.cpus()[0].model}`)
console.log(`# participants: optimize-immutable-update ${ownVersion}, replaceEqualDeep ${versionOf('@tanstack/query-core')}, gattai-merge ${versionOf('gattai-merge')} (deep arrays configuration), emerge ${versionOf('emerge')}, deepmerge ${versionOf('deepmerge')}, dequal ${versionOf('dequal')}`)
console.log(`# tree sizes (object/array nodes / leaves): tiny ${countNodes(tiny)}/${countLeaves(tiny)}, mid ${countNodes(mid)}/${countLeaves(mid)}, big ${countNodes(big)}/${countLeaves(big)}; id-array: 1000 items`)

const bench = new Bench({ time: 300, warmupTime: 100 })

scenario(bench, 'tiny tree / unchanged', tiny, withChanges(tiny, 1, 0))
scenario(bench, 'tiny tree / one leaf changed', tiny, withChanges(tiny, 2, 1))
scenario(bench, 'mid tree / unchanged', mid, withChanges(mid, 3, 0))
scenario(bench, 'mid tree / one leaf changed', mid, withChanges(mid, 4, 1))
scenario(bench, 'mid tree / half leaves changed', mid, withChanges(mid, 5, Math.round(countLeaves(mid) / 2)))
scenario(bench, 'big tree / one leaf changed', big, withChanges(big, 6, 1))
scenario(bench, 'id array 1k / same order', idArray, withChanges(idArray, 8, 0), true)
scenario(bench, 'id array 1k / reversed', idArray, reversed(idArray), true)

await bench.run()
console.table(bench.table())
