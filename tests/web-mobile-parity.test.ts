import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { MOBILE_CHORE_ICON_IDS } from '../packages/contracts'

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
  pantry: 'NOT YET BUILT for mobile.',
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

test('chore icons offered to the phone all exist in the web registry', () => {
  // The two clients render different icon sets, but they must agree on which
  // ids are valid, or a chore created on one shows as blank on the other.
  const registry = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'chore-icons.ts'), 'utf8')
  const body = registry.split('CHORE_ICONS = {')[1].split('} satisfies')[0]
  const webIds = new Set([...body.matchAll(/^\s*'?([a-z-]+)'?:/gm)].map(match => match[1]))

  const missing = MOBILE_CHORE_ICON_IDS.filter(id => !webIds.has(id))
  assert.deepEqual(missing, [], `the app offers icon ids the web does not know:\n  ${missing.join(', ')}`)
})

test('the phone maps every chore icon the web can produce', () => {
  const map = fs.readFileSync(path.join(__dirname, '..', 'apps', 'mobile', 'src', 'choreIcons.ts'), 'utf8')
  const unmapped = MOBILE_CHORE_ICON_IDS.filter(id => !map.includes(`${/^[a-z]+$/.test(id) ? id : `'${id}'`}:`))
  assert.deepEqual(unmapped, [], `these icon ids have no Ionicons mapping:\n  ${unmapped.join(', ')}`)
})
