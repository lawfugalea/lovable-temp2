import type { NextApiRequest, NextApiResponse } from 'next'
import type {
  MobileApiError,
  MobileCreateShoppingItemRequest,
  MobileCreateShoppingItemResponse,
  MobileShoppingItemsResponse,
} from '../../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { normalizeMobileShoppingItemCreate } from '@/lib/mobile-shopping-core'
import { mobileShoppingItemDto, mobileShoppingListAvailable, mobileShoppingListDto } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileShoppingItemsResponse | MobileCreateShoppingItemResponse | MobileApiError

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const listId = typeof req.query.listId === 'string' ? req.query.listId : ''
  if (!listId) return res.status(400).json({ error: 'Missing listId' })
  const accessibleList = await mobileShoppingListAvailable(identity.userId, listId)
  if (!accessibleList || accessibleList.archivedAt) return res.status(404).json({ error: 'List not found' })

  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') {
    const items = await prisma.shoppingItem.findMany({
      where: { listId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true, listId: true, title: true, qty: true, quantityCount: true,
        category: true, status: true, doneAt: true, createdAt: true, updatedAt: true,
      },
    })
    return res.status(200).json({
      list: mobileShoppingListDto({ ...accessibleList, items }),
      items: items.map(mobileShoppingItemDto),
    })
  }

  const input = normalizeMobileShoppingItemCreate(req.body as MobileCreateShoppingItemRequest)
  if (!input.ok) return res.status(400).json({ error: input.error })
  const item = await prisma.shoppingItem.create({
    data: { listId, createdById: identity.userId, status: 'ACTIVE', ...input.value },
    select: {
      id: true, listId: true, title: true, qty: true, quantityCount: true,
      category: true, status: true, doneAt: true, createdAt: true, updatedAt: true,
    },
  })
  return res.status(201).json({ item: mobileShoppingItemDto(item) })
}

export default withApiHandler(handler)
