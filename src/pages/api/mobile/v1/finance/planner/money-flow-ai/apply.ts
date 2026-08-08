import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileFinanceAccess } from '@/lib/mobile-finance'
import { verifyMoneyFlowAiProposal } from '@/lib/finance/money-flow-ai'
import { applyMoneyFlowAiOperations, moneyFlowStateHash } from '@/lib/finance/money-flow-ai-server'
import { prisma } from '@/lib/prisma'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const householdId = typeof req.body?.householdId === 'string' ? req.body.householdId : undefined
  const access = await requireMobileFinanceAccess(req, res, householdId)
  if (!access) return
  let proposal: ReturnType<typeof verifyMoneyFlowAiProposal>
  try {
    proposal = verifyMoneyFlowAiProposal(req.body?.proposalToken)
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid AI proposal' })
  }
  if (proposal.householdId !== access.householdId || proposal.userId !== access.userId) {
    return res.status(403).json({ error: 'This AI proposal belongs to another user or household' })
  }
  const selectedIds = Array.isArray(req.body?.selectedOperationIds)
    ? [...new Set(req.body.selectedOperationIds.filter((id: unknown): id is string => typeof id === 'string'))].slice(0, 60)
    : []
  if (!selectedIds.length) return res.status(400).json({ error: 'Select at least one proposed change' })
  const selected = proposal.operations.filter(operation => selectedIds.includes(operation.id))
  if (selected.length !== selectedIds.length) return res.status(400).json({ error: 'The selected AI changes are invalid' })

  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${access.householdId} FOR UPDATE`
      const currentHash = await moneyFlowStateHash(tx, access.householdId, access.userId)
      if (currentHash !== proposal.stateHash) {
        throw Object.assign(new Error('The money plan changed. Request a fresh AI proposal.'), { status: 409 })
      }
      await applyMoneyFlowAiOperations(tx, access.householdId, access.userId, selected)
    }, { isolationLevel: 'Serializable' })
    return res.status(200).json({ ok: true, applied: selected.length })
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 400
    return res.status(status).json({ error: error instanceof Error ? error.message : 'Could not apply AI proposal' })
  }
}

export default withApiHandler(handler)

