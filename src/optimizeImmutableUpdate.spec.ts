/* eslint-disable id-length, max-lines, max-lines-per-function, max-statements, @typescript-eslint/no-magic-numbers */
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
})
