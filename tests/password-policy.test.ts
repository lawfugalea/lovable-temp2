import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePassword } from '../src/lib/password-policy'

test('password policy accepts a sufficiently strong password', () => {
  assert.deepEqual(validatePassword('CorrectHorse7'), [])
})

test('password policy rejects short, incomplete, and common passwords', () => {
  assert.ok(validatePassword('short').length > 0)
  assert.ok(validatePassword('ValidPass1').some(error => error.includes('12 characters')))
  assert.ok(validatePassword('alllowercase1').some(error => error.includes('uppercase')))
  assert.ok(validatePassword('Password123').some(error => error.includes('common')))
})

test('password policy rejects non-string and oversized input', () => {
  assert.deepEqual(validatePassword(undefined), ['Password is required'])
  assert.ok(validatePassword(`Aa1${'x'.repeat(126)}`).some(error => error.includes('less than 128')))
})
