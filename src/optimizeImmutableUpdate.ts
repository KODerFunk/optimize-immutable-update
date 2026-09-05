import { isPlainObject } from 'is-plain-object'

export type IOptimizeImmutableUpdateIdStructure =
  | undefined
  | string
  | IOptimizeImmutableUpdateIdStructure[]
  | { [key: string]: IOptimizeImmutableUpdateIdStructure }

export default function optimizeImmutableUpdate<S>(
  prev: S | undefined,
  next: S,
  idStructure?: IOptimizeImmutableUpdateIdStructure,
): S {
  if (prev === undefined) {
    return next
  }

  // Object.is reuses prev for equal NaN; +0 vs -0 falls through and counts as a change
  if (Object.is(next, prev)) {
    return prev
  }

  if (isSimpleType(next) || isSimpleType(prev)) {
    return next
  }

  if (Array.isArray(next)) {
    if (!Array.isArray(prev)) {
      return next
    }

    return optimizeImmutableArrayUpdate(
      prev,
      next,
      idStructure,
    )
  }

  if (next instanceof Date) {
    return prev instanceof Date && next.getTime() === prev.getTime()
      ? prev
      : next
  }

  if (next instanceof RegExp) {
    // lastIndex is mutable execution state, not part of the value
    return prev instanceof RegExp && next.source === prev.source && next.flags === prev.flags
      ? prev
      : next
  }

  if (isPlainObject(next)) {
    if (!isPlainObject(prev)) {
      return next
    }

    return optimizeImmutableObjectUpdate(prev, next, idStructure)
  }

  return next
}

function optimizeImmutableObjectUpdate<O extends {}>(
  prev: O,
  next: O,
  idStructure?: IOptimizeImmutableUpdateIdStructure,
): O {
  // only the object form is meaningful here;
  // a leaked string/array form would be indexed like a Record ('code'['0'] leaks 'c')
  const idStructureRecord = typeof idStructure === 'object' && !Array.isArray(idStructure)
    ? idStructure
    : undefined
  const nextKeys = getOwnEnumerableKeys(next)
  const prevKeys = getOwnEnumerableKeys(prev)

  let reallyChanged = nextKeys.length !== prevKeys.length
  let key: keyof O
  let prevValue: O[keyof O]
  let immutedValue: O[keyof O]

  for (key of nextKeys) {
    prevValue = prev[key]
    immutedValue = optimizeImmutableUpdate(prevValue, next[key], idStructureRecord?.[key as string])

    if (Object.is(immutedValue, prevValue)) {
      try {
        next[key] = immutedValue
      } catch {
        // non-writable slot (frozen/sealed/getter-only `next`): the value there is
        // already correct, only the prev-reference reuse write is lost
      }
    } else if (!reallyChanged) {
      reallyChanged = true
    }
  }

  return reallyChanged ? next : prev
}

const DEFAULT_ID_NAME = 'id'
const DEFAULT_UUID_NAME = 'uuid'

function optimizeImmutableArrayUpdate<A extends unknown[]>(
  prev: A,
  next: A,
  idStructure?: IOptimizeImmutableUpdateIdStructure,
): A {
  let reallyChanged = next.length !== prev.length
  let prevValue: unknown
  let immutedValue: unknown
  let idValue: string | number | null | undefined

  const idName = typeof idStructure === 'string'
    ? idStructure
    : next.length > 0
      ? predictIdName(DEFAULT_ID_NAME, next) || predictIdName(DEFAULT_UUID_NAME, next)
      : undefined

  let prevMap: Map<string | number, unknown> | undefined

  let index: number
  let nextValue: unknown

  for ([index, nextValue] of next.entries()) {
    prevValue = prev[index]

    // a hole must stay a hole: writing it back would materialize it as an explicit `undefined`
    if (Object.hasOwn(next, index)) {
      if (idName && nextValue) {
        idValue = (nextValue as Record<string, string | number | null | undefined>)[idName]

        // 0, '' and 0n are valid ids, only null/undefined mean the item has no id
        if (
          idValue !== undefined
          && idValue !== null
          && (!prevValue || (prevValue as Record<string, unknown>)[idName] !== idValue)
        ) {
          // built lazily: fully positional arrays never pay for the map
          prevMap ??= new Map(prev.map((prevMapValue) => [
            (prevMapValue as Record<string, string | number>)[idName],
            prevMapValue,
          ]))
          prevValue = prevMap.get(idValue)
          reallyChanged = true
        }
      }

      immutedValue = optimizeImmutableUpdate(
        prevValue,
        nextValue,
        Array.isArray(idStructure)
          ? idStructure[index]
          : undefined,
      )

      if (Object.is(immutedValue, prevValue)) {
        try {
          next[index] = immutedValue
        } catch {
          // non-writable slot (frozen/sealed/getter-only `next`): the value there is
          // already correct, only the prev-reference reuse write is lost
        }
      } else if (!reallyChanged) {
        reallyChanged = true
      }
    } else {
      // a value replaced by a hole is a change, not an equal shape
      reallyChanged ||= prevValue !== undefined
    }
  }

  return reallyChanged ? next : prev
}

function predictIdName(idName: string, array: unknown[]): string | undefined {
  const [first] = array

  return first && typeof first === 'object' && Object.hasOwn(first, idName)
    ? idName
    : undefined
}

function getOwnEnumerableKeys<O extends {}>(value: O): (keyof O)[] {
  // Object.keys skips symbol keys, so a symbol-only change would silently return prev
  const symbolKeys = Object.getOwnPropertySymbols(value)
    .filter(symbolKey => Object.getOwnPropertyDescriptor(value, symbolKey)?.enumerable === true)

  return [...Object.keys(value), ...symbolKeys] as (keyof O)[]
}

type SimpleType =
  | boolean
  | number
  | string
  | Function
  | null
  | undefined

function isSimpleType(value: unknown): value is SimpleType {
  if (value === undefined || value === null) {
    return true
  }

  // https://www.measurethat.net/Benchmarks/Show/22397/0/typeof-cascade-vs-typeof-in-var
  const type = typeof value

  return type !== 'object'
    && type !== 'symbol'
  // return type === 'boolean'
  //   || type === 'number'
  //   || type === 'string'
  //   || type === 'function'
}
