import type { DependencyList } from 'react'
import { useMemo, useRef } from 'react'

import optimizeImmutableUpdate from '../optimizeImmutableUpdate'

export default function useOptimizedMemo<T>(factory: () => T, deps: DependencyList): T {
  const resultRef = useRef<T | undefined>(undefined)

  // deps belongs to the caller: the wrapper recomputes exactly when the caller's deps change
  return useMemo(() => {
    // deep-equal results keep the previous reference, so downstream memoized consumers stay quiet
    resultRef.current = optimizeImmutableUpdate(resultRef.current, factory())

    return resultRef.current
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}
