import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

/**
 * Every API route must either delegate to one of the authorization guards or be
 * a deliberately public route listed below with a reason.
 *
 * The guards themselves are careful and are tested behaviourally in
 * api-authorization.test.ts. What was missing is this: nothing stopped a new
 * route from simply forgetting to call one. In a multi-household app that is the
 * failure that leaks another family's medicine log or bank balances, and it is
 * invisible in review because the omission looks like ordinary code.
 */

const apiRoot = path.join(__dirname, '..', 'src', 'pages', 'api')

/**
 * The names a route can use to reach an authorization decision. Adding a new
 * guard helper means adding it here, which is the intended friction: a guard
 * nobody lists is a guard nobody knows is load-bearing.
 */
const GUARDS = [
  'getUserIdOr401',
  'requireMembershipIn',
  'requireFinanceAccess',
  'requireUser',
  'requireAdmin',
  'requireDebugAccess',
  'requireActiveHousehold',
  'requireHouseholdFeature',
  'getServerSession',
]

/**
 * Routes that answer unauthenticated callers by design. Each needs a reason,
 * because "it was already like that" is how an accidentally public route
 * survives. Paths are relative to src/pages/api.
 */
const PUBLIC_ROUTES: Record<string, string> = {
  'health.ts': 'Liveness probe for the container healthcheck and uptime monitoring.',
  'register.ts': 'Account creation; rate limited and captcha guarded.',
  'geo/country.ts': 'Country hint for the signup form, from request headers only.',
  'captcha/challenge.ts': 'Issues the captcha the public signup form must solve.',
  'invites/validate.ts': 'An invitee is by definition not yet a member; token is the credential.',
  'auth/forgot-password.ts': 'Password reset entry point; responses are deliberately uniform.',
  'auth/reset-password.ts': 'Consumes a single-use emailed token as the credential.',
  'demo/start.ts': 'Seeds a throwaway demo household for an anonymous visitor.',
  'image-proxy.ts':
    'Proxies retailer product images on an allowlist. Rate limited; SSRF-hardened; serves no household data.',
}

/**
 * Routes that intentionally hold no logic of their own and re-export another
 * handler. The guard lives in the target, so follow the delegation instead of
 * demanding a guard reference here.
 */
const DELEGATING_ROUTES: Record<string, string> = {
  'state.ts': 'page-state.ts',
}

function apiRoutes(dir = apiRoot, prefix = ''): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      found.push(...apiRoutes(path.join(dir, entry.name), relative))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      found.push(relative)
    }
  }
  return found.sort()
}

function read(route: string): string {
  return fs.readFileSync(path.join(apiRoot, route), 'utf8')
}

const routes = apiRoutes()

test('the API surface is discovered, not assumed', () => {
  // Guards against the whole suite silently passing because a path changed.
  assert.ok(routes.length > 100, `expected the full API surface, found ${routes.length} routes`)
  assert.ok(routes.includes('health.ts'))
  assert.ok(routes.includes('shopping/category-order.ts'))
  assert.ok(routes.includes('medicine/report-pdf.ts'))
})

test('every API route reaches an authorization guard or is a reviewed public route', () => {
  const unguarded: string[] = []

  for (const route of routes) {
    if (route in PUBLIC_ROUTES) continue

    const source = read(route)

    if (route in DELEGATING_ROUTES) {
      const target = DELEGATING_ROUTES[route]
      const base = target.replace(/\.ts$/, '')
      assert.match(
        source,
        new RegExp(`from\\s+['"]\\./${base}['"]`),
        `${route} is recorded as delegating to ${target} but does not re-export it`,
      )
      continue
    }

    // NextAuth's own catch-all defines the session; it cannot require one.
    if (route.startsWith('auth/[...nextauth]')) continue

    // Worker endpoints authenticate with a shared secret rather than a session.
    const usesSharedSecret = /_SECRET\b/.test(source)
    const usesGuard = GUARDS.some((guard) => source.includes(guard))

    if (!usesGuard && !usesSharedSecret) unguarded.push(route)
  }

  assert.deepEqual(
    unguarded,
    [],
    `these routes reference no authorization guard and are not listed as public:\n  ${unguarded.join('\n  ')}`,
  )
})

test('the public allowlist has no stale entries', () => {
  for (const route of Object.keys(PUBLIC_ROUTES)) {
    assert.ok(
      routes.includes(route),
      `${route} is on the public allowlist but no longer exists — remove it, or the next route at that path is public by accident`,
    )
  }
  for (const route of Object.keys(DELEGATING_ROUTES)) {
    assert.ok(routes.includes(route), `${route} is recorded as delegating but no longer exists`)
  }
})

test('every public route explains why it is public', () => {
  for (const [route, reason] of Object.entries(PUBLIC_ROUTES)) {
    assert.ok(reason.trim().length > 20, `${route} needs a real reason, not "${reason}"`)
  }
})

test('routes that mutate state check the method before doing anything', () => {
  // A handler that never inspects req.method treats GET and DELETE alike, which
  // makes it reachable from a plain <img> tag or a link prefetch.
  const missing: string[] = []
  for (const route of routes) {
    if (route.startsWith('auth/[...nextauth]')) continue
    // Delegating routes inherit the method handling of their target.
    if (route in DELEGATING_ROUTES) continue
    const source = read(route)
    if (!source.includes('req.method') && !source.includes('method !==')) missing.push(route)
  }
  assert.deepEqual(
    missing,
    [],
    `these routes never inspect req.method:\n  ${missing.join('\n  ')}`,
  )
})

test('no route disables its own guard with a bypass flag', () => {
  // Cheap tripwire for the debugging shortcut that gets left behind.
  for (const route of routes) {
    const source = read(route)
    assert.doesNotMatch(
      source,
      /(SKIP_AUTH|DISABLE_AUTH|BYPASS_AUTH|allowAnonymous\s*=\s*true)/,
      `${route} contains an authorization bypass flag`,
    )
  }
})
