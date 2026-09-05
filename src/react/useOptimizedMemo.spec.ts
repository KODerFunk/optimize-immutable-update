/* @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { renderHook } from '@testing-library/react'
import useOptimizedMemo from './useOptimizedMemo'

describe('useOptimizedMemo', () => {
  it('keeps the previous reference when deps change but the result is deep-equal', () => {
    const factory = jest.fn(() => ({ deep: { value: 'stable' } }))
    const { result, rerender } = renderHook(
      ({ version }) => useOptimizedMemo(factory, [version]),
      { initialProps: { version: 1 } },
    )
    const firstResult = result.current

    rerender({ version: 2 })

    expect(result.current).toBe(firstResult)
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('returns a new reference when the result really changes', () => {
    const { result, rerender } = renderHook(
      ({ version }) => useOptimizedMemo(() => ({ value: version }), [version]),
      { initialProps: { version: 1 } },
    )
    const firstResult = result.current

    rerender({ version: 2 })

    expect(result.current).toStrictEqual({ value: 2 })
    expect(result.current).not.toBe(firstResult)
  })

  it('does not recompute when deps are unchanged', () => {
    const factory = jest.fn(() => ({ value: 'same' }))
    const { rerender } = renderHook(
      () => useOptimizedMemo(factory, ['stable']),
    )

    rerender()

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('reuses item references across id-based reorders', () => {
    const { result, rerender } = renderHook(
      ({ swap }) => useOptimizedMemo(() => (swap
        ? [{ id: 2, name: 'Bob' }, { id: 1, name: 'Ann' }]
        : [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }]), [swap]),
      { initialProps: { swap: false } },
    )
    const firstResult = result.current

    rerender({ swap: true })

    expect(result.current[0]).toBe(firstResult[1])
    expect(result.current[1]).toBe(firstResult[0])
  })
})
