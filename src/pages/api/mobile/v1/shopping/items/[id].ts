import type { NextApiRequest, NextApiResponse } from 'next'
import type {
  MobileApiError,
  MobileUpdateShoppingItemRequest,
  MobileUpdateShoppingItemResponse,
} from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { normalizeMobileShoppingItemPatch } from '@/lib/mobile-shopping-core'
import { mobileShoppingItemDto, mobileShoppingListAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileUpdateShoppingItemResponse | MobileApiError | { ok: true }

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!id) return res.status(400).json({ error: 'Missing id' })
  const existing = await prisma.shoppingItem.findUnique({ where: { id }, select: { listId: true } })
  if (!existing || !(await mobileShoppingListAvailable(identity.userId, existing.listId))) {
    return res.status(404).json({ error: 'Item not found' })
  }

  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'DELETE') {
    await prisma.shoppingItem.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }

  const patch = normalizeMobileShoppingItemPatch(req.body as MobileUpdateShoppingItemRequest)
  if (!patch.ok) return res.status(400).json({ error: patch.error })
  const statusData = patch.value.status === 'DONE'
    ? { status: 'DONE' as const, doneAt: new Date(), doneById: identity.userId }
    : patch.value.status === 'ACTIVE'
      ? { status: 'ACTIVE' as const, doneAt: null, doneById: null }
      : {}
  const { status: _status, ...fields } = patch.value
  const item = await prisma.shoppingItem.update({
    where: { id },
    data: { ...fields, ...statusData },
    select: {
      id: true, listId: true, title: true, qty: true, quantityCount: true,
      category: true, store: true, status: true, doneAt: true, createdAt: true, updatedAt: true,
    },
  })
  return res.status(200).json({ item: mobileShoppingItemDto(item) })
}

export default withApiHandler(handler)
