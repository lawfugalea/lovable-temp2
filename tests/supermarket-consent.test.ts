import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getConsentedSupermarketSlugs,
  isSupermarketComparisonAvailable,
  isSupermarketConsented,
} from '../src/lib/supermarket-consent'

test('supermarket consent is deny-by-default', () => {
  assert.deepEqual(getConsentedSupermarketSlugs({}), [])
  assert.equal(isSupermarketComparisonAvailable({}), false)
  assert.equal(isSupermarketConsented('smart', {}), false)
})

test('only explicitly consented supported retailers are enabled', () => {
  const env = { SUPERMARKET_CONSENTED_STORES: ' Greens,smart,greens,unknown ' }
  assert.deepEqual(getConsentedSupermarketSlugs(env), ['greens', 'smart'])
  assert.equal(isSupermarketComparisonAvailable(env), true)
  assert.equal(isSupermarketConsented('greens', env), true)
  assert.equal(isSupermarketConsented('welbees', env), false)
})

test('Compose-style consent configuration is accepted outside containers', () => {
  const env = { HOUSEFLOW_CONSENTED_SUPERMARKET_STORES: 'welbees' }
  assert.deepEqual(getConsentedSupermarketSlugs(env), ['welbees'])
})
