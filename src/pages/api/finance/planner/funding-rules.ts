import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { canManagePlanAccount, canSeePlanAccount, parseNonNegativeCents } from '@/lib/finance/plan-account-server'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['POST', 'PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return

  if (req.method === 'DELETE') {
    const id = typeof req.body?.id === 'string' ? req.body.id : ''
    const rule = id ? await prisma.financeFundingRule.findFirst({
      where: { id, householdId: access.householdId, archivedAt: null },
      include: { sourceAccount: true },
    }) : null
    if (!rule || !canManagePlanAccount(rule.sourceAccount, access.userId)) {
      return res.status(404).json({ error: 'Funding rule not found' })
    }
    await prisma.financeFundingRule.update({ where: { id }, data: { archivedAt: new Date() } })
    return res.status(200).json({ ok: true })
  }

  const sourceAccountId = typeof req.body?.sourceAccountId === 'string' ? req.body.sourceAccountId : ''
  const targetAccountId = typeof req.body?.targetAccountId === 'string' ? req.body.targetAccountId : ''
  if (!sourceAccountId || !targetAccountId || sourceAccountId === targetAccountId) {
    return res.status(400).json({ error: 'Choose two different planning accounts' })
  }
  const amountCents = parseNonNegativeCents(req.body?.amount)
  if (amountCents === null || amountCents <= 0) {
    return res.status(400).json({ error: 'Enter a monthly contribution above zero' })
  }
  const [source, target] = await Promise.all([
    prisma.financePlanAccount.findFirst({ where: { id: sourceAccountId, householdId: access.householdId, archivedAt: null } }),
    prisma.financePlanAccount.findFirst({ where: { id: targetAccountId, householdId: access.householdId, archivedAt: null } }),
  ])
  if (!source || !target || !canManagePlanAccount(source, access.userId) || !canSeePlanAccount(target, access.userId)) {
    return res.status(404).json({ error: 'Planning account not found' })
  }
  if (target.visibility === 'PRIVATE' && (source.visibility !== 'PRIVATE' || source.ownerUserId !== target.ownerUserId)) {
    return res.status(400).json({ error: 'A private destination can only be funded from another private account with the same owner' })
  }

  if (req.method === 'POST') {
    const count = await prisma.financeFundingRule.count({
      where: { householdId: access.householdId, archivedAt: null },
    })
    if (count >= 50) return res.status(400).json({ error: 'Monthly transfer limit reached' })
    const rule = await prisma.financeFundingRule.upsert({
      where: { sourceAccountId_targetAccountId: { sourceAccountId, targetAccountId } },
      create: { householdId: access.householdId, sourceAccountId, targetAccountId, amountCents },
      update: { amountCents, archivedAt: null },
    })
    return res.status(201).json({ id: rule.id })
  }

  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  const existing = id ? await prisma.financeFundingRule.findFirst({
    where: { id, householdId: access.householdId, archivedAt: null },
    include: { sourceAccount: true },
  }) : null
  if (!existing || !canManagePlanAccount(existing.sourceAccount, access.userId)) {
    return res.status(404).json({ error: 'Funding rule not found' })
  }
  await prisma.financeFundingRule.update({
    where: { id },
    data: { sourceAccountId, targetAccountId, amountCents },
  })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)

