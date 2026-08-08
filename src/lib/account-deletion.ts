import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { collectAttachmentFilenamesForUser, deleteNoteAttachmentFiles } from '@/lib/note-attachment-files'
import { consumeLoginAttempt } from '@/lib/rate-limit-store'

export type AccountDeletionResult = { ok: true } | { ok: false; status: number; error: string }

/**
 * Self-service account deletion — GDPR right to erasure (Art. 17), and the
 * in-app deletion App Store review guideline 5.1.1(v) requires of any app that
 * lets people create an account.
 *
 * Shared by the browser and the app so the two can never erase different
 * amounts of data: ownership of a household is handed to another owner if one
 * exists; otherwise the household is deleted so database cascades erase all
 * household-owned data — children, medicine, fever/health records, finance,
 * notes and shopping.
 *
 * The caller is responsible for authenticating the user and for refusing demo
 * accounts; this function verifies the password and does the erasure.
 */
export async function deleteUserAccount(userId: string, password: string): Promise<AccountDeletionResult> {
  const attemptKey = `account-delete:${userId}`
  if (!(await consumeLoginAttempt(attemptKey))) {
    return { ok: false, status: 429, error: 'Too many attempts. Try again later.' }
  }

  if (!password || password.length > 128) {
    return { ok: false, status: 400, error: 'Your password is required to delete your account' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return { ok: false, status: 400, error: 'Password is incorrect' }
  }

  // Collected before the transaction: the cascade below removes the
  // NoteAttachment rows, and with them the only record of which files on the
  // uploads volume belong to this user. Without this the rows vanished but the
  // images stayed on disk indefinitely — the erasure this promises was only
  // ever a database erasure.
  const attachmentFiles = await collectAttachmentFilenamesForUser(userId)

  await prisma.$transaction(async (tx) => {
    const [legacyOwned, ownerMemberships] = await Promise.all([
      tx.household.findMany({ where: { ownerId: userId }, select: { id: true } }),
      tx.membership.findMany({ where: { userId, role: 'OWNER' }, select: { householdId: true } }),
    ])
    const ownerHouseholdIds = [...new Set([
      ...legacyOwned.map((household) => household.id),
      ...ownerMemberships.map((membership) => membership.householdId),
    ])]

    for (const householdId of ownerHouseholdIds) {
      await tx.$queryRaw`SELECT "id" FROM "Household" WHERE "id" = ${householdId} FOR UPDATE`
      const replacement = await tx.membership.findFirst({
        where: { householdId, role: 'OWNER', userId: { not: userId } },
        orderBy: { createdAt: 'asc' },
        select: { userId: true },
      })
      if (replacement) {
        await tx.household.update({ where: { id: householdId }, data: { ownerId: replacement.userId } })
      } else {
        await tx.user.updateMany({ where: { activeHouseholdId: householdId }, data: { activeHouseholdId: null } })
        await tx.household.delete({ where: { id: householdId } })
      }
    }

    await tx.invite.deleteMany({ where: { invitedById: userId } })
    await tx.invite.updateMany({ where: { acceptedById: userId }, data: { acceptedById: null } })
    await tx.user.delete({ where: { id: userId } })
  })

  // After the commit: the rows are gone for certain, so removing the files
  // cannot orphan a row that still points at them.
  deleteNoteAttachmentFiles(attachmentFiles)

  return { ok: true }
}
