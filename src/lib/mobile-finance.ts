import type { NextApiRequest, NextApiResponse } from 'next'
import { financeAccessForIdentity, type FinanceAccess } from '@/lib/finance/access'
import { requireMobileIdentity } from '@/lib/mobile-auth'

export async function requireMobileFinanceAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  householdId: string | undefined,
  options: { manage?: boolean; bank?: boolean } = {},
): Promise<FinanceAccess | null> {
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return null
  const result = await financeAccessForIdentity(identity, householdId, options)
  if ('status' in result) {
    res.status(result.status).json(result.body)
    return null
  }
  return result
}
