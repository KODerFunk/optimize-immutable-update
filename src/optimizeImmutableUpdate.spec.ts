/* eslint-disable id-length, max-classes-per-file, max-lines, max-lines-per-function, max-statements, no-sparse-arrays, @typescript-eslint/no-magic-numbers, unicorn/no-unsafe-property-key */
import optimizeImmutableUpdate from './optimizeImmutableUpdate'

describe('optimizeImmutableUpdate', () => {
  it('works with holes', () => {
    expect(optimizeImmutableUpdate(null, undefined)).toStrictEqual(undefined)
    expect(optimizeImmutableUpdate(undefined, null)).toStrictEqual(null)
    expect(optimizeImmutableUpdate(undefined, 0)).toStrictEqual(0)
    expect(optimizeImmutableUpdate(undefined, '')).toStrictEqual('')
  })

  it('works with empty objects', () => {
    const prevObject = {}
    const nextObject = {}

    expect(prevObject === nextObject).toEqual(false)
    expect(optimizeImmutableUpdate(null, nextObject) === nextObject).toEqual(true)
    expect(optimizeImmutableUpdate(prevObject, nextObject) === prevObject).toEqual(true)
    expect(optimizeImmutableUpdate(prevObject, null) === null).toEqual(true)
  })

  it('works with empty arrays', () => {
    const prevArray: unknown[] = []
    const nextArray: unknown[] = []

    expect(prevArray === nextArray).toEqual(false)
    expect(optimizeImmutableUpdate(null, nextArray) === nextArray).toEqual(true)
    expect(optimizeImmutableUpdate(prevArray, nextArray) === prevArray).toEqual(true)
    expect(optimizeImmutableUpdate(prevArray, null) === null).toEqual(true)
  })

  it('works with deep objects', () => {
    const prevObject = {
      remove: 'remove',
      untouched: {
        u: 5,
      },
      deep: {
        deepUntouched: {
          u: 7,
        },
        deeper: {
          a: 'z',
          b: 'y',
        } as Record<string, unknown>,
      },
    }
    const nextObject = {
      untouched: {
        u: 5,
      },
      deep: {
        deepUntouched: {
          u: 7,
        },
        deeper: {
          a: 'z',
          b: 'Y',
        } as Record<string, unknown>,
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)
    expect('remove' in optimizedNext).toEqual(false)

    expect(optimizedNext.untouched === prevObject.untouched).toEqual(true)
    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)
    expect(optimizedNext.deep.deepUntouched === prevObject.deep.deepUntouched).toEqual(true)
    expect(optimizedNext.deep.deepUntouched === nextObject.deep.deepUntouched).toEqual(true)
    expect(optimizedNext.deep.deeper === prevObject.deep.deeper).toEqual(false)
    expect(optimizedNext.deep.deeper === nextObject.deep.deeper).toEqual(true)
  })

  it('works with simple instances', () => {
    const stringDate1 = '2022-12-09T10:42'
    const stringDate2 = '2022-12-10T12:12'
    const prevObject = {
      untouched: {
        a: 'x',
        d: new Date(stringDate1),
      },
      deep: {
        deepUntouched: {
          a: 'y',
          d: new Date(stringDate1),
        },
        deeper: {
          a: 'z',
          d: new Date(stringDate1),
        } as Record<string, unknown>,
      },
    }
    const nextObject = {
      untouched: {
        a: 'x',
        d: new Date(stringDate1),
      },
      deep: {
        deepUntouched: {
          a: 'y',
          d: new Date(stringDate1),
        },
        deeper: {
          a: 'z',
          d: new Date(stringDate2),
        } as Record<string, unknown>,
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)
    expect('remove' in optimizedNext).toEqual(false)

    expect(optimizedNext.untouched === prevObject.untouched).toEqual(true)
    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)
    expect(optimizedNext.deep.deepUntouched === prevObject.deep.deepUntouched).toEqual(true)
    expect(optimizedNext.deep.deepUntouched === nextObject.deep.deepUntouched).toEqual(true)
    expect(optimizedNext.deep.deeper === prevObject.deep.deeper).toEqual(false)
    expect(optimizedNext.deep.deeper === nextObject.deep.deeper).toEqual(true)
  })

  it('works with RegExp instances', () => {
    const prevObject = { r: /ab/g }
    const nextObject = { r: /ab/g }

    expect(optimizeImmutableUpdate(prevObject, nextObject) === prevObject).toEqual(true)

    const prevRegExp = /ab/g
    const sameRegExp = /ab/g
    const changedRegExp = /ac/g
    const otherFlagsRegExp = /ab/i

    expect(optimizeImmutableUpdate(prevRegExp, sameRegExp) === prevRegExp).toEqual(true)
    expect(optimizeImmutableUpdate(prevRegExp, changedRegExp) === changedRegExp).toEqual(true)
    expect(optimizeImmutableUpdate(prevRegExp, otherFlagsRegExp) === otherFlagsRegExp).toEqual(true)
    expect(optimizeImmutableUpdate({} as unknown as RegExp, sameRegExp) === sameRegExp).toEqual(true)

    // lastIndex is mutable execution state, not part of the value
    const prevWithLastIndex = /ab/g
    const sameWithOtherLastIndex = /ab/g

    prevWithLastIndex.lastIndex = 2

    expect(optimizeImmutableUpdate(prevWithLastIndex, sameWithOtherLastIndex) === prevWithLastIndex).toEqual(true)
  })

  it('works with change object to array', () => {
    const prevObject = { id: 2, name: 'prev' }
    const nextArray = [prevObject]
    const optimizedNext = optimizeImmutableUpdate(
      prevObject as unknown as typeof nextArray,
      nextArray,
    )

    expect(optimizedNext === nextArray).toEqual(true)
  })

  it('works with symbols', () => {
    const prevSymbol = Symbol(42)
    const nextSymbol = Symbol(42) as unknown as typeof prevSymbol
    const optimizedSymbol = optimizeImmutableUpdate(prevSymbol, nextSymbol)

    expect(prevSymbol === nextSymbol).toEqual(false)
    expect(optimizedSymbol === nextSymbol).toEqual(true)
  })

  it('works with class instances', () => {
    class TestClass {
      constructor(public id: number, public name: string) {}
      getName = (): string => this.name
    }

    const prevInstance = new TestClass(42, 'prev')
    const sameInstance = new TestClass(42, 'prev')
    const nextInstance = new TestClass(42, 'next')

    expect(optimizeImmutableUpdate(prevInstance, sameInstance) === sameInstance).toEqual(true)
    expect(optimizeImmutableUpdate(prevInstance, nextInstance) === nextInstance).toEqual(true)
  })

  it('works with push & pop in deep array', () => {
    const prevObject = {
      deep: {
        deepUntouched: [
          { id: 7, name: 'untouched' },
        ],
        forPop: [
          { id: 3, name: 'forPop:third', subObject: { subField: 'subValue' } },
          { id: 7, name: 'forPop:deeper7' },
          { id: 1, name: 'forPop:primal' },
        ],
        forPush: [
          { id: 3, name: 'forPush:third', subObject: { subField: 'subValue' } },
          { id: 7, name: 'forPush:deeper7' },
          { id: 1, name: 'forPush:primal' },
        ],
      },
    }
    const nextObject = {
      deep: {
        deepUntouched: [
          { id: 7, name: 'untouched' },
        ],
        forPop: [
          { id: 3, name: 'forPop:third', subObject: { subField: 'subValue' } },
          { id: 7, name: 'forPop:deeper7' },
        ],
        forPush: [
          { id: 3, name: 'forPush:third', subObject: { subField: 'subValue' } },
          { id: 7, name: 'forPush:deeper7' },
          { id: 1, name: 'forPush:primal' },
          { id: 2, name: 'forPush:pushed' },
        ],
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)

    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)
    expect(optimizedNext.deep.deepUntouched === prevObject.deep.deepUntouched).toEqual(true)
    expect(optimizedNext.deep.deepUntouched === nextObject.deep.deepUntouched).toEqual(true)

    expect(optimizedNext.deep.forPush === prevObject.deep.forPush).toEqual(false)
    expect(optimizedNext.deep.forPush === nextObject.deep.forPush).toEqual(true)
    expect(prevObject.deep.forPush.length).toEqual(3)
    expect(optimizedNext.deep.forPush.length).toEqual(4)
    for (const [index, prevElement] of prevObject.deep.forPush.entries()) {
      expect(optimizedNext.deep.forPush[index] === prevElement).toEqual(true)
    }
    expect(optimizedNext.deep.forPush.at(-1) === nextObject.deep.forPush.at(-1)).toEqual(true)

    expect(optimizedNext.deep.forPop === prevObject.deep.forPop).toEqual(false)
    expect(optimizedNext.deep.forPop === nextObject.deep.forPop).toEqual(true)
    expect(prevObject.deep.forPop.length).toEqual(3)
    expect(optimizedNext.deep.forPop.length).toEqual(2)
    for (const [index, nextElement] of optimizedNext.deep.forPop.entries()) {
      expect(nextElement === prevObject.deep.forPop[index]).toEqual(true)
    }
  })

  it('works with insert & remove in deep arrays', () => {
    const prevObject = {
      deep: {
        forInsert: [
          { id: 3, name: 'forInsert:third', subObject: { subField: 'subValue' } },
          { id: 7, name: 'forInsert:deeper7' },
          { id: 1, name: 'forInsert:primal' },
        ],
        forRemove: [
          { uuid: '3', name: 'forRemove:third', subObject: { subField: 'subValue' } },
          { uuid: '7', name: 'forRemove:deeper7' },
          { uuid: '1', name: 'forRemove:primal' },
        ],
      },
    }
    const nextObject = {
      deep: {
        forInsert: [
          { id: 3, name: 'forInsert:third', subObject: { subField: 'subValue' } },
          { id: 2, name: 'forInsert:inserted' },
          { id: 7, name: 'forInsert:deeper7' },
          { id: 1, name: 'forInsert:primal' },
        ],
        forRemove: [
          { uuid: '3', name: 'forRemove:third', subObject: { subField: 'subValue' } },
          { uuid: '1', name: 'forRemove:primal' },
        ],
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)

    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)

    expect(optimizedNext.deep.forInsert === prevObject.deep.forInsert).toEqual(false)
    expect(optimizedNext.deep.forInsert === nextObject.deep.forInsert).toEqual(true)
    expect(prevObject.deep.forInsert.length).toEqual(3)
    expect(optimizedNext.deep.forInsert.length).toEqual(4)
    for (const prevElement of prevObject.deep.forInsert) {
      const nextValue = optimizedNext.deep.forInsert.find(({ id }) => id === prevElement.id)
      expect(nextValue === prevElement).toEqual(true)
    }

    expect(optimizedNext.deep.forRemove === prevObject.deep.forRemove).toEqual(false)
    expect(optimizedNext.deep.forRemove === nextObject.deep.forRemove).toEqual(true)
    expect(prevObject.deep.forRemove.length).toEqual(3)
    expect(optimizedNext.deep.forRemove.length).toEqual(2)
    for (const nextElement of optimizedNext.deep.forRemove) {
      const prevValue = prevObject.deep.forRemove.find(({ uuid }) => uuid === nextElement.uuid)
      expect(nextElement === prevValue).toEqual(true)
    }
  })

  it('works with insert & remove in deep arrays with custom id', () => {
    const prevObject = {
      deep: {
        deeper: [
          { customId: 3, name: 'deeper:third' },
          { customId: 7, name: 'deeper:deeper7' },
          { customId: 1, name: 'deeper:primal' },
        ],
      },
    }
    const nextObject = {
      deep: {
        deeper: [
          { customId: 3, name: 'deeper:third' },
          { customId: 2, name: 'deeper:REPLACED' },
          { customId: 5, name: 'deeper:INSERTED' },
          { customId: 1, name: 'deeper:primal' },
        ],
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject, {
      deep: {
        deeper: 'customId',
      },
    })

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)

    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)

    expect(optimizedNext.deep.deeper === prevObject.deep.deeper).toEqual(false)
    expect(optimizedNext.deep.deeper === nextObject.deep.deeper).toEqual(true)
    expect(prevObject.deep.deeper.length).toEqual(3)
    expect(optimizedNext.deep.deeper.length).toEqual(4)

    const [
      prev0,
      prev1,
      prev2,
    ] = prevObject.deep.deeper
    const [
      next0,
      next1,
      next2,
      next3,
    ] = optimizedNext.deep.deeper

    expect(next0 === prev0).toEqual(true)
    expect(next1 === prev1).toEqual(false)
    expect(next2 === prev2).toEqual(false)
    expect(next3 === prev2).toEqual(true)
  })

  it('works with insert & remove in deep arrays of arrays with custom id', () => {
    const prevObject = {
      deep: {
        deeper: [
          [
            { uuid: 3, name: 'deeper:0:third' },
            { uuid: 7, name: 'deeper:0:deeper7' },
            { uuid: 1, name: 'deeper:0:primal' },
          ],
          [
            { customId: 3, name: 'deeper:1:third' },
            { customId: 7, name: 'deeper:1:deeper7' },
            { customId: 1, name: 'deeper:1:primal' },
          ],
        ],
      },
    }
    const nextObject = {
      deep: {
        deeper: [
          [
            { uuid: 3, name: 'deeper:0:third' },
            { uuid: 2, name: 'deeper:0:REPLACED' },
            { uuid: 5, name: 'deeper:0:INSERTED' },
            { uuid: 1, name: 'deeper:0:primal' },
          ],
          [
            { customId: 3, name: 'deeper:1:third' },
            { customId: 2, name: 'deeper:1:REPLACED' },
            { customId: 5, name: 'deeper:1:INSERTED' },
            { customId: 1, name: 'deeper:1:primal' },
          ],
        ],
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject, {
      deep: {
        deeper: [
          undefined,
          'customId',
        ],
      },
    })

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)

    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)

    expect(optimizedNext.deep.deeper === prevObject.deep.deeper).toEqual(false)
    expect(optimizedNext.deep.deeper[0] === prevObject.deep.deeper[0]).toEqual(false)
    expect(optimizedNext.deep.deeper[1] === prevObject.deep.deeper[1]).toEqual(false)
    expect(optimizedNext.deep.deeper === nextObject.deep.deeper).toEqual(true)
    expect(prevObject.deep.deeper.length).toEqual(2)
    expect(prevObject.deep.deeper[0].length).toEqual(3)
    expect(prevObject.deep.deeper[1].length).toEqual(3)
    expect(optimizedNext.deep.deeper.length).toEqual(2)
    expect(optimizedNext.deep.deeper[0].length).toEqual(4)
    expect(optimizedNext.deep.deeper[1].length).toEqual(4)

    const [
      [
        prev00,
        prev01,
        prev02,
      ],
      [
        prev10,
        prev11,
        prev12,
      ],
    ] = prevObject.deep.deeper
    const [
      [
        next00,
        next01,
        next02,
        next03,
      ],
      [
        next10,
        next11,
        next12,
        next13,
      ],
    ] = optimizedNext.deep.deeper

    expect(next00 === prev00).toEqual(true)
    expect(next01 === prev01).toEqual(false)
    expect(next02 === prev02).toEqual(false)
    expect(next03 === prev02).toEqual(true)

    expect(next10 === prev10).toEqual(true)
    expect(next11 === prev11).toEqual(false)
    expect(next12 === prev12).toEqual(false)
    expect(next13 === prev12).toEqual(true)
  })

  it('works with mixed changes in deep arrays', () => {
    const prevObject = {
      deep: {
        deeper: [
          { id: 3, name: 'deeper:third', subObject: { subField: 'subValue' }, subObject2: { subField: 'subValue' } },
          { id: 7, name: 'deeper:deeper7' },
          { id: 1, name: 'deeper:primal' },
        ],
      },
    }
    const nextObject = {
      deep: {
        deeper: [
          { id: 3, name: 'deeper:third', subObject: { subField: 'CHANGED' }, subObject2: { subField: 'subValue' } },
          null,
          { id: 1, name: 'deeper:primal' },
        ],
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)

    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)

    expect(optimizedNext.deep.deeper === prevObject.deep.deeper).toEqual(false)
    expect(optimizedNext.deep.deeper === nextObject.deep.deeper).toEqual(true)
    expect(prevObject.deep.deeper.length).toEqual(3)
    expect(optimizedNext.deep.deeper.length).toEqual(3)

    const [
      prev0,
      prev1,
      prev2,
    ] = prevObject.deep.deeper
    const [
      next0,
      next1,
      next2,
    ] = optimizedNext.deep.deeper

    expect(next0 === prev0).toEqual(false)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(next0!.subObject === prev0.subObject).toEqual(false)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(next0!.subObject2 === prev0.subObject2).toEqual(true)
    expect(next1 === prev1).toEqual(false)
    expect(next2 === prev2).toEqual(true)
  })

  it('works with swap in deep arrays', () => {
    const prevObject = {
      deep: {
        deeper: [
          { id: 1, name: 'deeper:primal' },
          { id: 3, name: 'deeper:third' },
          { id: 7, name: 'deeper:deeper7' },
        ],
      },
    }
    const nextObject = {
      deep: {
        deeper: [
          { id: 7, name: 'deeper:deeper7' },
          { id: 1, name: 'deeper:primal' },
          { id: 3, name: 'deeper:third' },
        ],
      },
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === prevObject).toEqual(false)
    expect(optimizedNext === nextObject).toEqual(true)

    expect(optimizedNext.deep === prevObject.deep).toEqual(false)
    expect(optimizedNext.deep === nextObject.deep).toEqual(true)

    expect(optimizedNext.deep.deeper === prevObject.deep.deeper).toEqual(false)
    expect(optimizedNext.deep.deeper === nextObject.deep.deeper).toEqual(true)
    expect(prevObject.deep.deeper.length).toEqual(3)
    expect(optimizedNext.deep.deeper.length).toEqual(3)

    const [
      prev0,
      prev1,
      prev2,
    ] = prevObject.deep.deeper
    const [
      next0,
      next1,
      next2,
    ] = optimizedNext.deep.deeper

    expect(next0 === prev2).toEqual(true)
    expect(next1 === prev0).toEqual(true)
    expect(next2 === prev1).toEqual(true)
  })

  it('stabilizes NaN values', () => {
    const prevObject = { a: NaN, nested: { b: NaN } }
    const nextObject = { a: NaN, nested: { b: NaN } }

    expect(optimizeImmutableUpdate(prevObject, nextObject) === prevObject).toEqual(true)

    const prevArray = [NaN]
    const nextArray = [NaN]

    expect(optimizeImmutableUpdate(prevArray, nextArray) === prevArray).toEqual(true)

    const changedNextObject = { a: 1, nested: { b: NaN } }

    expect(optimizeImmutableUpdate(prevObject, changedNextObject) === changedNextObject).toEqual(true)
  })

  it('works with signed zero', () => {
    const prevObject = { a: 0 }
    const nextObject = { a: -0 }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext === nextObject).toEqual(true)
    expect(Object.is(optimizedNext.a, -0)).toEqual(true)
  })

  it('returns next when prev kind differs from plain object', () => {
    const emptyObject: Record<string, unknown> = {}

    expect(optimizeImmutableUpdate([] as unknown as typeof emptyObject, emptyObject) === emptyObject).toEqual(true)
    expect(optimizeImmutableUpdate(new Date(42) as unknown as typeof emptyObject, emptyObject) === emptyObject).toEqual(true)

    class TestClass {
      a = 1
    }

    const plainObject = { a: 1 }
    const optimizedInstance = optimizeImmutableUpdate(new TestClass(), plainObject)

    expect(optimizedInstance === plainObject).toEqual(true)
    expect(optimizedInstance instanceof TestClass).toEqual(false)
  })

  it('works with symbol keys', () => {
    const symbolKey = Symbol('symbolKey')
    const prevObject = { a: 1 }
    const nextObject = { a: 1, [symbolKey]: 'value' }

    expect(optimizeImmutableUpdate(prevObject, nextObject) === nextObject).toEqual(true)
    expect(nextObject[symbolKey]).toEqual('value')

    const prevWithSymbolObject = { a: 1, [symbolKey]: { deep: 1 } }
    const nextWithSymbolObject = { a: 1, [symbolKey]: { deep: 1 } }

    expect(optimizeImmutableUpdate(prevWithSymbolObject, nextWithSymbolObject) === prevWithSymbolObject).toEqual(true)

    const nonEnumerableSymbolKey = Symbol('nonEnumerable')
    const nextNonEnumerableObject = { a: 1 }

    Object.defineProperty(nextNonEnumerableObject, nonEnumerableSymbolKey, { value: 'ignored', enumerable: false })

    // non-enumerable symbol keys are invisible, mirroring Object.keys semantics
    expect(optimizeImmutableUpdate(prevObject, nextNonEnumerableObject) === prevObject).toEqual(true)
  })

  it('works with falsy and null ids in arrays', () => {
    const prevObject = {
      zero: [{ id: 0, v: 'a' }, { id: 1, v: 'b' }],
      emptyString: [{ id: '', v: 'a' }, { id: 'x', v: 'b' }],
    }
    const nextObject = {
      zero: [{ id: 1, v: 'b' }, { id: 0, v: 'a' }],
      emptyString: [{ id: 'x', v: 'b' }, { id: '', v: 'a' }],
    }

    const optimizedNext = optimizeImmutableUpdate(prevObject, nextObject)

    expect(optimizedNext).toStrictEqual(nextObject)
    expect(optimizedNext === nextObject).toEqual(true)
    expect(optimizedNext.zero[0] === prevObject.zero[1]).toEqual(true)
    expect(optimizedNext.zero[1] === prevObject.zero[0]).toEqual(true)
    expect(optimizedNext.emptyString[0] === prevObject.emptyString[1]).toEqual(true)
    expect(optimizedNext.emptyString[1] === prevObject.emptyString[0]).toEqual(true)

    const nullIdPrevArray = [{ id: null, v: 'a' }]
    const nullIdNextArray = [{ id: null, v: 'a' }]

    expect(optimizeImmutableUpdate(nullIdPrevArray, nullIdNextArray) === nullIdPrevArray).toEqual(true)

    const mixedPrevArray = [{ id: 1, v: 'a' }, { v: 'no-id' }]
    const mixedNextArray = [{ id: 1, v: 'a' }, { v: 'no-id' }]

    expect(optimizeImmutableUpdate(mixedPrevArray, mixedNextArray) === mixedPrevArray).toEqual(true)
  })

  it('keeps holes in sparse arrays instead of materializing them', () => {
    const prevHoleyArray = [1, , 3]
    const nextHoleyArray = [1, , 3]

    expect(optimizeImmutableUpdate(prevHoleyArray, nextHoleyArray) === prevHoleyArray).toEqual(true)

    const prevWithChangeArray = [1, , 3]
    const nextWithChangeArray = [1, , 4]
    const optimizedWithChange = optimizeImmutableUpdate(prevWithChangeArray, nextWithChangeArray)

    expect(optimizedWithChange === nextWithChangeArray).toEqual(true)
    expect(Object.hasOwn(nextWithChangeArray, 1)).toEqual(false)
    expect(Object.keys(nextWithChangeArray)).toStrictEqual(['0', '2'])

    // a value replaced by a hole is a change, not an equal shape
    const prevValueArray = [1, 2, 3]
    const nextHoleArray = [1, , 3]

    expect(optimizeImmutableUpdate(prevValueArray, nextHoleArray) === nextHoleArray).toEqual(true)

    const prevHoleArray = [1, , 3]
    const nextValueArray = [1, 2, 3]

    expect(optimizeImmutableUpdate(prevHoleArray, nextValueArray) === nextValueArray).toEqual(true)
  })

  it('degrades gracefully when next is not writable', () => {
    const prevObject = { deep: { a: 1 }, other: { b: 2 } }
    const nextFrozenObject = Object.freeze({ deep: { a: 1 }, other: { b: 2 } })

    // a deep-equal frozen next still gets the perfect answer
    expect(optimizeImmutableUpdate(prevObject, nextFrozenObject) === prevObject).toEqual(true)

    const prevChangedObject = { deep: { a: 1 } }
    const nextFrozenChangedObject = Object.freeze({ deep: { a: 2 } })

    expect(optimizeImmutableUpdate(prevChangedObject, nextFrozenChangedObject) === nextFrozenChangedObject).toEqual(true)
    expect(nextFrozenChangedObject.deep === prevChangedObject.deep).toEqual(false)

    // sealed objects keep their existing slots writable, so reuse keeps working
    const prevForSealedObject = { deep: { a: 1 } }
    const nextSealedObject = Object.seal({ deep: { a: 1 } })

    expect(optimizeImmutableUpdate(prevForSealedObject, nextSealedObject) === prevForSealedObject).toEqual(true)
    expect(nextSealedObject.deep === prevForSealedObject.deep).toEqual(true)

    const prevArray = [{ id: 1, v: 'a' }, { id: 2, v: 'b' }]
    const nextFrozenArray = Object.freeze([{ id: 1, v: 'a' }, { id: 2, v: 'b' }])

    expect(optimizeImmutableUpdate(prevArray, nextFrozenArray) === prevArray).toEqual(true)

    // getter-only enumerable slots cannot take the reuse write either
    const getterPrevObject = { deep: { a: 1 } }
    const getterNextObject = {} as { deep: { a: number } }

    Object.defineProperty(getterNextObject, 'deep', {
      get: () => ({ a: 1 }),
      enumerable: true,
    })

    expect(optimizeImmutableUpdate(getterPrevObject, getterNextObject) === getterPrevObject).toEqual(true)
  })

  it('ignores non-object id structure for object trees', () => {
    const prevObject = { users: [{ id: 1, name: 'Ann' }] }
    const nextObject = { users: [{ id: 1, name: 'Ann' }] }

    expect(optimizeImmutableUpdate(prevObject, nextObject, 'id') === prevObject).toEqual(true)
    expect(optimizeImmutableUpdate(prevObject, nextObject, ['id']) === prevObject).toEqual(true)
    expect(optimizeImmutableUpdate(prevObject, nextObject, { users: 'id' }) === prevObject).toEqual(true)
  })
})
