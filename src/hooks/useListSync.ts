import { useEffect, useRef } from 'react'

/** How often to ask the server whether a visible list has changed. */
const POLL_INTERVAL_MS = 12_000

/**
 * Keeps an open shopping list in step with the other people editing it.
 *
 * Two people in the same shop working the same list is the normal case, and
 * until this existed each of them saw whatever the list looked like when their
 * page loaded — items ticked by one were still unticked for the other, so
 * things got bought twice.
 *
 * Deliberately polling a small version token rather than holding a stream: the
 * app is served through a Cloudflare tunnel that buffers SSE, and a phone that
 * sleeps in a pocket drops long-lived connections without a clean reconnect.
 * Polling recovers on its own from both.
 *
 * Polling stops while the tab is hidden — a backgrounded phone must not hold a
 * request open every few seconds — and a check fires immediately on the way
 * back, which is the moment a shopper actually looks at the screen.
 *
 * @param listId  The list on screen, or '' when none is selected.
 * @param onChanged  Called when the server's token differs from the last seen.
 *   Must be referentially stable or the poll restarts on every render.
 * @param enabled  False while the page is loading or unauthenticated.
 */
export function useListSync(listId: string, onChanged: () => void, enabled = true): void {
  // Held in refs so the effect below depends only on listId/enabled and does
  // not tear down the timer whenever the caller re-renders.
  const onChangedRef = useRef(onChanged)
  const lastVersionRef = useRef<string | null>(null)

  useEffect(() => {
    onChangedRef.current = onChanged
  }, [onChanged])

  useEffect(() => {
    lastVersionRef.current = null
  }, [listId])

  useEffect(() => {
    if (!enabled || !listId) return

    let cancelled = false
    let timer: number | undefined

    const check = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        const response = await fetch(
          `/api/shopping/items/version?listId=${encodeURIComponent(listId)}`,
          { credentials: 'include' },
        )
        if (!response.ok || cancelled) return
        const data = await response.json()
        const version = typeof data.version === 'string' ? data.version : null
        if (!version) return

        // The first successful check only records the baseline. Treating it as
        // a change would refetch items the page has just loaded.
        if (lastVersionRef.current === null) {
          lastVersionRef.current = version
          return
        }
        if (lastVersionRef.current !== version) {
          lastVersionRef.current = version
          onChangedRef.current()
        }
      } catch {
        // Offline or a dropped request: keep the last known version and try
        // again on the next tick rather than forcing a pointless refetch.
      }
    }

    const startPolling = () => {
      window.clearInterval(timer)
      timer = window.setInterval(() => void check(), POLL_INTERVAL_MS)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void check()
        startPolling()
      } else {
        window.clearInterval(timer)
      }
    }

    void check()
    startPolling()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    window.addEventListener('online', handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('online', handleVisibility)
    }
  }, [listId, enabled])
}
