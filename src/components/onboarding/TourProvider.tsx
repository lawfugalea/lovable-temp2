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
  /** Start (or restart) the tour from the beginning. */
  startTour: () => Promise<void>
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
  const autoStarted = useRef(false)
  const persistTimer = useRef<number | null>(null)

  const state = onboarding?.state ?? null
  const ctx: TourCtx = useMemo(
    () => ({ plan: state?.entitlements?.plan ?? 'FREE' }),
    [state?.entitlements?.plan],
  )

  /** Fire-and-forget: tour position is cosmetic, a lost write just replays a step. */
  const persist = useCallback((body: Parameters<NonNullable<typeof onboarding>['update']>[0]) => {
    void onboarding?.update(body).catch(() => {})
  }, [onboarding])

  const persistStepDebounced = useCallback((id: TourStepId) => {
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = null
      persist({ tourStepId: id })
    }, PERSIST_DEBOUNCE_MS)
  }, [persist])

  useEffect(() => () => {
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current)
  }, [])

  const goTo = useCallback((id: TourStepId | null) => {
    setActiveId(id)
    if (id) persistStepDebounced(id)
  }, [persistStepDebounced])

  const finish = useCallback(() => {
    if (persistTimer.current !== null) {
      window.clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    setActiveId(null)
    persist({ tourCompleted: true })
  }, [persist])

  const pause = useCallback(() => {
    const current = activeId
    setActiveId(null)
    if (!current) return
    if (persistTimer.current !== null) {
      window.clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    persist({ tourStepId: current })
    toast('Tour paused', { description: 'Pick it up again from Help, or press ⌘K and search for the tour.' })
  }, [activeId, persist])

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

  const startTour = useCallback(async () => {
    autoStarted.current = true
    // Every anchor lives on the dashboard, so make sure we are there first.
    if (router.pathname !== '/dashboard') {
      await router.push('/dashboard')
    }
    persist({ tourCompleted: false, tourStepId: FIRST_TOUR_STEP_ID })
    setActiveId(FIRST_TOUR_STEP_ID)
  }, [router, persist])

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
    const timer = window.setTimeout(() => setActiveId(resumeAt), AUTO_START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [state, router.pathname])

  // Leaving the dashboard mid-tour keeps the position but closes the overlay —
  // the anchors it points at do not exist anywhere else.
  useEffect(() => {
    if (!activeId) return
    if (router.pathname === '/dashboard') return
    setActiveId(null)
    persist({ tourStepId: activeId })
  }, [router.pathname, activeId, persist])

  const step = activeId ? getTourStep(activeId) : null

  const value = useMemo<TourContextValue>(() => ({
    step,
    position: activeId ? stepPosition(activeId, ctx) : { index: 0, total: 0 },
    startTour,
    next,
    back,
    pause,
    finish,
    canGoBack: activeId ? prevStepId(activeId, ctx) !== null : false,
    isLastStep: activeId ? nextStepId(activeId, ctx) === null : false,
  }), [step, activeId, ctx, startTour, next, back, pause, finish])

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

/** Returns null outside the provider, so pages can render without the tour. */
export function useTour(): TourContextValue | null {
  return useContext(TourContext)
}
