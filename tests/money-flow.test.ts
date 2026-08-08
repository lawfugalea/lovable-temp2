import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildMoneyFlow,
  financePeriod,
  isFinancePeriod,
} from '../src/lib/finance/money-flow'
import {
  buildMoneyFlowAiPayload,
  parseMoneyFlowAiOperations,
  signMoneyFlowAiProposal,
  verifyMoneyFlowAiProposal,
} from '../src/lib/finance/money-flow-ai'
import type { PlannerData } from '../src/lib/finance/planner-data'

const accounts = [
  { id: 'personal', name: 'Private real name', type: 'PERSONAL' as const, visibility: 'PRIVATE' as const, monthlyBufferCents: 10_000, owned: true, canEdit: true, canManagePrivacy: true },
  { id: 'commitments', name: 'Bills real name', type: 'COMMITMENTS' as const, visibility: 'SHARED' as const, monthlyBufferCents: 0, owned: true, canEdit: true, canManagePrivacy: true },
]

test('money flow normalizes needs and does not count transfers as spending twice', () => {
  const flow = buildMoneyFlow(
    accounts,
    [{ planAccountId: 'personal', amountCents: 300_000, frequency: 'MONTHLY' }],
    [
      { planAccountId: 'commitments', amountCents: 1_200_00, frequency: 'MONTHLY' },
      { planAccountId: 'commitments', amountCents: 1_200_00, frequency: 'ANNUAL' },
    ],
    [{ planAccountId: 'commitments', monthlyContributionCents: 20_000 }],
    [{ id: 'rule', sourceAccountId: 'personal', sourceName: 'Private real name', sourcePrivate: true, targetAccountId: 'commitments', targetName: 'Bills real name', amountCents: 150_000, completed: false, completedAt: null, canComplete: true, canEdit: true }],
  )
  const personal = flow.accounts.find(account => account.id === 'personal')!
  const commitments = flow.accounts.find(account => account.id === 'commitments')!
  assert.equal(commitments.monthlyCommitmentsCents, 130_000)
  assert.equal(commitments.monthlyNeedCents, 150_000)
  assert.equal(commitments.monthlyInflowCents, 150_000)
  assert.equal(commitments.remainingCents, 0)
  assert.equal(personal.remainingCents, 140_000)
  assert.equal(flow.plannedAllocationCents, 160_000)
  assert.equal(flow.unallocatedCents, 140_000)
})

test('finance periods are bounded month keys in the Malta timezone', () => {
  assert.equal(financePeriod(new Date('2026-01-31T23:30:00.000Z')), '2026-02')
  assert.equal(isFinancePeriod('2026-02'), true)
  assert.equal(isFinancePeriod('2026-13'), false)
  assert.equal(isFinancePeriod('1999-12'), false)
})

test('AI account organiser excludes names and accepts only grounded references', () => {
  const flow = buildMoneyFlow(accounts, [], [], [], [])
  const data = {
    incomes: [{ id: 'income-1', userId: null, label: 'Sensitive employer', amountCents: 300_000, frequency: 'MONTHLY', planAccountId: null }],
    commitments: [{ id: 'bill-1', userId: null, label: 'Sensitive bill', category: 'housing', amountCents: 100_000, frequency: 'MONTHLY', essential: true, planAccountId: null }],
    goals: [{ id: 'goal-1', name: 'Sensitive goal', targetCents: 10_000, savedCents: 0, targetDate: null, remainingCents: 10_000, progress: 0, monthsRemaining: null, requiredMonthlyCents: null, achievable: null, planAccountId: null, monthlyContributionCents: 5_000, monthlyContributionOverrideCents: 5_000 }],
    members: [{ userId: 'person-1', name: 'Sensitive person' }],
    summary: { monthlyIncomeCents: 300_000, monthlyCommitmentsCents: 100_000, essentialCents: 100_000, lifestyleCents: 0, disposableCents: 200_000, safeToSpendWeeklyCents: 46_153, commitmentRatio: 1 / 3, categories: [], setAsides: [] },
    period: '2026-07',
    accounts: flow.accounts,
    fundingRules: [],
    moneyFlow: flow,
  } satisfies PlannerData
  const payload = buildMoneyFlowAiPayload(data)
  const serialized = JSON.stringify(payload)
  for (const secret of ['Sensitive employer', 'Sensitive bill', 'Sensitive goal', 'Sensitive person', 'Private real name', 'Bills real name']) {
    assert.equal(serialized.includes(secret), false)
  }
  const operations = parseMoneyFlowAiOperations({
    operations: [
      { kind: 'assign_entry', entryKind: 'commitment', entryId: 'bill-1', accountId: 'commitments', reason: 'Grouped by category' },
      { kind: 'assign_entry', entryKind: 'commitment', entryId: 'invented', accountId: 'commitments' },
      { kind: 'set_account_buffer', accountId: 'invented', amountEur: 20 },
    ],
  }, payload)
  assert.equal(operations.length, 1)
  assert.equal(operations[0]?.kind, 'assign_entry')
})

test('signed AI proposals reject tampering and expiry', () => {
  const previous = process.env.FINANCE_AI_SIGNING_SECRET
  process.env.FINANCE_AI_SIGNING_SECRET = 'test-finance-signing-secret'
  try {
    const token = signMoneyFlowAiProposal({ householdId: 'house', userId: 'user', stateHash: 'hash', operations: [] }, 1_000)
    assert.equal(verifyMoneyFlowAiProposal(token, 2_000).householdId, 'house')
    assert.throws(() => verifyMoneyFlowAiProposal(token + 'x', 2_000), /Invalid/)
    assert.throws(() => verifyMoneyFlowAiProposal(token, 1_000 + 16 * 60_000), /expired/)
  } finally {
    if (previous === undefined) delete process.env.FINANCE_AI_SIGNING_SECRET
    else process.env.FINANCE_AI_SIGNING_SECRET = previous
  }
})

test('finance account migration is additive and privacy routes are guarded', () => {
  const migration = readFileSync('prisma/migrations/20260723010000_finance_plan_accounts/migration.sql', 'utf8')
  assert.match(migration, /CREATE TABLE "FinancePlanAccount"/)
  assert.match(migration, /CREATE TABLE "FinanceFundingRule"/)
  assert.match(migration, /CREATE TABLE "FinanceTransferCheckoff"/)
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM/)
  const planner = readFileSync('src/lib/finance/planner-data.ts', 'utf8')
  assert.match(planner, /Private contribution/)
  assert.match(planner, /account\.visibility === 'SHARED' \|\| account\.ownerUserId === viewerUserId/)
  const apply = readFileSync('src/pages/api/finance/planner/money-flow-ai/apply.ts', 'utf8')
  assert.match(apply, /isolationLevel: 'Serializable'/)
  assert.match(apply, /FOR UPDATE/)
})

test('native Finance and Banking are separate and the temporary monthly flow is removed', () => {
  const finance = readFileSync('apps/mobile/app/(app)/finance.tsx', 'utf8')
  const banking = readFileSync('apps/mobile/app/(app)/banking.tsx', 'utf8')
  assert.doesNotMatch(finance, /This month|FinanceMoneyFlow|\/finance\/overview/)
  assert.match(finance, /My plan/)
  assert.match(banking, /Your connected banking/)
  assert.match(banking, /\/finance\/overview/)
  const proxy = readFileSync('src/proxy.ts', 'utf8')
  assert.match(proxy, /'\/banking\/:path\*'/)
})
