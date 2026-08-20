import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileUpdateShoppingListRequest, MobileUpdateShoppingListResponse } from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { normalizeMobileShoppingListName } from '@/lib/mobile-shopping-core'
import { mobileShoppingListAvailable, mobileShoppingListDto } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileUpdateShoppingListResponse | MobileApiError | { ok: true }

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const id = typeof req.query.listId === 'string' ? req.query.listId : ''
  if (!id || !(await mobileShoppingListAvailable(identity.userId, id))) return res.status(404).json({ error: 'List not found' })
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'DELETE') {
    await prisma.shoppingList.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }
  const normalized = normalizeMobileShoppingListName((req.body as MobileUpdateShoppingListRequest | undefined)?.name)
  if (!normalized.ok) return res.status(400).json({ error: normalized.error })
  try {
    const list = await prisma.shoppingList.update({ where: { id }, data: { name: normalized.value } })
    return res.status(200).json({ list: mobileShoppingListDto(list) })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'List name already exists' })
    throw error
  }
}

export default withApiHandler(handler)
