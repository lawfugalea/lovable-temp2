import { prisma } from "@/lib/prisma";
import { invalidateSessionUser } from "@/lib/session-user-cache";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Decide a safe active household for a user and (optionally) write it.
 *
 * Users may belong to several households; `activeHouseholdId` records which one
 * they are currently looking at, not which one they belong to. Order:
 * 1) preferredId if the user is a member
 * 2) keep current if still valid
 * 3) their oldest membership (stable across calls, so a user who leaves the
 *    household they were viewing lands somewhere predictable)
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
      // Ordered so step 3 below is stable: without it Postgres may return
      // memberships in any order and a user with several households would land
      // in a different one on each reconcile.
      memberships: {
        select: { householdId: true, role: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!user) return { activeId: null, changed: false };

  const isMember = (hid?: string | null) =>
    !!hid && user.memberships.some((m) => m.householdId === hid);

  // 1) Preferred?
  if (preferredId && isMember(preferredId)) {
    if (write && user.activeHouseholdId !== preferredId) {
      await db.user.update({ where: { id: userId }, data: { activeHouseholdId: preferredId } });
      invalidateSessionUser(userId);
    }
    return { activeId: preferredId, changed: user.activeHouseholdId !== preferredId };
  }

  // 2) Current still valid?
  if (isMember(user.activeHouseholdId)) return { activeId: user.activeHouseholdId!, changed: false };

  // 3) Fall back to their oldest membership.
  const membership = user.memberships[0];
  if (membership) {
    if (write) {
      await db.user.update({ where: { id: userId }, data: { activeHouseholdId: membership.householdId } });
      invalidateSessionUser(userId);
    }
    return { activeId: membership.householdId, changed: true };
  }

  // 4) No households
  if (write && user.activeHouseholdId !== null) {
    await db.user.update({ where: { id: userId }, data: { activeHouseholdId: null } });
    invalidateSessionUser(userId);
  }
  return { activeId: null, changed: user.activeHouseholdId !== null };
}
