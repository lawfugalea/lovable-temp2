import assert from 'node:assert/strict'
import test from 'node:test'
import { FREE_CHILD_LIMIT, featureAllowed, resolveEntitlements } from '../src/lib/entitlements-core'

const NOW = new Date('2026-07-19T12:00:00Z')

function base(overrides: Partial<Parameters<typeof resolveEntitlements>[0]> = {}) {
  return resolveEntitlements({
    plan: 'FREE',
    planSource: null,
    stripeSubscriptionStatus: null,
    currentPeriodEnd: null,
    graceUntil: null,
    ownerIsDemo: false,
    now: NOW,
    ...overrides,
  })
}

test('free households get the free tier with a one-child limit', () => {
  const ent = base()
  assert.equal(ent.plan, 'FREE')
  assert.equal(ent.effectiveVia, 'free')
  assert.equal(ent.canUseFinance, false)
  assert.equal(ent.canUseAi, false)
  assert.equal(ent.canUsePushReminders, false)
  assert.equal(ent.canUsePriceComparison, false)
  assert.equal(ent.canExportMedicinePdf, false)
  assert.equal(ent.maxChildren, FREE_CHILD_LIMIT)
})

test('admin-comped households are Family regardless of Stripe state', () => {
  const ent = base({ plan: 'FAMILY', planSource: 'ADMIN' })
  assert.equal(ent.plan, 'FAMILY')
  assert.equal(ent.effectiveVia, 'admin')
  assert.equal(ent.canUseFinance, true)
  assert.equal(ent.maxChildren, Number.POSITIVE_INFINITY)
})

test('active and trialing Stripe subscriptions are Family', () => {
  for (const status of ['active', 'trialing']) {
    const ent = base({ plan: 'FAMILY', planSource: 'STRIPE', stripeSubscriptionStatus: status })
    assert.equal(ent.plan, 'FAMILY')
    assert.equal(ent.effectiveVia, 'stripe')
  }
})

test('past_due keeps Family only while the grace period lasts', () => {
  const inGrace = base({
    plan: 'FAMILY', planSource: 'STRIPE', stripeSubscriptionStatus: 'past_due',
    graceUntil: new Date('2026-07-22T00:00:00Z'),
  })
  assert.equal(inGrace.plan, 'FAMILY')
  assert.equal(inGrace.effectiveVia, 'grace')

  const expired = base({
    plan: 'FAMILY', planSource: 'STRIPE', stripeSubscriptionStatus: 'past_due',
    graceUntil: new Date('2026-07-18T00:00:00Z'),
  })
  assert.equal(expired.plan, 'FREE')
  assert.equal(expired.effectiveVia, 'free')
})

test('canceled subscriptions fall back to free even if plan column lags', () => {
  const ent = base({ plan: 'FAMILY', planSource: 'STRIPE', stripeSubscriptionStatus: 'canceled' })
  assert.equal(ent.plan, 'FREE')
  assert.equal(ent.canUseFinance, false)
})

test('demo households experience the Family feature set', () => {
  const ent = base({ ownerIsDemo: true })
  assert.equal(ent.plan, 'FAMILY')
  assert.equal(ent.effectiveVia, 'demo')
  assert.equal(ent.canUseAi, true)
})

test('featureAllowed maps features to capabilities', () => {
  const free = base()
  const family = base({ plan: 'FAMILY', planSource: 'ADMIN' })
  for (const feature of ['finance', 'ai', 'pushReminders', 'medicinePdf', 'children', 'priceComparison'] as const) {
    assert.equal(featureAllowed(free, feature), false)
    assert.equal(featureAllowed(family, feature), true)
  }
})
