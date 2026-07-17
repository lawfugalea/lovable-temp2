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
  assert.match(compose, /INVITES_FROM:.*no-reply@galeahub\.online/)
})
