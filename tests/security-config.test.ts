import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

test('production responses include baseline browser security headers', async () => {
  // The test runner is not in development mode, so this exercises the
  // production branch without mutating Node's read-only NODE_ENV typing.
  const config = require('../next.config.js')
  const rules = await config.headers()
  const catchAll = rules.find((rule: { source: string }) => rule.source === '/:path*')
  const headers = new Map(catchAll.headers.map((header: { key: string; value: string }) => [header.key, header.value]))
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(headers.get('X-Frame-Options'), 'DENY')
  assert.match(String(headers.get('Content-Security-Policy')), /object-src 'none'/)
  assert.match(String(headers.get('Content-Security-Policy')), /frame-ancestors 'none'/)
})

test('private legacy uploads are excluded from production images', () => {
  const dockerignore = readFileSync(join(process.cwd(), '.dockerignore'), 'utf8')
  assert.match(dockerignore, /^public\/uploads$/m)
})

test('production compose config supplies the verified invitation sender', () => {
  const compose = readFileSync(join(process.cwd(), 'docker-compose.yml'), 'utf8')
  assert.match(compose, /INVITES_FROM:.*noreply@clankeep\.com/)
  assert.match(compose, /INVITES_FROM_DOMAIN:.*clankeep\.com/)
})

test('read-only price worker keeps Chromium state on its writable tmpfs', () => {
  const compose = readFileSync(join(process.cwd(), 'docker-compose.yml'), 'utf8')
  assert.match(compose, /price-sync:[\s\S]*?read_only: true[\s\S]*?HOME: \/tmp\/priceworker/)
  assert.match(compose, /price-sync:[\s\S]*?XDG_CONFIG_HOME: \/tmp\/priceworker\/\.config/)
  assert.match(compose, /price-sync:[\s\S]*?XDG_CACHE_HOME: \/tmp\/priceworker\/\.cache/)
})

test("script-src allows no inline scripts beyond the themed one", async () => {
  const config = require('../next.config.js')
  const rules = await config.headers()
  const catchAll = rules.find((rule: { source: string }) => rule.source === '/:path*')
  const csp = String(
    catchAll.headers.find((header: { key: string }) => header.key === 'Content-Security-Policy')
      .value,
  )
  const scriptSrc = csp.split('; ').find((directive) => directive.startsWith('script-src'))!

  // 'unsafe-inline' here would silently re-open the XSS hole the rest of this
  // policy is paying to close, and it would still pass the assertions above.
  assert.doesNotMatch(scriptSrc, /unsafe-inline/, `script-src must not allow inline scripts: ${scriptSrc}`)
  assert.doesNotMatch(scriptSrc, /unsafe-eval/, `script-src must not allow eval: ${scriptSrc}`)
  assert.match(scriptSrc, /'sha256-[A-Za-z0-9+/]+={0,2}'/, 'expected the theme script to be allowed by hash')
})

test('the CSP allows exactly one inline script hash', async () => {
  // Deliberately structural, not a recomputation of the hash.
  //
  // next-themes builds its snippet by stringifying a real function, so the
  // identifiers inside it come from whichever minifier processed it — Next's
  // production build. Rendering the component here under ts-node produces
  // different minified names and therefore a different hash, so a test that
  // recomputed the value would be comparing against the wrong artifact.
  //
  // The hash is instead verified against a real built response by
  // scripts/check-csp-theme-hash.mjs, which the deploy script runs. What this
  // test protects is the shape: one hash, and no blanket inline allowance.
  const config = require('../next.config.js')
  const rules = await config.headers()
  const catchAll = rules.find((rule: { source: string }) => rule.source === '/:path*')
  const csp = String(
    catchAll.headers.find((header: { key: string }) => header.key === 'Content-Security-Policy')
      .value,
  )
  const scriptSrc = csp.split('; ').find((directive) => directive.startsWith('script-src'))!
  const hashes = scriptSrc.match(/'sha256-[A-Za-z0-9+/]+={0,2}'/g) ?? []

  assert.equal(
    hashes.length,
    1,
    `expected exactly one allowed inline script hash, found ${hashes.length}: ${scriptSrc}`,
  )
})

test('react strict mode stays on so effect-cleanup bugs surface in development', () => {
  const config = require('../next.config.js')
  assert.equal(config.reactStrictMode, true)
})
