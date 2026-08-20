import type { MobileBootstrapResponse } from '../../packages/contracts'
import { prisma } from '@/lib/prisma'
import { isAdminEmail } from '@/lib/admin-config'

export async function mobileBootstrap(userId: string): Promise<MobileBootstrapResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isDemo: true,
      activeHouseholdId: true,
      memberships: {
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          household: { select: { id: true, name: true, country: true } },
        },
      },
    },
  })
  if (!user) return null
  const households = user.memberships.map(({ household, role }) => ({ ...household, role }))
  const activeHouseholdId = households.some(item => item.id === user.activeHouseholdId)
    ? user.activeHouseholdId
    : households[0]?.id ?? null
  if (activeHouseholdId !== user.activeHouseholdId) {
    await prisma.user.update({ where: { id: user.id }, data: { activeHouseholdId } })
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email,
      isAdmin: isAdminEmail(user.email),
      isDemo: user.isDemo,
    },
    households,
    activeHouseholdId,
  }
}
