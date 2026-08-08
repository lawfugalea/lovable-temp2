#!/usr/bin/env node
/**
 * Delete note-attachment images that no longer have a database row.
 *
 * Until 20260726 the delete paths removed NoteAttachment rows (by cascade) but
 * never the files, so every note or account ever deleted left its images on the
 * uploads volume. Those files are now unreachable — no row names them, so the
 * application can never serve them — but they still occupy disk and still
 * contain personal data belonging to accounts that asked to be erased.
 *
 * The delete paths handle this going forward; this clears the backlog.
 *
 * Runs read-only by default and prints what it would remove:
 *
 *   node scripts/sweep-orphan-uploads.mjs
 *   node scripts/sweep-orphan-uploads.mjs --delete
 *
 * Safe to run against production: it only ever considers files matching the
 * application's own generated filename pattern, and only deletes those with no
 * matching NoteAttachment row.
 */
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const APPLY = process.argv.includes('--delete')

/** Must match pages/api/uploads/note-image.ts. */
const uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
const uploadDir = join(uploadRoot, 'notes')
const SAFE_FILE_RE = /^note-[0-9]+-[a-z0-9]+(?:\.(jpg|jpeg|png|gif|webp))?$/i

/**
 * Files younger than this are never touched. An upload writes the file first
 * and creates its row immediately after; without a grace period a sweep running
 * in that window would delete a live attachment.
 */
const MIN_AGE_MS = 60 * 60 * 1000

async function main() {
  const prisma = new PrismaClient()
  try {
    let names
    try {
      names = readdirSync(uploadDir)
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`No upload directory at ${uploadDir} — nothing to sweep.`)
        return
      }
      throw error
    }

    const candidates = names.filter(name => SAFE_FILE_RE.test(name))
    const skippedUnknown = names.length - candidates.length

    const rows = await prisma.noteAttachment.findMany({ select: { filename: true } })
    const referenced = new Set(rows.map(row => row.filename))

    const now = Date.now()
    let deleted = 0
    let bytes = 0
    let tooNew = 0

    for (const name of candidates) {
      if (referenced.has(name)) continue

      const fullPath = join(uploadDir, name)
      let stats
      try {
        stats = statSync(fullPath)
      } catch {
        continue
      }
      if (now - stats.mtimeMs < MIN_AGE_MS) {
        tooNew += 1
        continue
      }

      bytes += stats.size
      deleted += 1
      if (APPLY) {
        try {
          unlinkSync(fullPath)
        } catch (error) {
          console.error(`Could not delete ${name}: ${error.message}`)
          deleted -= 1
          bytes -= stats.size
        }
      } else {
        console.log(`orphan: ${name} (${(stats.size / 1024).toFixed(0)} KB)`)
      }
    }

    const megabytes = (bytes / (1024 * 1024)).toFixed(1)
    console.log(
      APPLY
        ? `Deleted ${deleted} orphaned file(s), freeing ${megabytes} MB.`
        : `Found ${deleted} orphaned file(s) totalling ${megabytes} MB. Re-run with --delete to remove them.`,
    )
    if (tooNew > 0) console.log(`Skipped ${tooNew} file(s) newer than the grace period.`)
    if (skippedUnknown > 0) console.log(`Ignored ${skippedUnknown} file(s) not matching the app's naming pattern.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
