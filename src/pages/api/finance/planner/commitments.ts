import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { isCommitmentCategory, isPlannerFrequency, parseAmountToCents } from '@/lib/budget'
import { assignmentAccountId, financePlanErrorResponse } from '@/lib/finance/plan-account-server'

type ParsedInput = {
  label: string
  category: string
  amountCents: number
  frequency: string
  essential: boolean
  userId: string | null
  planAccountId: string | null
}

async function parseInput(
  res: NextApiResponse,
  body: Record<string, unknown>,
  householdId: string,
  actingUserId: string,
): Promise<ParsedInput | null> {
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : ''
  if (!label) {
    res.status(400).json({ error: 'A label is required' })
    return null
  }
  const amountCents = parseAmountToCents(body.amount)
  if (amountCents === null) {
    res.status(400).json({ error: 'Enter a valid amount' })
    return null
  }
  const frequency = typeof body.frequency === 'string' ? body.frequency : 'MONTHLY'
  if (!isPlannerFrequency(frequency)) {
    res.status(400).json({ error: 'Unsupported frequency' })
    return null
  }
  const category = typeof body.category === 'string' && isCommitmentCategory(body.category) ? body.category : 'other'
  const essential = body.essential !== false
  let userId: string | null = null
  if (typeof body.userId === 'string' && body.userId) {
    const member = await prisma.membership.findFirst({ where: { householdId, userId: body.userId }, select: { id: true } })
    if (!member) {
      res.status(400).json({ error: 'That member is not part of this household' })
      return null
    }
    userId = body.userId
  }
  try {
    const planAccountId = await assignmentAccountId(householdId, actingUserId, body.planAccountId)
    return { label, category, amountCents, frequency, essential, userId, planAccountId }
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
    const count = await prisma.commitment.count({ where: { householdId: access.householdId } })
    if (count >= 200) return res.status(400).json({ error: 'Commitment limit reached' })
    const input = await parseInput(res, req.body ?? {}, access.householdId, access.userId)
    if (!input) return
    const created = await prisma.commitment.create({
      data: { householdId: access.householdId, ...input, frequency: input.frequency as never },
    })
    return res.status(201).json({ id: created.id })
  }

  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  if (!id) return res.status(400).json({ error: 'Missing id' })
  const existing = await prisma.commitment.findFirst({
    where: {
      id,
      householdId: access.householdId,
      OR: [{ planAccountId: null }, { planAccount: { visibility: 'SHARED' } }, { planAccount: { ownerUserId: access.userId } }],
    },
    select: { id: true },
  })
  if (!existing) return res.status(404).json({ error: 'Commitment not found' })

  if (req.method === 'DELETE') {
    await prisma.commitment.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }

  const input = await parseInput(res, req.body ?? {}, access.householdId, access.userId)
  if (!input) return
  await prisma.commitment.update({ where: { id }, data: { ...input, frequency: input.frequency as never } })
  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
