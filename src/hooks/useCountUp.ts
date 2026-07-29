/**
 * Animate a number towards its target.
 *
 * The reduced-motion check is load-bearing rather than decorative: globals.css
 * clamps CSS animation durations to almost nothing under
 * `prefers-reduced-motion`, but it cannot touch a requestAnimationFrame loop. It
 * also returns the target immediately on first render, so server output and the
 * no-JS case show the real figure rather than zero.
 */
import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './useMediaQuery'

const DEFAULT_DURATION_MS = 700

export function useCountUp(target: number, options: { durationMs?: number; enabled?: boolean } = {}): number {
  const { durationMs = DEFAULT_DURATION_MS, enabled = true } = options
  const reducedMotion = usePrefersReducedMotion()
  const [value, setValue] = useState(target)
  const previous = useRef(target)

  useEffect(() => {
    if (!enabled || reducedMotion || typeof window === 'undefined' || document.visibilityState !== 'visible') {
      previous.current = target
      setValue(target)
      return
    }
    const from = previous.current
    if (from === target) return
    let frame = 0
    const start = performance.now()
    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
      else previous.current = target
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [durationMs, enabled, reducedMotion, target])

  return value
}
