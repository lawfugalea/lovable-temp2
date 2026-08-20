import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import {
  invalidateOnboardingState,
  loadOnboardingState,
  patchOnboardingState,
  primeOnboardingState,
  type OnboardingPatchBody,
  type OnboardingState,
  type OnboardingUserState,
} from '@/lib/onboarding-client'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface OnboardingContextValue {
  status: Status
  state: OnboardingState | null
  /** Refetch from the server, bypassing the module-level cache. */
  refresh: () => Promise<void>
  /**
   * Persist a change and merge the returned user state locally. Failures are
   * surfaced to the caller; the local value stays optimistic either way, since
   * every field here is cosmetic and a lost write just replays the prompt once.
   */
  update: (body: OnboardingPatchBody) => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { status: sessionStatus } = useSession()
  const [status, setStatus] = useState<Status>('idle')
  const [state, setState] = useState<OnboardingState | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = useCallback(async (force: boolean) => {
    setStatus((current) => (current === 'ready' ? current : 'loading'))
    try {
      const next = await loadOnboardingState(force)
      if (!mounted.current) return
      setState(next)
      setStatus('ready')
    } catch {
      if (!mounted.current) return
      // Distinct from "nothing to show": consumers render a retry affordance
      // rather than silently hiding themselves, which is what the old checklist
      // did on any non-ok response.
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    void load(false)
  }, [sessionStatus, load])

  const refresh = useCallback(async () => {
    invalidateOnboardingState()
    await load(true)
  }, [load])

  const update = useCallback(async (body: OnboardingPatchBody) => {
    let user: OnboardingUserState
    try {
      user = await patchOnboardingState(body)
    } catch (error) {
      invalidateOnboardingState()
      throw error
    }
    if (!mounted.current) return
    setState((current) => {
      if (!current) return current
      const next = { ...current, user }
      primeOnboardingState(next)
      return next
    })
  }, [])

  const value = useMemo<OnboardingContextValue>(
    () => ({ status, state, refresh, update }),
    [status, state, refresh, update],
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

/**
 * Returns null outside the provider so components can be rendered on public
 * pages (or in isolation) without blowing up.
 */
export function useOnboarding(): OnboardingContextValue | null {
  return useContext(OnboardingContext)
}
