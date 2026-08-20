import { prisma } from '@/lib/prisma'

export const PANTRY_NAME_MAX = 120
export const PANTRY_QUANTITY_MAX = 60

/**
 * The identity a pantry item is matched on — the same case- and
 * whitespace-insensitive comparison the shopping refill worker applies to
 * list titles, so "Olive Oil" in the pantry covers "olive  oil" in a recipe.
 */
export function normalizePantryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function serializePantryItem(item: {
  id: string
  name: string
  quantity: string | null
  updatedAt: Date
  updatedBy?: { id: string; name: string | null } | null
}) {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    updatedAt: item.updatedAt.toISOString(),
    updatedBy: item.updatedBy ? { id: item.updatedBy.id, name: item.updatedBy.name } : null,
  }
}

/** The household's pantry as a normalized-name set, for coverage checks. */
export async function pantryNameSet(householdId: string): Promise<Set<string>> {
  const items = await prisma.pantryItem.findMany({
    where: { householdId },
    select: { normalizedName: true },
  })
  return new Set(items.map(item => item.normalizedName))
}
