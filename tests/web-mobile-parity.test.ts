import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

/**
 * Web and mobile are meant to stay in step. They drifted badly once already:
 * the phone quietly lacked savings accounts, chore icons, the pantry and
 * recurring shopping templates, and nobody noticed because nothing failed.
 *
 * This is the tripwire. A web feature area either has a mobile counterpart, or
 * it is listed below with a reason. Adding a web feature and forgetting the
 * phone now breaks the build instead of surprising a user.
 */

const apiRoot = path.join(__dirname, '..', 'src', 'pages', 'api')

/**
 * Web feature areas the app deliberately does not carry, each with the reason.
 * "Not built yet" is a legitimate reason — it just has to be a written decision
 * rather than an oversight.
 */
const WEB_ONLY: Record<string, string> = {
  admin: 'Operator tooling for the maintainer, not a household feature.',
  debug: 'Diagnostics for the maintainer only.',
  internal: 'Server-to-server endpoints for scheduled workers.',
  billing: 'Stripe web checkout. iOS purchases go through RevenueCat instead.',
  demo: 'The anonymous demo household is a website landing-page flow.',
  auth: 'NextAuth browser sessions. The app has its own bearer-token routes.',
  captcha: 'Serves the public web signup form; the app re-exports it.',
  geo: 'Country hint for the web signup form.',
  invites: 'Public invite acceptance happens in a browser from an email link.',
  register: 'Public web signup; the app re-exports the same handler.',
  uploads: 'Serves stored files to the browser.',
  prices: 'Supermarket comparison is parked pending written retailer consent.',
  health: 'Liveness probe for the container healthcheck.',
  'page-state': 'Browser page state persistence.',
  state: 'Browser page state persistence.',
  'image-proxy': 'Proxies retailer images for the browser.',
}

/** Web areas whose mobile counterpart lives under a different name. */
const ALIASES: Record<string, string> = {
  household: 'household',
  finance: 'finance',
  notes: 'notes',
  chores: 'chores',
  meals: 'meals',
  medicine: 'medicine',
  shopping: 'shopping',
  account: 'account',
}

function topLevelAreas(dir: string): Set<string> {
  const found = new Set<string>()
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'mobile') continue
    found.add(entry.isDirectory() ? entry.name : entry.name.replace(/\.tsx?$/, ''))
  }
  return found
}

test('every web feature area is on the phone or is a written web-only decision', () => {
  const web = topLevelAreas(apiRoot)
  const mobile = topLevelAreas(path.join(apiRoot, 'mobile', 'v1'))

  const unexplained: string[] = []
  for (const area of web) {
    if (mobile.has(ALIASES[area] ?? area)) continue
    if (area in WEB_ONLY) continue
    unexplained.push(area)
  }

  assert.deepEqual(
    unexplained,
    [],
    `these web areas have no mobile counterpart and no recorded reason:\n  ${unexplained.join('\n  ')}\n` +
      'Either add the mobile route, or add an entry to WEB_ONLY explaining why the phone does without it.',
  )
})

test('every web-only exemption gives a real reason', () => {
  for (const [area, reason] of Object.entries(WEB_ONLY)) {
    assert.ok(reason.trim().length > 15, `${area} needs a real reason, not "${reason}"`)
  }
})

test('the web-only list has no stale entries', () => {
  const web = topLevelAreas(apiRoot)
  const stale = Object.keys(WEB_ONLY).filter(area => !web.has(area))
  assert.deepEqual(stale, [], `these are exempted but no longer exist on the web:\n  ${stale.join('\n  ')}`)
})

function iconIds(source: string, open: string, close: string): Set<string> {
  const body = source.split(open)[1].split(close)[0]
  return new Set([...body.matchAll(/^\s*'?([a-z-]+)'?:/gm)].map(match => match[1]))
}

test('the phone maps every chore icon the web can produce, and invents none', () => {
  // The two clients render different icon sets — lucide on the web, Ionicons on
  // the phone — but they must agree on which ids exist, or a chore created on
  // one shows blank on the other.
  //
  // Read from source rather than imported: @clankeep/contracts is types-only, so
  // a value shared through it typechecks but fails to bundle in Metro.
  const web = iconIds(fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'chore-icons.ts'), 'utf8'), 'CHORE_ICONS = {', '} satisfies')
  const app = iconIds(fs.readFileSync(path.join(__dirname, '..', 'apps', 'mobile', 'src', 'choreIcons.ts'), 'utf8'), 'const ICONS = {', '} satisfies')

  const unmapped = [...web].filter(id => !app.has(id))
  assert.deepEqual(unmapped, [], `the web can produce these icons but the phone cannot draw them:\n  ${unmapped.join(', ')}`)

  const invented = [...app].filter(id => !web.has(id))
  assert.deepEqual(invented, [], `the phone offers icon ids the web does not know:\n  ${invented.join(', ')}`)
})

test('no runtime value is imported from the types-only contracts package', () => {
  // @clankeep/contracts exposes only a "types" export, so a value imported from
  // it passes tsc and then fails the EAS bundle step. That cost a build once.
  const appDir = path.join(__dirname, '..', 'apps', 'mobile')
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!/\.tsx?$/.test(entry.name)) continue
      const source = fs.readFileSync(full, 'utf8')
      // Matched as whole statements: a type-only import is routinely spread
      // across several lines, so checking line by line reports false positives.
      for (const match of source.matchAll(/import\s+(type\s+)?[^;]*?from\s*'@clankeep\/contracts'/g)) {
        if (!match[1]) offenders.push(path.relative(appDir, full))
      }
    }
  }
  walk(path.join(appDir, 'app'))
  walk(path.join(appDir, 'src'))
  assert.deepEqual(offenders, [], `these import a runtime value from a types-only package:\n  ${offenders.join('\n  ')}`)
})
