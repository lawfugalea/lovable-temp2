import { prisma } from '@/lib/prisma'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { isSupermarketComparisonAvailable } from '@/lib/supermarket-consent'

/**
 * First-run state for a signed-in user, shared by the browser and the app.
 *
 * Unlike every other household route, this must never fail for "no active
 * household" — that is precisely the first-run case it exists to describe. A
 * brand-new account has no household yet, and telling it so is the whole point.
 */

const householdSelection = { id: true, name: true, country: true, ownerId: true } as const

export interface OnboardingSteps {
  invitedMember: boolean
  addedShoppingItem: boolean
  wroteNote: boolean
  plannedMeal: boolean
  createdChore: boolean
}

const userSelection = {
  name: true,
  isDemo: true,
  tourStepId: true,
  tourCompletedAt: true,
  checklistDismissedAt: true,
} as const

type UserRow = {
  name: string | null
  isDemo: boolean
  tourStepId: string | null
  tourCompletedAt: Date | null
  checklistDismissedAt: Date | null
}

export function serializeOnboardingUser(user: UserRow) {
  return {
    firstName: user.name?.trim().split(/\s+/)[0] ?? null,
    isDemo: user.isDemo,
    tourStepId: user.tourStepId,
    tourCompletedAt: user.tourCompletedAt?.toISOString() ?? null,
    checklistDismissedAt: user.checklistDismissedAt?.toISOString() ?? null,
  }
}

/** Active household if set and still valid, else the earliest membership, else null. */
export async function resolveOnboardingHousehold(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeHouseholdId: true } })

  let membership = user?.activeHouseholdId
    ? await prisma.membership.findUnique({
        where: { userId_householdId: { userId, householdId: user.activeHouseholdId } },
        select: { role: true, household: { select: householdSelection } },
      })
    : null

  if (!membership) {
    membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, household: { select: householdSelection } },
    })
  }
  if (!membership) return null

  // Keep activeHouseholdId honest, the same way /api/household/active does.
  if (user?.activeHouseholdId !== membership.household.id) {
    await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId: membership.household.id } })
  }
  return membership
}

export async function countOnboardingSteps(householdId: string): Promise<OnboardingSteps> {
  const [memberCount, inviteCount, itemCount, noteCount, mealCount, choreCount] = await Promise.all([
    prisma.membership.count({ where: { householdId } }),
    prisma.invite.count({ where: { householdId } }),
    prisma.shoppingItem.count({ where: { list: { householdId } } }),
    prisma.note.count({ where: { householdId } }),
    prisma.mealPlanEntry.count({ where: { householdId } }),
    prisma.chore.count({ where: { householdId } }),
  ])
  return {
    invitedMember: memberCount > 1 || inviteCount > 0,
    addedShoppingItem: itemCount > 0,
    wroteNote: noteCount > 0,
    plannedMeal: mealCount > 0,
    createdChore: choreCount > 0,
  }
}

/** The complete first-run payload, or null when the user no longer exists. */
export async function buildOnboardingState(userId: string) {
  const [user, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: userSelection }),
    resolveOnboardingHousehold(userId),
  ])
  if (!user) return null

  if (!membership) {
    return { user: serializeOnboardingUser(user), household: null, steps: null, entitlements: null }
  }

  const household = membership.household
  const [steps, entitlements] = await Promise.all([
    countOnboardingSteps(household.id),
    getHouseholdEntitlements(household.id),
  ])

  return {
    user: serializeOnboardingUser(user),
    household: {
      id: household.id,
      name: household.name,
      country: household.country,
      role: membership.role,
      isOwner: household.ownerId === userId,
    },
    steps,
    entitlements: {
      plan: entitlements.plan,
      canUseFinance: entitlements.canUseFinance,
      canUseAi: entitlements.canUseAi,
      canUsePushReminders: entitlements.canUsePushReminders,
      canExportMedicinePdf: entitlements.canExportMedicinePdf,
      // Conjoined with deployment availability rather than reported straight from
      // the entitlement: resolveEntitlements answers "does this plan include the
      // feature" and knows nothing about SUPERMARKET_CONSENTED_STORES, so the bare
      // value told Family households a feature was theirs while every call failed.
      canUsePriceComparison: entitlements.canUsePriceComparison && isSupermarketComparisonAvailable(),
      priceComparisonRegionSupported: entitlements.priceComparisonRegionSupported,
      // maxChildren is Infinity on Family, which JSON.stringify turns into null.
      unlimitedChildren: entitlements.maxChildren === Number.POSITIVE_INFINITY,
    },
  }
}

export { userSelection as onboardingUserSelection }
