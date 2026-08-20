#!/usr/bin/env node
/**
 * Fail the build when an installed dependency has drifted behind its own
 * declared range.
 *
 * `npm ci` already fails when package.json and the lockfile disagree, so the
 * drift it cannot see is the one that actually happened here: package.json said
 * `next-auth: ^4.24.7`, the lockfile resolved 4.24.14, and 4.24.15 — carrying
 * the fix for a critical advisory — had been published for a while. Nothing was
 * wrong with the lockfile. It was simply old, and no gate had an opinion about
 * that.
 *
 * The check is `npm outdated`'s own distinction: `current` is what is installed,
 * `wanted` is the newest release that already satisfies the declared range.
 * Any gap between them is a patch the project has said it wants and has not
 * taken. `latest` is deliberately ignored — a major sitting outside the range is
 * a deliberate holdback (React 18, Prisma 6, Tailwind 3), documented in
 * docs/superpowers/specs/2026-08-03-dependency-hardening-design.md, not drift.
 *
 * This needs registry access, because "newest release inside the range" is not
 * knowable from the lockfile alone. CI already has it for `npm ci`.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

function readOutdated() {
  try {
    // `npm outdated` exits 1 whenever anything is outdated, including the
    // out-of-range majors this script then ignores, so the exit code is not a
    // useful signal on its own.
    return execFileSync('npm', ['outdated', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    if (typeof error.stdout === 'string' && error.stdout.trim()) return error.stdout
    console.error('Could not run `npm outdated --json`:', error.message)
    process.exit(2)
  }
}

const raw = readOutdated().trim()
const report = raw ? JSON.parse(raw) : {}

const drifted = []
const heldBack = []

for (const [name, entry] of Object.entries(report)) {
  // npm reports an array when the same package is present at several versions.
  const records = Array.isArray(entry) ? entry : [entry]
  for (const record of records) {
    const { current, wanted, latest } = record
    // No `current` means the package is not installed in this tree (an optional
    // platform binary, for instance). Nothing has drifted.
    if (!current || !wanted) continue
    if (current !== wanted) {
      drifted.push(`${name}: installed ${current}, but ${wanted} already satisfies the declared range`)
    } else if (latest && latest !== wanted) {
      heldBack.push(`${name}: ${current} (latest ${latest} is outside the declared range)`)
    }
  }
}

for (const note of heldBack) console.log(`held back: ${note}`)

if (drifted.length) {
  console.error('\nDependency freshness check failed.\n')
  for (const line of drifted) console.error(`  ${line}`)
  console.error(
    '\nThese are in-range updates the project has already opted into. Run\n' +
    '`npm update <package>` (or `npm install --legacy-peer-deps` after editing the\n' +
    'range) and commit the lockfile. If a version must be pinned below its range,\n' +
    'narrow the range in package.json so the intent is visible.\n',
  )
  process.exit(1)
}

console.log(`Dependency freshness clean (${heldBack.length} deliberate major holdback(s)).`)
