import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireFinanceAccess } from '@/lib/finance/access'
import { parseAmountToCents } from '@/lib/budget'

type ParsedInput = { name: string; targetCents: number; savedCents: number; targetDate: Date | null }

function parseInput(res: NextApiResponse, body: Record<string, unknown>): ParsedInput | null {
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
  return { name, targetCents, savedCents, targetDate }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const input = parseInput(res, req.body ?? {})
    if (!input) return
    const created = await prisma.savingsGoal.create({ data: { householdId: access.householdId, ...input } })
    return res.status(201).json({ id: created.id })
  }

  const id = typeof req.body?.id === 'string' ? req.body.id : ''
  if (!id) return res.status(400).json({ error: 'Missing id' })
  const existing = await prisma.savingsGoal.findFirst({
    where: { id, householdId: access.householdId },
    select: { id: true },
  })
  if (!existing) return res.status(404).json({ error: 'Savings goal not found' })

  if (req.method === 'DELETE') {
    await prisma.savingsGoal.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }

  const input = parseInput(res, req.body ?? {})
  if (!input) return
  await prisma.savingsGoal.update({ where: { id }, data: input })
  return res.status(200).json({ ok: true })
}
