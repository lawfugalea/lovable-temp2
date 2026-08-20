import type { NextApiRequest, NextApiResponse } from 'next'
import type {
  MobileApiError,
  MobileCreateShoppingListRequest,
  MobileCreateShoppingListResponse,
  MobileShoppingListsResponse,
} from '../../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { normalizeMobileShoppingListName } from '@/lib/mobile-shopping-core'
import { mobileHouseholdAvailable, mobileShoppingListDto } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'

type Response = MobileShoppingListsResponse | MobileCreateShoppingListResponse | MobileApiError

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const identity = await requireMobileIdentity(req, res)
  if (!identity) return
  const householdId = req.method === 'GET'
    ? (typeof req.query.householdId === 'string' ? req.query.householdId : '')
    : (req.body as Partial<MobileCreateShoppingListRequest> | undefined)?.householdId || ''
  if (!householdId) return res.status(400).json({ error: 'Missing householdId' })
  if (!(await mobileHouseholdAvailable(identity.userId, householdId))) {
    return res.status(403).json({ error: 'Forbidden: not a member' })
  }

  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') {
    const lists = await prisma.shoppingList.findMany({
      where: { householdId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, archivedAt: true, updatedAt: true,
        items: { select: { status: true } },
      },
    })
    return res.status(200).json({ householdId, lists: lists.map(mobileShoppingListDto) })
  }

  const name = normalizeMobileShoppingListName(req.body?.name)
  if (!name.ok) return res.status(400).json({ error: name.error })
  try {
    const list = await prisma.shoppingList.create({ data: { householdId, name: name.value } })
    return res.status(201).json({ list: mobileShoppingListDto(list) })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({ error: 'List name already exists' })
    }
    throw error
  }
}

export default withApiHandler(handler)
