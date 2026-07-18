import assert from 'node:assert/strict'
import test from 'node:test'
import Stripe from 'stripe'
import { mapSubscriptionState } from '../src/lib/billing/subscription-state'

const NOW = new Date('2026-07-19T12:00:00Z')
const OPTS = { now: NOW, graceDays: 7, existingGraceUntil: null }
const PERIOD_END = 1790000000

function sub(status: string, periodEnd: number | null = PERIOD_END) {
  return { status, items: { data: [{ current_period_end: periodEnd }] } }
}

test('active and trialing subscriptions map to Family with no grace', () => {
  for (const status of ['active', 'trialing']) {
    const state = mapSubscriptionState(sub(status), OPTS)
    assert.equal(state.plan, 'FAMILY')
    assert.equal(state.keepSubscriptionRef, true)
    assert.equal(state.graceUntil, null)
    assert.equal(state.currentPeriodEnd?.getTime(), PERIOD_END * 1000)
  }
})

test('past_due keeps Family and starts a bounded grace window exactly once', () => {
  const first = mapSubscriptionState(sub('past_due'), OPTS)
  assert.equal(first.plan, 'FAMILY')
  assert.equal(first.graceUntil?.getTime(), NOW.getTime() + 7 * 24 * 3600 * 1000)

  const existing = new Date('2026-07-20T00:00:00Z')
  const second = mapSubscriptionState(sub('past_due'), { ...OPTS, existingGraceUntil: existing })
  assert.equal(second.graceUntil?.getTime(), existing.getTime(), 'retries must not extend grace')
})

test('lapsed statuses drop to Free and clear the subscription reference', () => {
  for (const status of ['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'paused']) {
    const state = mapSubscriptionState(sub(status), OPTS)
    assert.equal(state.plan, 'FREE')
    assert.equal(state.keepSubscriptionRef, false)
    assert.equal(state.graceUntil, null)
  }
})

test('unknown statuses are conservative: Free but reference retained', () => {
  const state = mapSubscriptionState(sub('some_future_status'), OPTS)
  assert.equal(state.plan, 'FREE')
  assert.equal(state.keepSubscriptionRef, true)
})

test('legacy top-level current_period_end is honoured', () => {
  const state = mapSubscriptionState({ status: 'active', current_period_end: PERIOD_END }, OPTS)
  assert.equal(state.currentPeriodEnd?.getTime(), PERIOD_END * 1000)
})

test('webhook signature verification accepts a valid header and rejects tampering', () => {
  const stripe = new Stripe('sk_test_dummy')
  const secret = 'whsec_test_secret'
  const payload = JSON.stringify({ id: 'evt_test_1', object: 'event', type: 'invoice.paid' })
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret })

  const event = stripe.webhooks.constructEvent(payload, header, secret)
  assert.equal(event.id, 'evt_test_1')

  assert.throws(() => stripe.webhooks.constructEvent(`${payload} `, header, secret))
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, 'whsec_wrong'))
})
