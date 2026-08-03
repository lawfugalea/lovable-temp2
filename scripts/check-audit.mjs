#!/usr/bin/env node
/**
 * Fail the build on a known-vulnerable dependency.
 *
 * Written because nothing watched this. Between 2026-07-16 and 2026-08-03 the
 * tree accumulated a critical next-auth advisory, nine Next.js advisories, four
 * libvips CVEs through sharp, and a postcss file-read issue — while `npm audit`
 * was reporting all of them to anyone who happened to run it by hand. A gate is
 * the only version of this that survives a busy month.
 *
 * `npm audit` cannot express "this one, deliberately, until this date", so the
 * suppression list lives in audit-exceptions.json and is enforced here:
 *
 *   - an advisory with a matching unexpired exception is reported and allowed;
 *   - an expired exception fails the build, whether or not the advisory is still
 *     present, so suppressions cannot rot into permanent blind spots;
 *   - anything else at or above the severity floor fails the build.
 *
 * Runs `npm audit --json` itself rather than parsing piped output, so a
 * non-zero exit from npm cannot be swallowed by a shell pipeline.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical']
const FLOOR = process.env.AUDIT_SEVERITY_FLOOR || 'moderate'

if (!SEVERITY_ORDER.includes(FLOOR)) {
  console.error(`Unknown AUDIT_SEVERITY_FLOOR "${FLOOR}"; expected one of ${SEVERITY_ORDER.join(', ')}.`)
  process.exit(2)
}

function atOrAboveFloor(severity) {
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(FLOOR)
}

function readAudit() {
  try {
    // npm audit exits non-zero when it finds anything, which is the normal case
    // here, so the output is what matters rather than the exit code.
    return execFileSync('npm', ['audit', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    if (typeof error.stdout === 'string' && error.stdout.trim()) return error.stdout
    console.error('Could not run `npm audit --json`:', error.message)
    process.exit(2)
  }
}

const report = JSON.parse(readAudit())

const raw = JSON.parse(readFileSync(path.join(ROOT, 'audit-exceptions.json'), 'utf8'))
const exceptions = Array.isArray(raw.exceptions) ? raw.exceptions : []

// Compared as a date-only string so the result does not depend on the runner's
// timezone: an exception expires at the end of the named day, everywhere.
const today = new Date().toISOString().slice(0, 10)
const failures = []
const allowed = []

for (const [index, entry] of exceptions.entries()) {
  const where = `audit-exceptions.json entry ${index + 1}`
  for (const field of ['advisory', 'package', 'reason', 'expires']) {
    if (!entry[field]) failures.push(`${where} is missing required field "${field}".`)
  }
  if (entry.expires && !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) {
    failures.push(`${where} has expires="${entry.expires}"; expected YYYY-MM-DD.`)
  } else if (entry.expires && entry.expires < today) {
    failures.push(
      `${where} expired on ${entry.expires} (${entry.advisory}, ${entry.package}). ` +
      'Upgrade the dependency, or consciously renew the exception with a new date and reason.',
    )
  }
}

const unexpired = new Set(
  exceptions
    .filter((entry) => entry.expires && entry.expires >= today && entry.advisory)
    .map((entry) => entry.advisory),
)

for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
  if (!atOrAboveFloor(vulnerability.severity)) continue

  // `via` mixes advisory objects with plain package-name strings for indirect
  // paths; only the objects carry a GHSA url to match an exception against.
  const advisories = (vulnerability.via ?? []).filter((via) => typeof via === 'object')
  const ids = advisories.map((via) => {
    const match = /GHSA-[a-z0-9-]+/i.exec(via.url ?? '')
    return match ? match[0] : String(via.source ?? via.title ?? 'unknown')
  })

  const unexcepted = ids.filter((id) => !unexpired.has(id))
  if (ids.length && unexcepted.length === 0) {
    allowed.push(`${name} (${vulnerability.severity}): allowed by unexpired exception`)
    continue
  }

  const titles = advisories.map((via) => `      - ${via.title ?? 'untitled'} (${via.url ?? 'no url'})`)
  failures.push(
    `${name} — ${vulnerability.severity}, range ${vulnerability.range}\n${titles.join('\n')}\n` +
    `      fixAvailable: ${JSON.stringify(vulnerability.fixAvailable)}`,
  )
}

for (const note of allowed) console.log(`note: ${note}`)

if (failures.length) {
  console.error(`\nDependency audit failed (severity floor: ${FLOOR}).\n`)
  for (const failure of failures) console.error(`  ${failure}\n`)
  console.error(
    'Fix by upgrading. If and only if no fixed version exists, add a dated entry to\n' +
    'audit-exceptions.json explaining why the risk is acceptable meanwhile.\n',
  )
  process.exit(1)
}

const counted = Object.keys(report.vulnerabilities ?? {}).length
console.log(`Dependency audit clean at severity floor ${FLOOR} (${counted} advisory group(s) considered).`)
