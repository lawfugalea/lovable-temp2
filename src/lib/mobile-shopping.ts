import type { MobileShoppingItem, MobileShoppingList } from '../../packages/contracts'
import { prisma } from '@/lib/prisma'
import { isShoppingCategory } from '@/lib/shopping-categories'

export async function mobileHouseholdAvailable(userId: string, householdId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_householdId: { userId, householdId } },
    select: { id: true },
  })
  return Boolean(membership)
}

export async function mobileShoppingListAvailable(userId: string, listId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { id: true, householdId: true, name: true, archivedAt: true, updatedAt: true },
  })
  if (!list || !(await mobileHouseholdAvailable(userId, list.householdId))) return null
  return list
}

export function mobileShoppingListDto(input: {
  id: string
  name: string
  archivedAt: Date | null
  updatedAt: Date
  items?: Array<{ status: 'ACTIVE' | 'DONE' }>
}): MobileShoppingList {
  return {
    id: input.id,
    name: input.name,
    archivedAt: input.archivedAt?.toISOString() ?? null,
    updatedAt: input.updatedAt.toISOString(),
    activeItemCount: input.items?.filter(item => item.status === 'ACTIVE').length ?? 0,
    doneItemCount: input.items?.filter(item => item.status === 'DONE').length ?? 0,
  }
}

export function mobileShoppingItemDto(input: {
  id: string
  listId: string
  title: string
  qty: string | null
  quantityCount: number
  category: string | null
  status: 'ACTIVE' | 'DONE'
  doneAt: Date | null
  createdAt: Date
  updatedAt: Date
}): MobileShoppingItem {
  return {
    ...input,
    category: isShoppingCategory(input.category) ? input.category : null,
    // Kept as null on the wire for older clients; retailer data is parked
    // until an individual supermarket has provided written consent.
    store: null,
    doneAt: input.doneAt?.toISOString() ?? null,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  }
}
