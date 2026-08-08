import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isMobilePlannerKind, parseMobilePlannerEntry } from '../src/lib/mobile-finance-core'

test('mobile finance planner input is normalized and bounded by shared money rules', () => {
  assert.equal(isMobilePlannerKind('income'), true)
  assert.equal(isMobilePlannerKind('transfer'), false)
  assert.deepEqual(parseMobilePlannerEntry('income', { label: ' Salary ', amount: '1,234.50', frequency: 'MONTHLY', userId: '' }), {
    ok: true,
    value: { kind: 'income', label: 'Salary', amountCents: 123450, frequency: 'MONTHLY', userId: null, planAccountId: null },
  })
  assert.deepEqual(parseMobilePlannerEntry('commitment', { label: ' Rent ', amount: '900', frequency: 'MONTHLY', category: 'housing', essential: true }), {
    ok: true,
    value: { kind: 'commitment', label: 'Rent', amountCents: 90000, frequency: 'MONTHLY', userId: null, planAccountId: null, category: 'housing', essential: true },
  })
  assert.equal(parseMobilePlannerEntry('income', { label: '', amount: '10' }).ok, false)
  assert.equal(parseMobilePlannerEntry('income', { label: 'Salary', amount: '-10' }).ok, false)
  assert.equal(parseMobilePlannerEntry('income', { label: 'Salary', amount: '10', frequency: 'DAILY' }).ok, false)
})

test('mobile money-flow routes keep bearer authorization and AI review boundaries', () => {
  for (const name of [
    'accounts',
    'funding-rules',
    'transfer-checkoffs',
    'assignments',
    'money-flow-ai/preview',
    'money-flow-ai/suggest',
    'money-flow-ai/apply',
  ]) {
    const route = readFileSync(`src/pages/api/mobile/v1/finance/planner/${name}.ts`, 'utf8')
    assert.match(route, /requireMobileFinanceAccess/)
    assert.doesNotMatch(route, /requireFinanceAccess\(/)
  }
  const preview = readFileSync('src/pages/api/mobile/v1/finance/planner/money-flow-ai/preview.ts', 'utf8')
  const suggest = readFileSync('src/pages/api/mobile/v1/finance/planner/money-flow-ai/suggest.ts', 'utf8')
  const apply = readFileSync('src/pages/api/mobile/v1/finance/planner/money-flow-ai/apply.ts', 'utf8')
  assert.doesNotMatch(preview, /requestMoneyFlowAiProposal/)
  assert.match(suggest, /consent !== true/)
  assert.match(apply, /selectedOperationIds/)
})

test('mobile savings goals validate target, progress, and ISO target dates', () => {
  const result = parseMobilePlannerEntry('goal', { name: ' Emergency ', target: '5000', saved: '250.25', targetDate: '2027-06-01' })
  assert.equal(result.ok, true)
  if (result.ok && result.value.kind === 'goal') {
    assert.equal(result.value.name, 'Emergency')
    assert.equal(result.value.targetCents, 500000)
    assert.equal(result.value.savedCents, 25025)
    assert.equal(result.value.targetDate?.toISOString(), '2027-06-01T00:00:00.000Z')
  }
  assert.equal(parseMobilePlannerEntry('goal', { name: '', target: '500' }).ok, false)
  assert.equal(parseMobilePlannerEntry('goal', { name: 'Goal', target: 'free' }).ok, false)
  assert.equal(parseMobilePlannerEntry('goal', { name: 'Goal', target: '500', targetDate: 'tomorrow' }).ok, false)
})

test('mobile finance routes use shared household, entitlement, and bank authorization', () => {
  const access = readFileSync('src/lib/finance/access.ts', 'utf8')
  const mobileAccess = readFileSync('src/lib/mobile-finance.ts', 'utf8')
  assert.match(access, /financeAccessForIdentity/)
  assert.match(access, /getHouseholdEntitlements/)
  assert.match(access, /membership/)
  assert.match(mobileAccess, /requireMobileIdentity/)
  assert.match(mobileAccess, /financeAccessForIdentity/)

  const routeNames = ['overview', 'transactions', 'insights', 'subscriptions']
  for (const name of routeNames) {
    const route = readFileSync(`src/pages/api/mobile/v1/finance/${name}.ts`, 'utf8')
    assert.match(route, /requireMobileFinanceAccess/)
    assert.doesNotMatch(route, /getServerSession|authOptions/)
  }
  for (const name of ['transactions', 'insights', 'subscriptions']) {
    const route = readFileSync(`src/pages/api/mobile/v1/finance/${name}.ts`, 'utf8')
    assert.match(route, /bank: true/)
  }
  const coach = readFileSync('src/pages/api/mobile/v1/finance/planner/coach.ts', 'utf8')
  assert.match(coach, /requireMobileFinanceAccess/)
  assert.match(coach, /buildRedactedPlannerPayload/)
  assert.match(coach, /requestDeepSeekPlannerAnalysis/)
  assert.match(coach, /consent/)
  assert.match(coach, /if \(req\.body\?\.consent !== true\) return res\.status\(200\)\.json\(\{ requiresConsent: true, preview \}\)/)
  assert.match(coach, /previous web or mobile preference must never skip/)
  assert.doesNotMatch(coach, /getServerSession|authOptions/)
  const financeScreen = readFileSync('apps/mobile/app/(app)/finance.tsx', 'utf8')
  assert.match(financeScreen, /coachPending\.current/)
  assert.match(financeScreen, /label="Review and refresh"/)
  assert.match(financeScreen, /onPress=\{\(\) => onRequest\(false\)\}/)
})

test('mobile planner mutations verify household ownership of every edited row', () => {
  const route = readFileSync('src/pages/api/mobile/v1/finance/planner/[kind].ts', 'utf8')
  assert.match(route, /householdId: access\.householdId/)
  assert.match(route, /membership\.findFirst/)
  assert.match(route, /Income source.*not found|income.*not found/i)
  assert.match(route, /Commitment.*not found|commitment.*not found/i)
  assert.match(route, /Savings goal.*not found|goal.*not found/i)
  assert.doesNotMatch(route, /getServerSession|authOptions/)
})
