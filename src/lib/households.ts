import { prisma } from "@/lib/prisma";

/**
 * Decide a safe active household for a user and (optionally) write it.
 * Order:
 * 1) preferredId if the user is a member
 * 2) keep current if still valid
 * 3) any OWNER membership
 * 4) first membership
 * 5) null
 */
export async function reconcileActiveHousehold(
  userId: string,
  opts?: { preferredId?: string | null; write?: boolean }
): Promise<{ activeId: string | null; changed: boolean }> {
  const preferredId = opts?.preferredId ?? null;
  const write = !!opts?.write;

  const user = await prisma.user.findUnique({
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
      await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId: preferredId } });
    }
    return { activeId: preferredId, changed: user.activeHouseholdId !== preferredId };
  }

  // 2) Current still valid?
  if (isMember(user.activeHouseholdId)) return { activeId: user.activeHouseholdId!, changed: false };

  // 3) OWNER
  const owner = user.memberships.find((m) => m.role === "OWNER");
  if (owner) {
    if (write) await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId: owner.householdId } });
    return { activeId: owner.householdId, changed: true };
  }

  // 4) First membership
  const first = user.memberships[0];
  if (first) {
    if (write) await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId: first.householdId } });
    return { activeId: first.householdId, changed: true };
  }

  // 5) No households
  if (write && user.activeHouseholdId !== null) {
    await prisma.user.update({ where: { id: userId }, data: { activeHouseholdId: null } });
  }
  return { activeId: null, changed: user.activeHouseholdId !== null };
}
