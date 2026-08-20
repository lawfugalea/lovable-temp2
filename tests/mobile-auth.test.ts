import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  hashMobileRefreshToken,
  mobileRefreshSessionId,
  mobileRefreshTokenMatches,
} from '../src/lib/mobile-auth-core'

test('mobile refresh tokens expose only a bounded session id prefix', () => {
  assert.equal(mobileRefreshSessionId('session_123.secret-value'), 'session_123')
  assert.equal(mobileRefreshSessionId('missing-secret.'), null)
  assert.equal(mobileRefreshSessionId('.missing-session'), null)
  assert.equal(mobileRefreshSessionId('invalid id.secret'), null)
  assert.equal(mobileRefreshSessionId(`session.${'x'.repeat(300)}`), null)
})

test('mobile refresh tokens are compared as hashes', () => {
  const hash = hashMobileRefreshToken('session.secret-one')
  assert.equal(mobileRefreshTokenMatches('session.secret-one', hash), true)
  assert.equal(mobileRefreshTokenMatches('session.secret-two', hash), false)
})

test('mobile session migration is additive and cascades only with its user', () => {
  const sql = readFileSync('prisma/migrations/20260720210000_mobile_sessions/migration.sql', 'utf8')
  assert.match(sql, /CREATE TABLE "MobileSession"/)
  assert.match(sql, /UNIQUE INDEX "MobileSession_refreshTokenHash_key"/)
  assert.match(sql, /REFERENCES "User"\("id"\) ON DELETE CASCADE/)
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/)
})

test('mobile client coalesces concurrent refreshes and retries with the newest access token', () => {
  const provider = readFileSync('apps/mobile/src/auth/AuthProvider.tsx', 'utf8')
  assert.match(provider, /refreshPromiseRef/)
  assert.match(provider, /if \(refreshPromiseRef\.current\) return refreshPromiseRef\.current/)
  assert.match(provider, /latest\.accessToken !== current\.accessToken/)
  assert.match(provider, /refreshOnce\(current\.refreshToken\)/)
})
