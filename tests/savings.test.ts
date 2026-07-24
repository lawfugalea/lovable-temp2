import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MAX_HORIZON_MONTHS,
  clampHorizon,
  financePeriod,
  monthsUntilGoal,
  periodLabel,
  projectAccount,
  projectTotal,
  shiftPeriod,
} from '../src/lib/finance/savings'

const savings = { openingBalanceCents: 500_000, monthlyContributionCents: 20_000 }

test('a forecast is the stated balance plus what goes in each month', () => {
  const points = projectAccount(savings, 12, '2026-07')
  // Point 0 is today, so a 12-month view carries 13 points.
  assert.equal(points.length, 13)
  assert.deepEqual(points[0], { period: '2026-07', cents: 500_000 })
  assert.deepEqual(points[1], { period: '2026-08', cents: 520_000 })
  // Rolls into the next year rather than producing a month 13.
  assert.deepEqual(points[6], { period: '2027-01', cents: 620_000 })
  assert.deepEqual(points[12], { period: '2027-07', cents: 740_000 })
})

test('an account with nothing going in stays flat', () => {
  const points = projectAccount({ openingBalanceCents: 100_000, monthlyContributionCents: 0 }, 6, '2026-07')
  assert.equal(points[6].cents, 100_000)
})

test('the total line adds every account together', () => {
  const other = { openingBalanceCents: 0, monthlyContributionCents: 5_000 }
  const total = projectTotal([savings, other], 12, '2026-07')
  assert.equal(total[0].cents, 500_000)
  assert.equal(total[12].cents, 500_000 + 12 * 25_000)
})

test('goals mark the month an account clears their target, or say it never does', () => {
  // 500,000 + 20,000/mo clears 600,000 in five months.
  assert.equal(monthsUntilGoal(savings, { targetCents: 600_000 }, 12), 5)
  // Already past the target on day one.
  assert.equal(monthsUntilGoal(savings, { targetCents: 400_000 }, 12), 0)
  // Beyond the horizon being viewed.
  assert.equal(monthsUntilGoal(savings, { targetCents: 900_000 }, 12), null)
  assert.equal(monthsUntilGoal(savings, { targetCents: 900_000 }, 24), 20)
  // Nothing goes in, so it never gets there.
  assert.equal(monthsUntilGoal({ openingBalanceCents: 0, monthlyContributionCents: 0 }, { targetCents: 1 }), null)
})

test('a custom horizon is clamped to a sane number of months', () => {
  assert.equal(clampHorizon(0), 1)
  assert.equal(clampHorizon(-5), 1)
  assert.equal(clampHorizon(500), MAX_HORIZON_MONTHS)
  assert.equal(clampHorizon(Number.NaN), 12)
  assert.equal(clampHorizon(37), 37)
})

test('finance periods are month keys in the Malta timezone', () => {
  assert.equal(financePeriod(new Date('2026-01-31T23:30:00.000Z')), '2026-02')
  assert.equal(shiftPeriod('2026-12', 1), '2027-01')
  assert.equal(shiftPeriod('2026-01', -1), '2025-12')
  assert.equal(periodLabel('2026-07'), 'July 2026')
})

test('the planner never hands a private account to anyone but its owner', () => {
  const planner = readFileSync('src/lib/finance/planner-data.ts', 'utf8')
  assert.match(planner, /account\.visibility === 'SHARED' \|\| account\.ownerUserId === viewerUserId/)
  // Goals mark a target on their account; their contributions are never added to it.
  assert.doesNotMatch(planner, /monthlyContributionCents \+/)
})

test('the savings tab never records money moving', () => {
  const panel = readFileSync('src/components/finance/SavingsPanel.tsx', 'utf8')
  assert.doesNotMatch(panel, /transfer|checkoff|transaction/i)
})

test('Finance planning and Open Banking use separate destinations', () => {
  const financePage = readFileSync('src/pages/finances.tsx', 'utf8')
  const bankingPage = readFileSync('src/pages/banking.tsx', 'utf8')
  // The planner may show accounts the household typed in, but never connected bank data.
  assert.doesNotMatch(financePage, /finance\/overview|connected balance|Open Banking|BankAccount/i)
  assert.match(financePage, /My plan/)
  assert.match(financePage, /'Savings'/)
  assert.match(bankingPage, /Read-only Open Banking/)
  assert.match(bankingPage, /Accounts/)
  const proxy = readFileSync('src/proxy.ts', 'utf8')
  assert.match(proxy, /'\/banking\/:path\*'/)
})
