#!/usr/bin/env node
/**
 * Verify that every executable inline script a real response serves is allowed
 * by the Content-Security-Policy in next.config.js.
 *
 * Why this cannot be a unit test: the app's single inline script is next-themes'
 * flash-prevention snippet, and next-themes produces it by stringifying a real
 * function. The identifiers inside it therefore come from whichever minifier
 * processed the function — Next's production build. Rendering the component in a
 * test yields different minified names and a different hash, so the only honest
 * source of truth is a built response.
 *
 * If the hash is stale the browser blocks the script, the theme class is never
 * set before paint, and the app loads unthemed. Nothing throws; it just looks
 * wrong. Hence this check.
 *
 *   node scripts/check-csp-theme-hash.mjs [url]
 *
 * Default url is http://127.0.0.1:8097/landing — the local production container.
 * Exit codes: 0 every inline script is allowed, 1 a hash is missing or stale,
 * 2 the page could not be fetched.
 */

import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const target = process.argv[2] ?? 'http://127.0.0.1:8097/landing'
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..')

const { default: nextConfig } = await import(
  pathToFileURL(path.join(root, 'next.config.js')).href
)

const rules = await nextConfig.headers()
const catchAll = rules.find((rule) => rule.source === '/:path*')
const csp = catchAll?.headers?.find((header) => header.key === 'Content-Security-Policy')?.value
if (!csp) {
  console.error('next.config.js does not set a Content-Security-Policy for /:path*')
  process.exit(1)
}
const scriptSrc = csp.split('; ').find((directive) => directive.startsWith('script-src')) ?? ''

let html
try {
  const response = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  html = await response.text()
} catch (error) {
  console.error(`Could not fetch ${target}: ${error.message}`)
  console.error('Start the app first, or pass a URL that is already serving.')
  process.exit(2)
}

// Executable inline scripts only: a data block such as
// <script id="__NEXT_DATA__" type="application/json"> is never executed, so the
// browser raises no CSP violation for it.
const inline = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(([, attributes]) => !/\bsrc=/.test(attributes))
  .filter(([, attributes]) => {
    const type = attributes.match(/\btype=["']([^"']+)["']/)
    if (!type) return true
    const value = type[1].toLowerCase()
    return value === 'text/javascript' || value === 'module' || value === 'application/javascript'
  })
  .map(([, , body]) => body)

if (scriptSrc.includes("'unsafe-inline'")) {
  console.error("script-src still allows 'unsafe-inline'; the hash allowlist is not in effect.")
  process.exit(1)
}

console.log(`${target}`)
console.log(`script-src (from next.config.js): ${scriptSrc}`)
console.log(`executable inline scripts: ${inline.length}`)

const stale = []
for (const body of inline) {
  const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`
  const allowed = scriptSrc.includes(hash)
  console.log(`  ${allowed ? 'allowed' : 'BLOCKED'}  ${hash}  (${body.length} chars)`)
  if (!allowed) stale.push({ hash, body })
}

if (stale.length > 0) {
  console.error(
    `\n${stale.length} inline script(s) would be blocked by the CSP. Either the snippet changed\n` +
      'or a new inline script was introduced. If it is the theme snippet, set\n' +
      `THEME_SCRIPT_HASH in next.config.js to:\n\n  ${stale[0].hash}\n`,
  )
  console.error('First 200 characters of the blocked script:')
  console.error(`  ${stale[0].body.slice(0, 200)}`)
  process.exit(1)
}

console.log('\nEvery inline script this page serves is allowed by the CSP.')
