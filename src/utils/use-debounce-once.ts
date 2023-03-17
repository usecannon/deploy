import { EffectCallback, useEffect, useRef, useState } from 'react'

export function useDebounceOnce<T>(
  callback: EffectCallback,
  value: T,
  delay: number
) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const alreadyExecuted = useRef(false)

  useEffect(() => {
    if (alreadyExecuted.current) return

    const handler = setTimeout(() => {
      alreadyExecuted.current = true
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  useEffect(() => {
    if (!alreadyExecuted.current) return
    return callback()
  }, [debouncedValue])
}
