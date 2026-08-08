import assert from 'node:assert/strict'
import test from 'node:test'
import { appleEntitlementActive, mapAppleSubscriptionState } from '../src/lib/billing/apple-subscription-state'

const now = new Date('2026-08-08T12:00:00.000Z')
const inAMonth = new Date('2026-09-08T12:00:00.000Z').getTime()
const lastMonth = new Date('2026-07-08T12:00:00.000Z').getTime()
const opts = { now, graceDays: 7, existingGraceUntil: null }

const event = (over: Partial<Parameters<typeof mapAppleSubscriptionState>[0]>) => ({
  type: 'RENEWAL',
  appUserId: 'user_1',
  originalTransactionId: 'txn_1',
  productId: 'com.clankeep.family.monthly',
  expirationAtMs: inAMonth,
  ...over,
})

test('a purchase or renewal entitles the household until its expiry', () => {
  for (const type of ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']) {
    const state = mapAppleSubscriptionState(event({ type }), opts)
    assert.equal(state.plan, 'FAMILY', `${type} should entitle`)
    assert.equal(state.expiresAt?.getTime(), inAMonth)
    assert.equal(state.graceUntil, null)
  }
})

test('cancelling stops renewal but does not revoke the period already paid for', () => {
  // Apple's CANCELLATION means auto-renew was switched off. Taking access away
  // immediately would remove something the household has already paid for.
  const state = mapAppleSubscriptionState(event({ type: 'CANCELLATION' }), opts)
  assert.equal(state.plan, 'FAMILY')
  assert.equal(state.expiresAt?.getTime(), inAMonth)
})

test('expiry and pause end entitlement', () => {
  for (const type of ['EXPIRATION', 'SUBSCRIPTION_PAUSED']) {
    assert.equal(mapAppleSubscriptionState(event({ type }), opts).plan, 'FREE', `${type} should revoke`)
  }
})

test('a refund revokes immediately and drops the stored subscription reference', () => {
  const state = mapAppleSubscriptionState(event({ type: 'REFUND' }), opts)
  assert.equal(state.plan, 'FREE')
  assert.equal(state.status, 'REFUNDED')
  assert.equal(state.keepSubscriptionRef, false)
  assert.equal(state.graceUntil, null)

  // A refund flagged on some other event type is still a refund.
  const flagged = mapAppleSubscriptionState(event({ type: 'RENEWAL', isRefund: true }), opts)
  assert.equal(flagged.plan, 'FREE')
  assert.equal(flagged.status, 'REFUNDED')
})

test('a billing issue keeps access for a bounded grace window', () => {
  const state = mapAppleSubscriptionState(event({ type: 'BILLING_ISSUE' }), opts)
  assert.equal(state.plan, 'FAMILY')
  assert.equal(state.graceUntil?.toISOString(), '2026-08-15T12:00:00.000Z')
})

test('a repeated billing issue cannot keep extending the grace window', () => {
  // Retried or duplicated webhooks must not roll the deadline forward, which
  // would hand out unlimited free access to a card that never recovers.
  const existingGraceUntil = new Date('2026-08-10T12:00:00.000Z')
  const state = mapAppleSubscriptionState(event({ type: 'BILLING_ISSUE' }), { ...opts, existingGraceUntil })
  assert.equal(state.graceUntil?.getTime(), existingGraceUntil.getTime())
})

test('a replayed event for an elapsed period does not resurrect access', () => {
  const state = mapAppleSubscriptionState(event({ type: 'RENEWAL', expirationAtMs: lastMonth }), opts)
  assert.equal(state.plan, 'FREE')
  assert.equal(state.status, 'EXPIRED')
})

test('an unrecognised event grants nothing', () => {
  const state = mapAppleSubscriptionState(event({ type: 'SOMETHING_NEW' }), opts)
  assert.equal(state.plan, 'FREE')
  assert.equal(state.keepSubscriptionRef, true)
})

test('stored state expires on its own, without an event arriving', () => {
  // Apple sends nothing at the instant a subscription lapses, so the
  // entitlement check cannot trust the stored plan alone.
  assert.equal(appleEntitlementActive({ status: 'RENEWAL', expiresAt: new Date(inAMonth), graceUntil: null }, now), true)
  assert.equal(appleEntitlementActive({ status: 'RENEWAL', expiresAt: new Date(lastMonth), graceUntil: null }, now), false)
  assert.equal(appleEntitlementActive({ status: 'RENEWAL', expiresAt: null, graceUntil: null }, now), false)
})

test('a grace window keeps access even once the paid period has elapsed', () => {
  const graceUntil = new Date('2026-08-15T12:00:00.000Z')
  assert.equal(appleEntitlementActive({ status: 'BILLING_ISSUE', expiresAt: new Date(lastMonth), graceUntil }, now), true)
})

test('a refunded subscription is never active, whatever the dates say', () => {
  assert.equal(
    appleEntitlementActive({ status: 'REFUNDED', expiresAt: new Date(inAMonth), graceUntil: new Date(inAMonth) }, now),
    false,
  )
})
