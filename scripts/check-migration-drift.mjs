#!/usr/bin/env node
/**
 * Compare the migrations recorded in the live database against the directories
 * committed to this repository, in both directions.
 *
 * Why this exists: on 2026-07-20 a migration was applied to production that has
 * no directory in the repo, so a rebuilt environment silently differs from prod.
 * `prisma migrate status` does not surface that — once nothing is pending it
 * just prints "Database schema is up to date!" and the extra row stays hidden.
 * This checks the rows directly.
 *
 *   node scripts/check-migration-drift.mjs
 *
 * Read-only: it issues one SELECT against _prisma_migrations through the
 * existing db service, exactly like scripts/backup-houseflow-db.sh does for
 * pg_dump. It never writes, and it never invokes prisma.
 *
 * Exit codes: 0 in sync, 1 drift found, 2 could not reach the database.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const migrationsDir = path.join(root, 'prisma', 'migrations')

const onDisk = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

let rows
try {
  const output = execFileSync(
    'docker',
    [
      'compose',
      '--env-file',
      '.env.deploy',
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'houseflow',
      '-d',
      'houseflow',
      '-At',
      '-F',
      '\t',
      '-c',
      'SELECT migration_name, finished_at IS NULL FROM _prisma_migrations ORDER BY migration_name',
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  rows = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, unfinished] = line.split('\t')
      return { name, unfinished: unfinished === 't' }
    })
} catch (error) {
  console.error('Could not read _prisma_migrations from the db service.')
  console.error(String(error.stderr || error.message).trim())
  process.exit(2)
}

const applied = rows.map((row) => row.name)
const appliedSet = new Set(applied)
const diskSet = new Set(onDisk)

const missingLocally = applied.filter((name) => !diskSet.has(name))
const notYetApplied = onDisk.filter((name) => !appliedSet.has(name))
const unfinished = rows.filter((row) => row.unfinished).map((row) => row.name)

console.log(`${onDisk.length} migration directories in the repo.`)
console.log(`${applied.length} rows in _prisma_migrations.`)

if (missingLocally.length > 0) {
  console.error(
    `\nDRIFT: ${missingLocally.length} migration(s) applied to this database have no directory in the repo:`,
  )
  for (const name of missingLocally) console.error(`  - ${name}`)
  console.error(
    '\nThe repo is not a complete description of this schema. Recover the SQL\n' +
      'before relying on the repo to rebuild the database.',
  )
}

if (unfinished.length > 0) {
  console.error(`\nUNFINISHED: ${unfinished.length} migration(s) started but never completed:`)
  for (const name of unfinished) console.error(`  - ${name}`)
}

if (notYetApplied.length > 0) {
  // Expected before a deploy; reported so the operator can tell the difference
  // between "pending" and "drifted".
  console.log(`\nPending (in the repo, not yet applied here): ${notYetApplied.length}`)
  for (const name of notYetApplied) console.log(`  - ${name}`)
}

if (missingLocally.length > 0 || unfinished.length > 0) process.exit(1)

console.log('\nNo drift: every applied migration is committed.')
