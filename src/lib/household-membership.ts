import type { Prisma } from '@prisma/client';

/**
 * Remove a user's access to the given households without leaving note-sharing
 * backdoors behind. Notes authored by the departing user become private; their
 * collaborator entries on other household notes are revoked.
 */
export async function detachUserFromHouseholds(
  tx: Prisma.TransactionClient,
  userId: string,
  householdIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(householdIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  await tx.noteCollaborator.deleteMany({
    where: {
      OR: [
        { userId, note: { householdId: { in: uniqueIds } } },
        { note: { createdById: userId, householdId: { in: uniqueIds } } },
      ],
    },
  });
  await tx.note.updateMany({
    where: { createdById: userId, householdId: { in: uniqueIds } },
    data: { isShared: false, householdId: null },
  });
  await tx.bankAccountShare.deleteMany({
    where: {
      householdId: { in: uniqueIds },
      account: { connection: { userId } },
    },
  });
  const privateAccounts = await tx.financePlanAccount.findMany({
    where: { householdId: { in: uniqueIds }, ownerUserId: userId, visibility: 'PRIVATE' },
    select: { id: true },
  });
  const privateAccountIds = privateAccounts.map(account => account.id);
  if (privateAccountIds.length) {
    // Goals kept in a private account must never become shared through an ON DELETE SET NULL.
    await tx.savingsGoal.deleteMany({ where: { planAccountId: { in: privateAccountIds } } });
    await tx.financePlanAccount.deleteMany({ where: { id: { in: privateAccountIds } } });
  }
  for (const householdId of uniqueIds) {
    const replacement = await tx.membership.findFirst({
      where: { householdId, userId: { not: userId } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: { userId: true },
    });
    if (replacement) {
      await tx.financePlanAccount.updateMany({
        where: { householdId, ownerUserId: userId, visibility: 'SHARED' },
        data: { ownerUserId: replacement.userId },
      });
    }
  }
  await tx.membership.deleteMany({
    where: { userId, householdId: { in: uniqueIds } },
  });
}
