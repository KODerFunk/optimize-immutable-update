import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useState } from 'react'

import optimizeImmutableUpdate from '../optimizeImmutableUpdate'

export default function useOptimizedState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>] {
  const [state, setState] = useState<S>(initialState)

  const optimizedSetState = useCallback<Dispatch<SetStateAction<S>>>((action) => {
    setState((prevState) => {
      const nextState = typeof action === 'function'
        ? (action as (prevState: S) => S)(prevState)
        : action

      // returning the previous reference makes React bail out of re-rendering
      return optimizeImmutableUpdate(prevState, nextState)
    })
  }, [])

  return [state, optimizedSetState]
}
