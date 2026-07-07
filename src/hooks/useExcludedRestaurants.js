import { useCallback, useEffect, useState } from 'react'
import {
  EXCLUDED_CHANGED_EVENT,
  loadExcludedRestaurants,
  removeExcludedRestaurants,
} from '../utils/excludedRestaurants'

export default function useExcludedRestaurants() {
  const [list, setList] = useState(loadExcludedRestaurants)

  const refresh = useCallback(() => {
    setList(loadExcludedRestaurants())
  }, [])

  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener(EXCLUDED_CHANGED_EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(EXCLUDED_CHANGED_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [refresh])

  const removeByIds = useCallback(
    (placeIds) => {
      removeExcludedRestaurants(placeIds)
      refresh()
    },
    [refresh],
  )

  return { list, count: list.length, refresh, removeByIds }
}
