/* @jest-environment jsdom */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { act, renderHook } from '@testing-library/react'
import useOptimizedState from './useOptimizedState'

describe('useOptimizedState', () => {
  it('supports lazy initializers', () => {
    const { result } = renderHook(() => useOptimizedState(() => ({ value: 'lazy' })))

    expect(result.current[0]).toStrictEqual({ value: 'lazy' })
  })

  it('skips re-render when a value update is deep-equal', () => {
    let renderCount = 0
    const { result } = renderHook(() => {
      renderCount += 1

      return useOptimizedState({ user: { name: 'Ann' }, cart: { total: 100 } })
    })
    const firstState = result.current[0]

    act(() => {
      result.current[1]({ user: { name: 'Ann' }, cart: { total: 100 } })
    })

    expect(result.current[0]).toBe(firstState)
    expect(renderCount).toBe(1)
  })

  it('re-renders on real changes and reuses untouched subtrees', () => {
    const { result } = renderHook(() => useOptimizedState({ user: { name: 'Ann' }, cart: { total: 100 } }))
    const firstUser = result.current[0].user

    act(() => {
      result.current[1]({ user: { name: 'Ann' }, cart: { total: 150 } })
    })

    expect(result.current[0]).toStrictEqual({ user: { name: 'Ann' }, cart: { total: 150 } })
    expect(result.current[0].user).toBe(firstUser)
  })

  it('supports functional updates', () => {
    const { result } = renderHook(() => useOptimizedState({ count: 1 }))

    act(() => {
      result.current[1]((prevState) => ({ count: prevState.count + 1 }))
    })

    expect(result.current[0]).toStrictEqual({ count: 2 })
  })

  it('skips re-render when a functional update changes nothing', () => {
    let renderCount = 0
    const { result } = renderHook(() => {
      renderCount += 1

      return useOptimizedState({ count: 1 })
    })

    act(() => {
      result.current[1]((prevState) => ({ count: prevState.count }))
    })

    expect(renderCount).toBe(1)
  })

  it('bails out for equal primitives and updates for different ones', () => {
    let renderCount = 0
    const { result } = renderHook(() => {
      renderCount += 1

      return useOptimizedState(5)
    })

    act(() => {
      result.current[1](5)
    })

    expect(renderCount).toBe(1)

    act(() => {
      result.current[1](7)
    })

    expect(result.current[0]).toBe(7)
    expect(renderCount).toBe(2)
  })

  it('applies batched sequential updates in order', () => {
    const { result } = renderHook(() => useOptimizedState({ count: 1 }))

    act(() => {
      result.current[1]({ count: 2 })
      result.current[1]((prevState) => ({ count: prevState.count + 10 }))
    })

    expect(result.current[0]).toStrictEqual({ count: 12 })
  })
})
