import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { parseOnboardingPatch } from '@/lib/onboarding-state'

/**
 * Onboarding + first-run state for the signed-in user.
 *
 * Unlike every other household route, this one must never 4xx for "no active
 * household" — that is precisely the first-run case it exists to describe. The
 * old /api/onboarding/status called requireActiveHousehold and returned 400,
 * which is why the checklist silently hid itself for brand-new accounts.
 */

const householdSelection = {
  id: true,
  name: true,
  country: true,
  ownerId: true,
} as const

interface OnboardingSteps {
  invitedMember: boolean
  addedShoppingItem: boolean
  wroteNote: boolean
  plannedMeal: boolean
  createdChore: boolean
}

/** Active household if set and still valid, else the earliest membership, else null. */
async function resolveHousehold(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeHouseholdId: true },
  })

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
    await prisma.user.update({
      where: { id: userId },
      data: { activeHouseholdId: membership.household.id },
    })
  }
  return membership
}

async function countSteps(householdId: string): Promise<OnboardingSteps> {
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

function serializeUser(user: UserRow) {
  return {
    firstName: user.name?.trim().split(/\s+/)[0] ?? null,
    isDemo: user.isDemo,
    tourStepId: user.tourStepId,
    tourCompletedAt: user.tourCompletedAt?.toISOString() ?? null,
    checklistDismissedAt: user.checklistDismissedAt?.toISOString() ?? null,
  }
}

async function handleGet(res: NextApiResponse, userId: string) {
  const [user, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: userSelection }),
    resolveHousehold(userId),
  ])
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (!membership) {
    return res.status(200).json({
      user: serializeUser(user),
      household: null,
      steps: null,
      entitlements: null,
    })
  }

  const household = membership.household
  const [steps, entitlements] = await Promise.all([
    countSteps(household.id),
    getHouseholdEntitlements(household.id),
  ])

  return res.status(200).json({
    user: serializeUser(user),
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
      canUsePriceComparison: entitlements.canUsePriceComparison,
      priceComparisonRegionSupported: entitlements.priceComparisonRegionSupported,
      // maxChildren is Infinity on Family, which JSON.stringify turns into null.
      unlimitedChildren: entitlements.maxChildren === Number.POSITIVE_INFINITY,
    },
  })
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const parsed = parseOnboardingPatch(req.body ?? {})
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })

  // Deliberately no rejectDemoUser: the tour is exactly what a demo user should
  // get, and this state is per-user and purely cosmetic.
  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: userSelection,
  })
  return res.status(200).json({ user: serializeUser(user) })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') return handleGet(res, userId)
  if (req.method === 'PATCH') return handlePatch(req, res, userId)

  res.setHeader('Allow', ['GET', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withApiHandler(handler)
