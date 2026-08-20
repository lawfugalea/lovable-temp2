import assert from 'node:assert/strict'
import test from 'node:test'
import { createInviteToken, hashInviteToken, normalizeInviteToken } from '../src/lib/invite-tokens'

test('invite tokens are random bearer secrets stored only as deterministic hashes', () => {
  const first = createInviteToken()
  const second = createInviteToken()

  assert.match(first, /^[a-f0-9]{64}$/)
  assert.notEqual(first, second)
  assert.match(hashInviteToken(first), /^[a-f0-9]{64}$/)
  assert.notEqual(hashInviteToken(first), first)
  assert.equal(hashInviteToken(first), hashInviteToken(first))
})

test('invite token normalization rejects malformed and oversized input', () => {
  assert.equal(normalizeInviteToken('  valid_token-123  '), 'valid_token-123')
  assert.equal(normalizeInviteToken('contains spaces'), null)
  assert.equal(normalizeInviteToken('contains?query'), null)
  assert.equal(normalizeInviteToken('x'.repeat(257)), null)
  assert.equal(normalizeInviteToken(undefined), null)
})
