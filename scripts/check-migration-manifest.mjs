#!/usr/bin/env node
/**
 * Structural validation of prisma/migrations. Runs in CI with no database.
 *
 * This catches the half of migration drift that is visible from the repository
 * alone: a directory with no migration.sql, a stray file that looks like a
 * migration but is not, a duplicated timestamp, or a missing migration_lock.
 *
 * The other half — a migration applied to production that was never committed —
 * is only detectable with the live database, and lives in
 * scripts/check-migration-drift.mjs, which the deploy script runs.
 *
 *   node scripts/check-migration-manifest.mjs
 *
 * Exits non-zero with an explanation on the first category of problem found.
 */

import fs from 'node:fs'
import path from 'node:path'

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..')
const migrationsDir = path.join(root, 'prisma', 'migrations')

const problems = []

if (!fs.existsSync(migrationsDir)) {
  console.error('No prisma/migrations directory.')
  process.exit(1)
}

const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })

if (!entries.some((entry) => entry.isFile() && entry.name === 'migration_lock.toml')) {
  problems.push('prisma/migrations/migration_lock.toml is missing.')
}

for (const entry of entries) {
  if (entry.isFile()) {
    if (entry.name !== 'migration_lock.toml') {
      problems.push(
        `Unexpected file prisma/migrations/${entry.name} — migrations must be directories.`,
      )
    }
    continue
  }
  const sql = path.join(migrationsDir, entry.name, 'migration.sql')
  if (!fs.existsSync(sql)) {
    problems.push(`${entry.name}/ has no migration.sql, so it will never be applied.`)
    continue
  }
  if (fs.readFileSync(sql, 'utf8').trim() === '') {
    problems.push(`${entry.name}/migration.sql is empty.`)
  }
}

const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

// Prisma orders by directory name, so a name that does not start with a
// timestamp sorts unpredictably against the rest.
for (const name of directories) {
  if (!/^\d{3,}(_|$)/.test(name)) {
    problems.push(`${name}/ does not start with a numeric prefix, so its apply order is ambiguous.`)
  }
}

const prefixes = new Map()
for (const name of directories) {
  const prefix = name.split('_')[0]
  prefixes.set(prefix, [...(prefixes.get(prefix) ?? []), name])
}
for (const [prefix, names] of prefixes) {
  if (names.length > 1) {
    problems.push(`Timestamp ${prefix} is used by ${names.length} migrations: ${names.join(', ')}.`)
  }
}

if (problems.length > 0) {
  console.error(`prisma/migrations has ${problems.length} problem(s):\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`prisma/migrations is well-formed: ${directories.length} migrations, all with SQL.`)
