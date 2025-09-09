import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Decide a safe active household for a user and (optionally) write it.
 * SINGLE HOUSEHOLD MODEL: Users can only belong to one household at a time.
 * Order:
 * 1) preferredId if the user is a member
 * 2) keep current if still valid
 * 3) their only membership (if any)
 * 4) null
 */
export async function reconcileActiveHousehold(
  userId: string,
  opts?: { preferredId?: string | null; write?: boolean; db?: PrismaClient | Prisma.TransactionClient }
): Promise<{ activeId: string | null; changed: boolean }> {
  const preferredId = opts?.preferredId ?? null;
  const write = !!opts?.write;
  const db = (opts?.db as PrismaClient | Prisma.TransactionClient | undefined) ?? prisma;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      activeHouseholdId: true,
      memberships: { select: { householdId: true, role: true } },
    },
  });
  if (!user) return { activeId: null, changed: false };

  const isMember = (hid?: string | null) =>
    !!hid && user.memberships.some((m) => m.householdId === hid);

  // 1) Preferred?
  if (preferredId && isMember(preferredId)) {
    if (write && user.activeHouseholdId !== preferredId) {
      await db.user.update({ where: { id: userId }, data: { activeHouseholdId: preferredId } });
    }
    return { activeId: preferredId, changed: user.activeHouseholdId !== preferredId };
  }

  // 2) Current still valid?
  if (isMember(user.activeHouseholdId)) return { activeId: user.activeHouseholdId!, changed: false };

  // 3) Their only membership (SINGLE HOUSEHOLD MODEL)
  const membership = user.memberships[0]; // Should only be one
  if (membership) {
    if (write) await db.user.update({ where: { id: userId }, data: { activeHouseholdId: membership.householdId } });
    return { activeId: membership.householdId, changed: true };
  }

  // 4) No households
  if (write && user.activeHouseholdId !== null) {
    await db.user.update({ where: { id: userId }, data: { activeHouseholdId: null } });
  }
  return { activeId: null, changed: user.activeHouseholdId !== null };
}
