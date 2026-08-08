import { useEffect, useState } from 'react'

/**
 * Matches a CSS media query, client-side only.
 *
 * Returns false on the server and on the first client render so markup matches
 * during hydration, then updates once mounted. Callers that render different
 * trees per breakpoint should treat the initial false as "not yet known".
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const list = window.matchMedia(query)
    setMatches(list.matches)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind's `sm` breakpoint — the point where the tour switches presentation. */
export function usePrefersSmUp(): boolean {
  return useMediaQuery('(min-width: 640px)')
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
