import assert from 'node:assert/strict'
import test from 'node:test'
import { isPasswordVersionCurrent, passwordVersion } from '../src/lib/session-security'

test('password versions match only the bcrypt hash used to issue the session', () => {
  const originalHash = '$2b$12$original-password-hash-placeholder'
  const changedHash = '$2b$12$changed-password-hash-placeholder'
  const version = passwordVersion(originalHash)

  assert.equal(isPasswordVersionCurrent(version, originalHash), true)
  assert.equal(isPasswordVersionCurrent(version, changedHash), false)
  assert.equal(isPasswordVersionCurrent(undefined, originalHash), false)
  assert.equal(version.includes(originalHash), false)
})
