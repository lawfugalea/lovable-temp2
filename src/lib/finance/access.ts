import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { getFinanceOwnerEmail, isFinanceOwner } from './config'
import { buildAccessibleBankAccountWhere } from './visibility'

type FinanceAccess = {
  userId: string
  email: string
  householdId: string
  canManage: boolean
}

export async function requireFinanceAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  options: { manage?: boolean } = {},
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
    select: { id: true },
  })
  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this household' })
    return null
  }

  const canManage = isFinanceOwner(email)
  if (options.manage && !getFinanceOwnerEmail()) {
    res.status(503).json({ error: 'Finance owner is not configured' })
    return null
  }
  if (options.manage && !canManage) {
    res.status(403).json({ error: 'Only the designated finance owner can manage bank connections' })
    return null
  }

  return { userId, email, householdId, canManage }
}

export function accessibleBankAccountWhere(access: FinanceAccess) {
  return buildAccessibleBankAccountWhere(access.userId, access.householdId)
}
