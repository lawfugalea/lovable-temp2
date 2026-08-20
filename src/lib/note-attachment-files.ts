import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '@/lib/prisma'
import { captureException } from '@/lib/observability'

/** Must match the upload location in pages/api/uploads/note-image.ts. */
const uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
export const noteUploadDir = join(uploadRoot, 'notes')

/**
 * Filenames this application generates. Anything else in the directory is not
 * ours to delete, and a name from the database is still untrusted input as far
 * as path traversal is concerned.
 */
const SAFE_FILE_RE = /^note-[0-9]+-[a-z0-9]+(?:\.(jpg|jpeg|png|gif|webp))?$/i

/**
 * Delete the image files behind a set of NoteAttachment rows.
 *
 * Deleting a note cascades its NoteAttachment rows, and deleting an account
 * cascades whole households — but the cascade only ever touched the database.
 * The files themselves stayed on the uploads volume forever, which meant the
 * volume grew without bound and, more seriously, that account deletion did not
 * actually erase the user's uploaded images. That is the right to erasure the
 * delete endpoint claims to implement.
 *
 * Best-effort by design: the caller has already committed the database change,
 * so a file that cannot be removed is reported and skipped rather than thrown.
 * A leftover file is recoverable — the sweeper in scripts/sweep-orphan-uploads.mjs
 * catches it — whereas failing here would leave the caller unsure whether the
 * deletion happened at all.
 */
export function deleteNoteAttachmentFiles(filenames: string[]): { deleted: number; skipped: number } {
  let deleted = 0
  let skipped = 0

  for (const filename of filenames) {
    if (!SAFE_FILE_RE.test(filename)) {
      skipped += 1
      continue
    }
    const fullPath = join(noteUploadDir, filename)
    // Defence in depth: the regex already excludes separators, but the check
    // costs nothing and this is a delete.
    if (!fullPath.startsWith(noteUploadDir + '/')) {
      skipped += 1
      continue
    }
    try {
      if (existsSync(fullPath)) {
        unlinkSync(fullPath)
        deleted += 1
      }
    } catch (error) {
      skipped += 1
      captureException(error, { context: 'deleteNoteAttachmentFiles', filename })
    }
  }

  return { deleted, skipped }
}

/**
 * Every attachment filename that deleting this account will orphan.
 *
 * Note cascades from two directions, so both have to be anticipated:
 * - notes the user wrote (Note.createdById → User, ON DELETE CASCADE)
 * - notes in a household that is about to be deleted (Note.householdId →
 *   Household, ON DELETE CASCADE), which includes notes written by other people
 *
 * A household is only deleted when the departing user owns it and no other
 * OWNER remains — otherwise ownership transfers and the household survives.
 * That condition is mirrored from pages/api/account/delete.ts; the two must
 * agree, or files are either left behind or deleted while still referenced.
 */
export async function collectAttachmentFilenamesForUser(userId: string): Promise<string[]> {
  const [legacyOwned, ownerMemberships] = await Promise.all([
    prisma.household.findMany({ where: { ownerId: userId }, select: { id: true } }),
    prisma.membership.findMany({ where: { userId, role: 'OWNER' }, select: { householdId: true } }),
  ])
  const ownedIds = [...new Set([
    ...legacyOwned.map(household => household.id),
    ...ownerMemberships.map(membership => membership.householdId),
  ])]

  const doomedHouseholdIds: string[] = []
  for (const householdId of ownedIds) {
    const replacement = await prisma.membership.findFirst({
      where: { householdId, role: 'OWNER', userId: { not: userId } },
      select: { id: true },
    })
    if (!replacement) doomedHouseholdIds.push(householdId)
  }

  const attachments = await prisma.noteAttachment.findMany({
    where: {
      note: {
        OR: [
          { createdById: userId },
          ...(doomedHouseholdIds.length ? [{ householdId: { in: doomedHouseholdIds } }] : []),
        ],
      },
    },
    select: { filename: true },
  })

  return attachments.map(attachment => attachment.filename)
}
