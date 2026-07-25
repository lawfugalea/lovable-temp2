/**
 * Client-side access to /api/onboarding/state.
 *
 * The cache is module-level on purpose. ModernAppShell is rendered per-page in
 * the pages router, so it unmounts and remounts on every navigation — a plain
 * useEffect(fetch) in the provider would hit the API once per page view.
 */

export interface OnboardingUserState {
  firstName: string | null
  isDemo: boolean
  tourStepId: string | null
  tourCompletedAt: string | null
  checklistDismissedAt: string | null
}

export interface OnboardingHousehold {
  id: string
  name: string
  country: string
  role: 'OWNER' | 'MEMBER'
  isOwner: boolean
}

export interface OnboardingSteps {
  invitedMember: boolean
  addedShoppingItem: boolean
  wroteNote: boolean
  plannedMeal: boolean
  createdChore: boolean
}

export interface OnboardingEntitlements {
  plan: 'FREE' | 'FAMILY'
  canUseFinance: boolean
  canUseAi: boolean
  canUsePushReminders: boolean
  canExportMedicinePdf: boolean
  canUsePriceComparison: boolean
  priceComparisonRegionSupported: boolean
  unlimitedChildren: boolean
}

export interface OnboardingState {
  user: OnboardingUserState
  /** Null means the user has no household yet — the first-run case. */
  household: OnboardingHousehold | null
  steps: OnboardingSteps | null
  entitlements: OnboardingEntitlements | null
}

export interface OnboardingPatchBody {
  tourStepId?: string | null
  tourCompleted?: boolean
  checklistDismissed?: boolean
}

let cache: Promise<OnboardingState> | null = null

export function loadOnboardingState(force = false): Promise<OnboardingState> {
  if (force || !cache) {
    cache = fetch('/api/onboarding/state')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Onboarding state request failed (${response.status})`)
        return (await response.json()) as OnboardingState
      })
      .catch((error) => {
        // Never cache a rejection — the next mount should retry rather than
        // inherit a transient network failure for the rest of the session.
        cache = null
        throw error
      })
  }
  return cache
}

export function invalidateOnboardingState(): void {
  cache = null
}

/** Overwrite the cached state without a round trip, after a successful PATCH. */
export function primeOnboardingState(state: OnboardingState): void {
  cache = Promise.resolve(state)
}

export async function patchOnboardingState(body: OnboardingPatchBody): Promise<OnboardingUserState> {
  const response = await fetch('/api/onboarding/state', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Onboarding update failed (${response.status})`)
  const data = (await response.json()) as { user: OnboardingUserState }
  return data.user
}
