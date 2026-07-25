import { useCallback, useEffect, useRef, useState } from 'react'
import { useTour } from './TourProvider'
import TourCard from './TourCard'
import { measure, resolveAnchorWithRetry, type AnchorRect } from './resolve-anchor'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

/**
 * Draws the spotlight and positions the tour card.
 *
 * Mounted above the page rather than inside ModernAppShell: the shell is
 * rendered per page in the pages router, so an overlay inside it would unmount
 * on every cross-page step — the dim and the card would vanish mid-navigation
 * and the card would replay its open animation on the other side.
 *
 * The rect deliberately survives a step change. The ring animates from the old
 * anchor to the new one instead of popping out and back in, which is what makes
 * a cross-page step read as one movement rather than four separate flashes — and
 * because the ring carries the dim, keeping it mounted is also what stops the
 * page flashing undimmed mid-navigation.
 *
 * Resolution never dead-ends: an anchor that cannot be found makes an `optional`
 * step skip forward, and any other step fall back to a centred card.
 */

/** A freshly routed page renders a loading tree first, so give it longer. */
const RESOLVE_TIMEOUT_SAME_PAGE_MS = 600
const RESOLVE_TIMEOUT_AFTER_ROUTE_MS = 2500

export default function TourOverlay() {
  const tour = useTour()
  const navigating = tour?.navigating ?? false
  const reducedMotion = usePrefersReducedMotion()
  const [compact, setCompact] = useState(false)
  const [rect, setRect] = useState<AnchorRect | null>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  const justRouted = useRef(false)
  const step = tour?.step ?? null

  // Read the breakpoint imperatively rather than through a hook that returns
  // false on first render: a wrong value for one frame would mount the desktop
  // popover on a phone and immediately tear it down.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const list = window.matchMedia('(max-width: 639px)')
    setCompact(list.matches)
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [])

  // Remember that a route change happened so the next resolve gets the longer
  // deadline, covering the destination page's own loading state.
  useEffect(() => {
    if (navigating) justRouted.current = true
  }, [navigating])

  const remeasure = useCallback(() => {
    const element = anchorRef.current
    if (!element) return
    // The anchor can disappear mid-step (a dismissed card, a resize that swaps
    // sidebar for tab bar). Drop back to the centred card rather than pointing
    // at a stale rectangle.
    if (!element.isConnected || element.getClientRects().length === 0) {
      anchorRef.current = null
      setRect(null)
      return
    }
    setRect(measure(element))
  }, [])

  useEffect(() => {
    if (!step || !tour) {
      anchorRef.current = null
      setRect(null)
      return
    }

    let cancelled = false
    anchorRef.current = null

    // An unanchored step (welcome, done) is the one case where the ring should
    // genuinely go away rather than glide somewhere new.
    if (!step.target) {
      setRect(null)
      return
    }
    // Mid-route the destination page has not mounted, so its anchor genuinely
    // does not exist yet. Resolving now would wrongly skip an optional step.
    // The previous rect stays on screen meanwhile, so the dim never breaks.
    if (navigating) return

    const timeout = justRouted.current ? RESOLVE_TIMEOUT_AFTER_ROUTE_MS : RESOLVE_TIMEOUT_SAME_PAGE_MS
    justRouted.current = false

    void resolveAnchorWithRetry(step.target, timeout).then((element) => {
      if (cancelled) return
      if (!element) {
        setRect(null)
        // Legitimately absent at this breakpoint or for this user — move on
        // rather than showing a step about something they cannot see.
        if (step.optional) tour.next()
        return
      }
      anchorRef.current = element
      // Measure straight away so the ring starts moving now; the scroll listener
      // below keeps it pinned to the element for the rest of the smooth scroll,
      // rather than the ring waiting for the scroll to finish before appearing.
      remeasure()
      element.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
    })

    return () => { cancelled = true }
    // `tour` changes identity every render; only the step and route state should
    // retrigger this. Re-runs when `navigating` clears, which is what resolves
    // the anchor on the page the tour has just moved to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, step?.target, step?.optional, navigating, reducedMotion, remeasure])

  // Track the anchor while the page moves under it — including during the smooth
  // scroll above, which is what lets the ring travel with the element.
  useEffect(() => {
    if (!step) return
    const onChange = () => remeasure()
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)
    window.addEventListener('scroll', onChange, true)
    const observer = new ResizeObserver(onChange)
    observer.observe(document.documentElement)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
      window.removeEventListener('scroll', onChange, true)
      observer.disconnect()
    }
  }, [step, remeasure])

  // The sticky header's backdrop-blur can render a huge box-shadow spread
  // incorrectly in Safari. This attribute lets globals.css drop the blur while
  // a tour is open.
  useEffect(() => {
    if (!step) return
    document.documentElement.setAttribute('data-tour-active', 'true')
    return () => document.documentElement.removeAttribute('data-tour-active')
  }, [step])

  if (!tour || !step) return null

  const body = compact && step.bodyMobile ? step.bodyMobile : step.body
  // Only read on the client — this component renders null until a tour is
  // running, which can only happen after hydration, so there is no SSR mismatch.
  const viewportCentre = typeof window === 'undefined'
    ? { top: 0, left: 0 }
    : { top: window.innerHeight / 2, left: window.innerWidth / 2 }

  return (
    <>
      {/* One element, always mounted, for every state.
          The huge spread shadow dims everything outside it while its own area
          stays clear, so a second dim layer underneath would both double-darken
          the page and cover the hole. An unanchored step collapses it to a 0x0
          hole at the centre, which looks exactly like a plain full-page dim but
          keeps this the same node — so every change is a transition rather than
          one element unmounting and a different one appearing. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed z-[60] rounded-[14px] outline outline-2 outline-offset-2',
          rect ? 'outline-primary' : 'outline-transparent',
          'motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out',
        )}
        style={{
          top: rect ? rect.top : viewportCentre.top,
          left: rect ? rect.left : viewportCentre.left,
          width: rect ? rect.width : 0,
          height: rect ? rect.height : 0,
          boxShadow: '0 0 0 9999px hsl(var(--foreground) / 0.55)',
        }}
      />

      <TourCard
        step={step}
        body={body}
        position={tour.position}
        rect={rect}
        compact={compact}
        busy={navigating}
        canGoBack={tour.canGoBack}
        isLastStep={tour.isLastStep}
        onNext={tour.next}
        onBack={tour.back}
        onPause={tour.pause}
        onFinish={tour.finish}
      />
    </>
  )
}
