import { isPlainObject } from 'is-plain-object'

type IOptimizeImmutableUpdateIdStructure =
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

  if (next === prev) {
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

  if (isPlainObject(next)) {
    return optimizeImmutableObjectUpdate(
      prev as Record<string, unknown>,
      next as Record<string, unknown>,
      idStructure as Record<string, IOptimizeImmutableUpdateIdStructure> | undefined,
    ) as S
  }

  return next
}

function optimizeImmutableObjectUpdate<O extends {}>(
  prev: O,
  next: O,
  idStructure?: Record<string, IOptimizeImmutableUpdateIdStructure>,
): O {
  const nextKeys = Object.keys(next) as (keyof typeof next)[]
  const prevKeys = Object.keys(prev) as (keyof typeof prev)[]

  let reallyChanged = nextKeys.length !== prevKeys.length
  let key: keyof O
  let prevValue: O[keyof O]
  let immutedValue: O[keyof O]

  for (key of nextKeys) {
    prevValue = prev[key]
    immutedValue = optimizeImmutableUpdate(prevValue, next[key], idStructure?.[key as string])

    if (immutedValue === prevValue) {
      next[key] = immutedValue
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
  let idValue: string | number | undefined

  const idName = typeof idStructure === 'string'
    ? idStructure
    : next.length > 0
      ? predictIdName(DEFAULT_ID_NAME, next) || predictIdName(DEFAULT_UUID_NAME, next)
      : undefined

  const prevMap = idName && next.length > 0
    ? new Map(prev.map((prevMapValue) => [
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (prevMapValue as Record<typeof idName, string | number>)[idName]!,
      prevMapValue,
    ]))
    : undefined

  let index: number
  let nextValue: unknown

  for ([index, nextValue] of next.entries()) {
    prevValue = prev[index]

    if (idName && nextValue) {
      idValue = (nextValue as Record<string, string | number>)[idName]

      if (idValue && (!prevValue || (prevValue as Record<string, unknown>)[idName] !== idValue)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        prevValue = prevMap!.get(idValue)

        if (!reallyChanged) {
          reallyChanged = true
        }
      }
    }

    immutedValue = optimizeImmutableUpdate(
      prevValue,
      nextValue,
      Array.isArray(idStructure)
        ? idStructure[index]
        : undefined,
    )

    if (immutedValue === prevValue) {
      next[index] = immutedValue
    } else if (!reallyChanged) {
      reallyChanged = true
    }
  }

  return reallyChanged ? next : prev
}

function predictIdName<T extends unknown[]>(idName: string, array: T): string | undefined {
  const [first] = array

  return first && typeof first === 'object' && idName in first
    ? idName
    : undefined
}

type SimpleType =
  | boolean
  | number
  | string
  | Function // eslint-disable-line @typescript-eslint/ban-types
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
