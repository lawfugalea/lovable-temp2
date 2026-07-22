import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { buildAccessibleBankAccountWhere } from './visibility'

export type FinanceAccess = {
  userId: string
  email: string
  householdId: string
  canManage: boolean
  bankEnabled: boolean
}

export type FinanceAccessDenied = {
  status: 400 | 403
  body: { error: string; code?: string; feature?: 'finance' }
}

/**
 * Bank connections (open banking) are limited to the household containing the
 * configured finance owner while the Enable Banking application runs in
 * restricted production. Every other household uses the manual money planner.
 */
export async function isBankFeaturesEnabled(householdId: string): Promise<boolean> {
  const ownerEmail = process.env.FINANCE_OWNER_EMAIL?.trim().toLowerCase()
  if (!ownerEmail) return false
  const member = await prisma.membership.findFirst({
    where: { householdId, user: { email: { equals: ownerEmail, mode: 'insensitive' } } },
    select: { id: true },
  })
  return Boolean(member)
}

export async function requireFinanceAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  options: { manage?: boolean; bank?: boolean } = {},
): Promise<FinanceAccess | null> {
  const session = (await getServerSession(req, res, authOptions as any)) as
    | { user?: { id?: string; email?: string | null } }
    | null
  const userId = session?.user?.id
  const email = session?.user?.email?.trim().toLowerCase()

  if (!userId || !email) {
    res.status(401).json({ error: 'Sign in required' })
    return null
  }
  const result = await financeAccessForIdentity({ userId, email }, householdId, options)
  if ('status' in result) {
    res.status(result.status).json(result.body)
    return null
  }
  return result
}

/** Shared authorization used by both browser-session and bearer-token finance APIs. */
export async function financeAccessForIdentity(
  identity: { userId: string; email: string },
  householdId: string | undefined,
  options: { manage?: boolean; bank?: boolean } = {},
): Promise<FinanceAccess | FinanceAccessDenied> {
  if (!householdId) return { status: 400, body: { error: 'Missing householdId' } }
  const membership = await prisma.membership.findFirst({
    where: { userId: identity.userId, householdId },
    select: { id: true, role: true },
  })
  if (!membership) return { status: 403, body: { error: 'You are not a member of this household' } }

  const entitlements = await getHouseholdEntitlements(householdId)
  if (!entitlements.canUseFinance) {
    return { status: 403, body: { error: 'Finances are part of the Family plan', code: 'upgrade_required', feature: 'finance' } }
  }

  const canManage = membership.role === 'OWNER'
  if (options.manage && !canManage) return { status: 403, body: { error: 'Only the household owner can manage bank connections' } }
  const bankEnabled = await isBankFeaturesEnabled(householdId)
  if (options.bank && !bankEnabled) return { status: 403, body: { error: 'Bank connections are not available for this household yet' } }
  return { userId: identity.userId, email: identity.email, householdId, canManage, bankEnabled }
}

export function accessibleBankAccountWhere(access: FinanceAccess) {
  return buildAccessibleBankAccountWhere(access.userId, access.householdId)
}
