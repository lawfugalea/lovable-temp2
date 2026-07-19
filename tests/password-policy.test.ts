import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePassword } from '../src/lib/password-policy'

test('password policy accepts a sufficiently strong password', () => {
  assert.deepEqual(validatePassword('CorrectHorse7'), [])
  // No composition rules: length is what matters (NIST 800-63B).
  assert.deepEqual(validatePassword('correct horse battery'), [])
  assert.deepEqual(validatePassword('12341234'), [])
})

test('password policy rejects short and common passwords', () => {
  assert.ok(validatePassword('short').some(error => error.includes('8 characters')))
  assert.ok(validatePassword('Pass1').some(error => error.includes('8 characters')))
  assert.ok(validatePassword('Password123').some(error => error.includes('common')))
  assert.ok(validatePassword('12345678').some(error => error.includes('common')))
})

test('password policy rejects non-string and oversized input', () => {
  assert.deepEqual(validatePassword(undefined), ['Password is required'])
  assert.ok(validatePassword(`Aa1${'x'.repeat(126)}`).some(error => error.includes('less than 128')))
})
