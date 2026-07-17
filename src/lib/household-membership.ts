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
  await tx.membership.deleteMany({
    where: { userId, householdId: { in: uniqueIds } },
  });
}
