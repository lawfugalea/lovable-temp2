import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGoalPlan,
  buildPlanSummary,
  commitmentRatioBand,
  monthlyCents,
  parseAmountToCents,
  suggestedEmergencyFundCents,
  suggestsSetAside,
  type CommitmentEntry,
} from '../src/lib/budget'

const commitment = (over: Partial<CommitmentEntry>): CommitmentEntry => ({
  id: 'c1',
  label: 'Rent',
  category: 'housing',
  amountCents: 90000,
  frequency: 'MONTHLY',
  essential: true,
  setAside: false,
  ...over,
})

test('monthlyCents normalizes every frequency to a monthly figure', () => {
  assert.equal(monthlyCents({ amountCents: 10000, frequency: 'MONTHLY' }), 10000)
  assert.equal(monthlyCents({ amountCents: 12000, frequency: 'ANNUAL' }), 1000)
  assert.equal(monthlyCents({ amountCents: 30000, frequency: 'QUARTERLY' }), 10000)
  assert.equal(monthlyCents({ amountCents: 20000, frequency: 'BIMONTHLY' }), 10000)
  // 52-week year: weekly ×52/12, four-weekly ×13/12
  assert.equal(monthlyCents({ amountCents: 10000, frequency: 'WEEKLY' }), 43333)
  assert.equal(monthlyCents({ amountCents: 120000, frequency: 'FOUR_WEEKLY' }), 130000)
  assert.equal(monthlyCents({ amountCents: 0, frequency: 'MONTHLY' }), 0)
  assert.equal(monthlyCents({ amountCents: -500, frequency: 'MONTHLY' }), 0)
})

test('buildPlanSummary computes disposable, split, ratio, and safe-to-spend', () => {
  const summary = buildPlanSummary(
    [
      { amountCents: 250000, frequency: 'MONTHLY' },
      { amountCents: 51200, frequency: 'ANNUAL' }, // statutory bonus ~ €512/yr
    ],
    [
      commitment({ id: 'rent', amountCents: 90000 }),
      commitment({ id: 'arms', label: 'ARMS bill', category: 'utilities', amountCents: 24000, frequency: 'BIMONTHLY' }),
      commitment({ id: 'netflix', label: 'Netflix', category: 'subscriptions', amountCents: 1399, essential: false }),
    ],
  )

  assert.equal(summary.monthlyIncomeCents, 250000 + 4267)
  assert.equal(summary.monthlyCommitmentsCents, 90000 + 12000 + 1399)
  assert.equal(summary.essentialCents, 90000 + 12000)
  assert.equal(summary.lifestyleCents, 1399)
  assert.equal(summary.disposableCents, 254267 - 103399)
  assert.equal(summary.safeToSpendWeeklyCents, Math.floor(summary.disposableCents / (52 / 12)))
  assert.ok(summary.commitmentRatio && summary.commitmentRatio > 0.4 && summary.commitmentRatio < 0.41)
  // categories sorted by monthly size
  assert.equal(summary.categories[0].category, 'housing')
})

test('set-asides list exactly the commitments marked for it, at any frequency', () => {
  const summary = buildPlanSummary([], [
    commitment({ id: 'ins', label: 'Car insurance', category: 'insurance', amountCents: 42000, frequency: 'ANNUAL', setAside: true }),
    // A monthly bill the household saves up for still belongs in the list.
    commitment({ id: 'school', label: 'School fees', category: 'education', amountCents: 20000, setAside: true }),
    // An annual bill they pay straight from income does not.
    commitment({ id: 'licence', label: 'Road licence', category: 'transport', amountCents: 10000, frequency: 'ANNUAL' }),
    commitment({ id: 'rent' }),
  ])
  assert.deepEqual(summary.setAsides.map(item => item.label), ['School fees', 'Car insurance'])
  assert.equal(summary.setAsides[1].monthlyCents, 3500)
  // Marking a set-aside never changes what the plan costs each month.
  assert.equal(summary.monthlyCommitmentsCents, 3500 + 20000 + 833 + 90000)
})

test('suggestsSetAside offers a default only for bills that are not monthly or weekly', () => {
  assert.equal(suggestsSetAside('ANNUAL'), true)
  assert.equal(suggestsSetAside('QUARTERLY'), true)
  assert.equal(suggestsSetAside('FOUR_WEEKLY'), true)
  assert.equal(suggestsSetAside('MONTHLY'), false)
  assert.equal(suggestsSetAside('WEEKLY'), false)
})

test('zero income yields null ratio and zero safe-to-spend when overdrawn', () => {
  const summary = buildPlanSummary([], [commitment({})])
  assert.equal(summary.commitmentRatio, null)
  assert.ok(summary.disposableCents < 0)
  assert.equal(summary.safeToSpendWeeklyCents, 0)
})

test('goal plan computes required monthly and achievability', () => {
  const now = new Date('2026-07-19T10:00:00.000Z')
  const plan = buildGoalPlan(
    { id: 'g1', name: 'Holiday', targetCents: 120000, savedCents: 20000, targetDate: '2027-05-19' },
    60000,
    now,
  )
  assert.equal(plan.remainingCents, 100000)
  assert.equal(plan.monthsRemaining, 10)
  assert.equal(plan.requiredMonthlyCents, 10000)
  assert.equal(plan.achievable, true)
  assert.ok(plan.progress > 0.16 && plan.progress < 0.17)
})

test('goal deadlines in the past demand the full remainder now', () => {
  const now = new Date('2026-07-19T10:00:00.000Z')
  const plan = buildGoalPlan(
    { id: 'g1', name: 'Car', targetCents: 50000, savedCents: 10000, targetDate: '2026-06-01' },
    20000,
    now,
  )
  assert.equal(plan.monthsRemaining, 0)
  assert.equal(plan.requiredMonthlyCents, 40000)
  assert.equal(plan.achievable, false)
})

test('goal without a deadline has null schedule fields', () => {
  const plan = buildGoalPlan(
    { id: 'g1', name: 'Someday fund', targetCents: 50000, savedCents: 60000, targetDate: null },
    0,
    new Date(),
  )
  assert.equal(plan.monthsRemaining, null)
  assert.equal(plan.requiredMonthlyCents, null)
  assert.equal(plan.achievable, null)
  assert.equal(plan.remainingCents, 0)
  assert.equal(plan.progress, 1)
})

test('emergency fund suggestion is three months of commitments', () => {
  const summary = buildPlanSummary([], [commitment({ amountCents: 100000 })])
  assert.equal(suggestedEmergencyFundCents(summary), 300000)
})

test('commitment ratio bands', () => {
  assert.equal(commitmentRatioBand(null), 'unknown')
  assert.equal(commitmentRatioBand(0.5), 'comfortable')
  assert.equal(commitmentRatioBand(0.7), 'stretched')
  assert.equal(commitmentRatioBand(0.9), 'overcommitted')
})

test('parseAmountToCents accepts sane euro inputs and rejects junk', () => {
  assert.equal(parseAmountToCents('1234.56'), 123456)
  assert.equal(parseAmountToCents('€1,234.56'), 123456)
  assert.equal(parseAmountToCents(25), 2500)
  assert.equal(parseAmountToCents('0'), null)
  assert.equal(parseAmountToCents('-5'), null)
  assert.equal(parseAmountToCents('abc'), null)
  assert.equal(parseAmountToCents('12.345'), null)
  assert.equal(parseAmountToCents(99999999), null)
  assert.equal(parseAmountToCents(null), null)
})
