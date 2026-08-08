import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'
import { isMobilePlannerKind, parseMobilePlannerEntry } from '@/lib/mobile-finance-core'
import { prisma } from '@/lib/prisma'
import { assignmentAccountId } from '@/lib/finance/plan-account-server'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method || '')) { res.setHeader('Allow', ['POST', 'PATCH', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const kind = req.query.kind
  if (!isMobilePlannerKind(kind)) return res.status(404).json({ error: 'Planner entry type not found' })
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId)
  if (!access) return

  if (req.method === 'POST') {
    const count = kind === 'income'
      ? await prisma.incomeSource.count({ where: { householdId: access.householdId } })
      : kind === 'commitment'
        ? await prisma.commitment.count({ where: { householdId: access.householdId } })
        : await prisma.savingsGoal.count({ where: { householdId: access.householdId } })
    const limit = kind === 'income' ? 50 : kind === 'commitment' ? 200 : 30
    if (count >= limit) return res.status(400).json({ error: `${kind === 'income' ? 'Income source' : kind === 'commitment' ? 'Commitment' : 'Savings goal'} limit reached` })
  } else {
    const id = typeof req.body?.id === 'string' ? req.body.id : ''
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const existing = kind === 'income'
      ? await prisma.incomeSource.findFirst({ where: { id, householdId: access.householdId }, select: { id: true } })
      : kind === 'commitment'
        ? await prisma.commitment.findFirst({ where: { id, householdId: access.householdId }, select: { id: true } })
        : await prisma.savingsGoal.findFirst({ where: { id, householdId: access.householdId }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: `${kind === 'income' ? 'Income source' : kind === 'commitment' ? 'Commitment' : 'Savings goal'} not found` })
    if (req.method === 'DELETE') {
      if (kind === 'income') await prisma.incomeSource.delete({ where: { id } })
      else if (kind === 'commitment') await prisma.commitment.delete({ where: { id } })
      else await prisma.savingsGoal.delete({ where: { id } })
      return res.status(200).json({ ok: true })
    }
  }

  const parsed = parseMobilePlannerEntry(kind, req.body ?? {})
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  // Only savings goals are held in a planning account; income and commitments
  // are scoped to the household on the web too.
  if (parsed.value.kind === 'goal') {
    try {
      parsed.value.planAccountId = await assignmentAccountId(access.householdId, access.userId, parsed.value.planAccountId)
    } catch {
      return res.status(404).json({ error: 'Planning account not found' })
    }
  }
  if (parsed.value.kind !== 'goal' && parsed.value.userId) {
    const member = await prisma.membership.findFirst({ where: { householdId: access.householdId, userId: parsed.value.userId }, select: { id: true } })
    if (!member) return res.status(400).json({ error: 'That member is not part of this household' })
  }
  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  if (parsed.value.kind === 'income') {
    const { kind: _, ...data } = parsed.value
    if (req.method === 'POST') { const created = await prisma.incomeSource.create({ data: { householdId: access.householdId, ...data } }); return res.status(201).json({ id: created.id }) }
    await prisma.incomeSource.update({ where: { id }, data }); return res.status(200).json({ ok: true })
  }
  if (parsed.value.kind === 'commitment') {
    const { kind: _, ...data } = parsed.value
    if (req.method === 'POST') { const created = await prisma.commitment.create({ data: { householdId: access.householdId, ...data } }); return res.status(201).json({ id: created.id }) }
    await prisma.commitment.update({ where: { id }, data }); return res.status(200).json({ ok: true })
  }
  const { kind: _, ...data } = parsed.value
  if (req.method === 'POST') { const created = await prisma.savingsGoal.create({ data: { householdId: access.householdId, ...data } }); return res.status(201).json({ id: created.id }) }
  await prisma.savingsGoal.update({ where: { id }, data }); return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
