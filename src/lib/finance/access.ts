import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { getHouseholdEntitlements } from '@/lib/entitlements'
import { respondUpgradeRequired } from '@/lib/entitlements-core'
import { isBankingAllowedEmail } from '@/lib/banking-allowlist'
import { buildAccessibleBankAccountWhere } from './visibility'

export type FinanceAccess = {
  userId: string
  email: string
  householdId: string
  canManage: boolean
  bankEnabled: boolean
}

/**
 * Bank connections (open banking) are limited to the individually allowlisted
 * account holders while the Enable Banking application runs in restricted
 * production. Everyone else — including other members of the same household —
 * uses the manual money planner and never sees the banking surface.
 */
export function isBankFeaturesEnabled(email: string | null | undefined): boolean {
  return isBankingAllowedEmail(email)
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
  if (!householdId) {
    res.status(400).json({ error: 'Missing householdId' })
    return null
  }

  const membership = await prisma.membership.findFirst({
    where: { userId, householdId },
    select: { id: true, role: true },
  })
  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this household' })
    return null
  }

  const entitlements = await getHouseholdEntitlements(householdId)
  if (!entitlements.canUseFinance) {
    respondUpgradeRequired(res, 'finance')
    return null
  }

  // Bank connections are managed by the household owner.
  const canManage = membership.role === 'OWNER'
  if (options.manage && !canManage) {
    res.status(403).json({ error: 'Only the household owner can manage bank connections' })
    return null
  }

  const bankEnabled = isBankFeaturesEnabled(email)
  if (options.bank && !bankEnabled) {
    res.status(403).json({ error: 'Bank connections are not available for this account' })
    return null
  }

  return { userId, email, householdId, canManage, bankEnabled }
}

export function accessibleBankAccountWhere(access: FinanceAccess) {
  return buildAccessibleBankAccountWhere(access.userId, access.householdId)
}
