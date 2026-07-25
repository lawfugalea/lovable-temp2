import { useCallback, useEffect, useRef, useState } from 'react'
import { useTour } from './TourProvider'
import TourCard from './TourCard'
import { measure, resolveAnchorWithRetry, type AnchorRect } from './resolve-anchor'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

/**
 * Draws the spotlight and positions the tour card.
 *
 * Resolution never dead-ends: an anchor that cannot be found makes an `optional`
 * step skip forward, and any other step fall back to a centred card with the
 * same copy. The tour is never left pointing at nothing.
 */
export default function TourOverlay() {
  const tour = useTour()
  const reducedMotion = usePrefersReducedMotion()
  const [compact, setCompact] = useState(false)
  const [rect, setRect] = useState<AnchorRect | null>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
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
    setRect(null)

    if (!step.target) return

    void resolveAnchorWithRetry(step.target).then((element) => {
      if (cancelled) return
      if (!element) {
        // Legitimately absent at this breakpoint or for this user — move on
        // rather than showing a step about something they cannot see.
        if (step.optional) tour.next()
        return
      }
      anchorRef.current = element
      element.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
      // Measure after the scroll settles, or the rect is the pre-scroll one.
      window.setTimeout(() => { if (!cancelled) remeasure() }, reducedMotion ? 0 : 320)
    })

    return () => { cancelled = true }
    // `tour` changes identity every render; only the step should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, step?.target, step?.optional, reducedMotion, remeasure])

  // Keep the ring on the element as the page moves under it.
  useEffect(() => {
    if (!rect) return
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
  }, [rect, remeasure])

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

  return (
    <>
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] rounded-[14px] outline outline-2 outline-offset-2 outline-primary motion-safe:transition-all motion-safe:duration-200"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            // One element, no SVG mask: a huge spread shadow dims everything
            // outside the ring and stays correct in both themes.
            boxShadow: '0 0 0 9999px hsl(var(--foreground) / 0.55)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-foreground/55" />
      )}

      <TourCard
        step={step}
        body={body}
        position={tour.position}
        rect={rect}
        compact={compact}
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
