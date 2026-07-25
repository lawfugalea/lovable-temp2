import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/router'
import { toast } from 'sonner'
import { useOnboarding } from './OnboardingProvider'
import {
  FIRST_TOUR_STEP_ID,
  TOUR_ROUTES,
  getTourStep,
  isTourStepId,
  nextStepId,
  prevStepId,
  stepPosition,
  type TourContext as TourCtx,
  type TourStep,
  type TourStepId,
} from '@/lib/onboarding-tour'

const AUTO_START_DELAY_MS = 600
const PERSIST_DEBOUNCE_MS = 400

interface TourContextValue {
  /** The step being shown, or null when the tour is closed. */
  step: TourStep | null
  position: { index: number; total: number }
  /** True while routing between steps — the anchor for the new page is not up yet. */
  navigating: boolean
  /** Start (or restart) the tour from the beginning. */
  startTour: () => void
  next: () => void
  back: () => void
  /** Close and remember where we got to. */
  pause: () => void
  /** Close and mark the tour as done, so it does not reappear. */
  finish: () => void
  canGoBack: boolean
  isLastStep: boolean
}

const TourContext = createContext<TourContextValue | null>(null)

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const onboarding = useOnboarding()
  const [activeId, setActiveId] = useState<TourStepId | null>(null)
  const [navigating, setNavigating] = useState(false)
  const autoStarted = useRef(false)
  const persistTimer = useRef<number | null>(null)
  // Distinguishes routing the tour asked for from the user clicking a link or
  // pressing browser-back, which should pause rather than fight them.
  const selfNavigating = useRef(false)

  const state = onboarding?.state ?? null
  const ctx: TourCtx = useMemo(
    () => ({ plan: state?.entitlements?.plan ?? 'FREE' }),
    [state?.entitlements?.plan],
  )

  /** Fire-and-forget: tour position is cosmetic, a lost write just replays a step. */
  const persist = useCallback((body: Parameters<NonNullable<typeof onboarding>['update']>[0]) => {
    void onboarding?.update(body).catch(() => {})
  }, [onboarding])

  const clearPersistTimer = useCallback(() => {
    if (persistTimer.current !== null) {
      window.clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
  }, [])

  const persistStepDebounced = useCallback((id: TourStepId) => {
    clearPersistTimer()
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = null
      persist({ tourStepId: id })
    }, PERSIST_DEBOUNCE_MS)
  }, [persist, clearPersistTimer])

  useEffect(() => clearPersistTimer, [clearPersistTimer])

  /**
   * Show a step, routing to its page first when we are not already there. The
   * card updates immediately so the copy is never stale mid-navigation; the
   * overlay holds off on resolving the anchor until `navigating` clears.
   */
  const goTo = useCallback((id: TourStepId) => {
    const step = getTourStep(id)
    setActiveId(id)
    persistStepDebounced(id)
    if (!step || step.href === router.pathname) return

    selfNavigating.current = true
    setNavigating(true)
    void router.push(step.href)
      .catch(() => {})
      .finally(() => {
        selfNavigating.current = false
        setNavigating(false)
      })
  }, [router, persistStepDebounced])

  const finish = useCallback(() => {
    clearPersistTimer()
    setActiveId(null)
    setNavigating(false)
    persist({ tourCompleted: true })
  }, [persist, clearPersistTimer])

  const pause = useCallback(() => {
    // Side effects stay outside the setState updater: React may invoke an
    // updater twice in StrictMode, which would double-toast and double-write.
    if (!activeId) return
    clearPersistTimer()
    setActiveId(null)
    setNavigating(false)
    persist({ tourStepId: activeId })
    toast('Tour paused', {
      description: 'Pick it up again from Help, or press ⌘K and search for the tour.',
    })
  }, [activeId, persist, clearPersistTimer])

  const next = useCallback(() => {
    if (!activeId) return
    const following = nextStepId(activeId, ctx)
    if (following === null) {
      finish()
      return
    }
    goTo(following)
  }, [activeId, ctx, finish, goTo])

  const back = useCallback(() => {
    if (!activeId) return
    const previous = prevStepId(activeId, ctx)
    if (previous !== null) goTo(previous)
  }, [activeId, ctx, goTo])

  const startTour = useCallback(() => {
    autoStarted.current = true
    persist({ tourCompleted: false, tourStepId: FIRST_TOUR_STEP_ID })
    goTo(FIRST_TOUR_STEP_ID)
  }, [persist, goTo])

  // Warm the routes the tour visits so steps do not stall on a cold chunk fetch.
  useEffect(() => {
    if (!activeId) return
    for (const route of TOUR_ROUTES) void router.prefetch(route).catch(() => {})
  }, [activeId, router])

  // Auto-start (or resume) once, for a user who has a household and has never
  // finished the tour. Existing accounts were backfilled as completed by the
  // migration, so this only fires for genuinely new signups.
  useEffect(() => {
    if (autoStarted.current) return
    if (!state?.household) return
    if (state.user.tourCompletedAt !== null) return
    if (router.pathname !== '/dashboard') return

    autoStarted.current = true
    const resumeAt = isTourStepId(state.user.tourStepId) ? state.user.tourStepId : FIRST_TOUR_STEP_ID
    const timer = window.setTimeout(() => goTo(resumeAt), AUTO_START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [state, router.pathname, goTo])

  // Any navigation the tour did not initiate — a nav click, a link in the page,
  // browser back — means the user has their own plans. Pause rather than yank
  // them back to the step's page, which would trap them.
  useEffect(() => {
    if (!activeId) return
    const onRouteChangeStart = () => {
      if (selfNavigating.current) return
      pause()
    }
    router.events.on('routeChangeStart', onRouteChangeStart)
    return () => router.events.off('routeChangeStart', onRouteChangeStart)
  }, [activeId, pause, router.events])

  const step = activeId ? getTourStep(activeId) : null

  const value = useMemo<TourContextValue>(() => ({
    step,
    position: activeId ? stepPosition(activeId, ctx) : { index: 0, total: 0 },
    navigating,
    startTour,
    next,
    back,
    pause,
    finish,
    canGoBack: activeId ? prevStepId(activeId, ctx) !== null : false,
    isLastStep: activeId ? nextStepId(activeId, ctx) === null : false,
  }), [step, activeId, ctx, navigating, startTour, next, back, pause, finish])

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

/** Returns null outside the provider, so pages can render without the tour. */
export function useTour(): TourContextValue | null {
  return useContext(TourContext)
}
