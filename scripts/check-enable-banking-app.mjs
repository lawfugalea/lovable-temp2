#!/usr/bin/env node
/**
 * Compare the redirect URL this deployment sends against the ones Enable Banking
 * has registered for the application.
 *
 * Why this exists: Enable Banking matches the redirect URI byte-for-byte and, on
 * a mismatch, answers only `Redirect URI not allowed` — it never says which URI
 * it rejected or what it expected. So a host or base-path change silently breaks
 * every new authorization while existing consents keep syncing, which reads as an
 * app bug rather than provider configuration. The registered list is read-only
 * over the API: it can only be changed in the control panel at
 * https://enablebanking.com/cp/applications (or via their support).
 *
 *   node scripts/check-enable-banking-app.mjs
 *
 * Reads ENABLE_BANKING_* and APP_URL from the environment, falling back to .env.
 * Exit codes: 0 the redirect URL is registered, 1 it is not, 2 the application
 * could not be read.
 */

import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

function loadEnvFile(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].trim().replace(/^"(.*)"$/, '$1')
      }
    }
  } catch {
    // An absent .env is fine; the environment may already carry the values.
  }
}

function privateKey() {
  const configured = process.env.ENABLE_BANKING_PRIVATE_KEY?.trim()
  if (configured) return configured.includes('\\n') ? configured.replace(/\\n/g, '\n') : configured
  const encoded = process.env.ENABLE_BANKING_PRIVATE_KEY_BASE64?.trim()
  if (encoded) return Buffer.from(encoded, 'base64').toString('utf8')
  return null
}

function jwt(applicationId, key) {
  const base64url = value => Buffer.from(value).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const unsigned = [
    base64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: applicationId })),
    base64url(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat, exp: iat + 300 })),
  ].join('.')
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  return `${unsigned}.${signer.sign(key).toString('base64url')}`
}

function expectedRedirectUrl() {
  const override = process.env.ENABLE_BANKING_REDIRECT_URL?.trim()
  if (override) return override
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return new URL('api/finance/callback', `${base.replace(/\/$/, '')}/`).toString()
}

loadEnvFile('.env')

const applicationId = process.env.ENABLE_BANKING_APPLICATION_ID?.trim()
const key = privateKey()
if (!applicationId || !key) {
  console.error('ENABLE_BANKING_APPLICATION_ID and a private key are required.')
  process.exit(2)
}

let application
try {
  const response = await fetch('https://api.enablebanking.com/application', {
    headers: { Accept: 'application/json', Authorization: `Bearer ${jwt(applicationId, key)}` },
  })
  if (!response.ok) {
    console.error(`Enable Banking answered ${response.status} for GET /application.`)
    process.exit(2)
  }
  application = await response.json()
} catch (error) {
  console.error(`Could not reach Enable Banking: ${error.message}`)
  process.exit(2)
}

const registered = Array.isArray(application.redirect_urls) ? application.redirect_urls : []
const expected = expectedRedirectUrl()

console.log(`application: ${application.name} (${application.environment}, active: ${application.active})`)
console.log(`this deployment sends: ${expected}`)
console.log('registered redirect URLs:')
for (const url of registered) console.log(`  ${url === expected ? '✓' : ' '} ${url}`)
if (!registered.length) console.log('  (none)')

if (registered.includes(expected)) {
  console.log('\nThe redirect URL is registered. Authorization can start.')
  process.exit(0)
}

console.log(`
Not registered, so every new authorization fails with "Redirect URI not allowed"
while existing consents keep syncing. Add the URL above at
https://enablebanking.com/cp/applications — the API cannot change it — or point
ENABLE_BANKING_REDIRECT_URL at one of the registered URLs.`)
process.exit(1)
