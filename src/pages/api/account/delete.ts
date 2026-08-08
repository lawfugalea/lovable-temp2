import type { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getUserIdOr401 } from '@/lib/api-guards'
import { collectAttachmentFilenamesForUser, deleteNoteAttachmentFiles } from '@/lib/note-attachment-files'
import { rejectDemoUser } from '@/lib/demo'
import { consumeLoginAttempt } from '@/lib/rate-limit-store';

/**
 * Self-service account deletion — GDPR right to erasure (Art. 17).
 *
 * Requires the user's password. Uses the same household cascade as the admin
 * delete (src/pages/api/admin/users.ts): ownership of a household is handed to
 * another owner if one exists; otherwise the household is deleted so database
 * cascades erase all household-owned data — children, medicine, fever/health
 * records, finance, notes and shopping.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserIdOr401(req, res)
  if (!userId) return
  if (await rejectDemoUser(res, userId, 'Deleting the account')) return

  const attemptKey = `account-delete:${userId}`
  if (!(await consumeLoginAttempt(attemptKey))) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' })
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!password || password.length > 128) {
    return res.status(400).json({ error: 'Your password is required to delete your account' })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Password is incorrect' })
  }

  // Collected before the transaction: the cascade below removes the
  // NoteAttachment rows, and with them the only record of which files on the
  // uploads volume belong to this user. Without this the rows vanished but the
  // images stayed on disk indefinitely — the erasure this endpoint promises was
  // only ever a database erasure.
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

  return res.status(200).json({ ok: true })
}

export default withApiHandler(handler)
