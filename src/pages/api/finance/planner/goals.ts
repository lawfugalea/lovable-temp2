import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { parseAmountToCents } from '@/lib/budget'
import { assignmentAccountId, financePlanErrorResponse, parseNonNegativeCents } from '@/lib/finance/plan-account-server'

type ParsedInput = { name: string; targetCents: number; savedCents: number; targetDate: Date | null; monthlyContributionCents: number | null; planAccountId: string | null }

async function parseInput(res: NextApiResponse, body: Record<string, unknown>, householdId: string, userId: string): Promise<ParsedInput | null> {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
  if (!name) {
    res.status(400).json({ error: 'A goal name is required' })
    return null
  }
  const targetCents = parseAmountToCents(body.target)
  if (targetCents === null) {
    res.status(400).json({ error: 'Enter a valid target amount' })
    return null
  }
  let savedCents = 0
  if (body.saved !== undefined && body.saved !== null && body.saved !== '' && body.saved !== 0 && body.saved !== '0') {
    const parsed = parseAmountToCents(body.saved)
    if (parsed === null) {
      res.status(400).json({ error: 'Enter a valid saved amount' })
      return null
    }
    savedCents = parsed
  }
  let targetDate: Date | null = null
  if (typeof body.targetDate === 'string' && body.targetDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.targetDate)) {
      res.status(400).json({ error: 'Enter a valid target date' })
      return null
    }
    targetDate = new Date(`${body.targetDate}T00:00:00.000Z`)
    if (Number.isNaN(targetDate.getTime())) {
      res.status(400).json({ error: 'Enter a valid target date' })
      return null
    }
  }
  let monthlyContributionCents: number | null = null
  if (body.monthlyContribution !== undefined && body.monthlyContribution !== null && body.monthlyContribution !== '') {
    monthlyContributionCents = parseNonNegativeCents(body.monthlyContribution, { nullable: true })
    if (monthlyContributionCents === null) {
      res.status(400).json({ error: 'Enter a valid monthly contribution' })
      return null
    }
  }
  try {
    const planAccountId = await assignmentAccountId(householdId, userId, body.planAccountId)
    return { name, targetCents, savedCents, targetDate, monthlyContributionCents, planAccountId }
  } catch (error) {
    const failure = financePlanErrorResponse(error)
    res.status(failure.status).json({ error: failure.message })
    return null
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['POST', 'PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireFinanceAccess(req, res, householdId)
  if (!access) return

  if (req.method === 'POST') {
    const count = await prisma.savingsGoal.count({ where: { householdId: access.householdId } })
    if (count >= 30) return res.status(400).json({ error: 'Savings goal limit reached' })
    const input = await parseInput(res, req.body ?? {}, access.householdId, access.userId)
    if (!input) return
    const created = await prisma.savingsGoal.create({ data: { householdId: access.householdId, ...input } })
    return res.status(201).json({ id: created.id })
  }

  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  if (!id) return res.status(400).json({ error: 'Missing id' })
  const existing = await prisma.savingsGoal.findFirst({
    where: {
      id,
      householdId: access.householdId,
      OR: [{ planAccountId: null }, { planAccount: { visibility: 'SHARED' } }, { planAccount: { ownerUserId: access.userId } }],
    },
    select: { id: true },
  })
  if (!existing) return res.status(404).json({ error: 'Savings goal not found' })

  if (req.method === 'DELETE') {
    await prisma.savingsGoal.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }

  const input = await parseInput(res, req.body ?? {}, access.householdId, access.userId)
  if (!input) return
  await prisma.savingsGoal.update({ where: { id }, data: input })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
