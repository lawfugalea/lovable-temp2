import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeStreak,
  summariseContributions,
  type CompletionRecord,
  type HouseholdMember,
} from '../src/lib/chore-stats'

const MEMBERS: HouseholdMember[] = [
  { userId: 'ana', name: 'Ana' },
  { userId: 'ben', name: 'Ben' },
]

function done(userId: string | null, dueDate = '2026-07-20'): CompletionRecord {
  return { dueDate, status: 'DONE', completedById: userId }
}

test('contributions split by member and total 100 percent', () => {
  const summary = summariseContributions(
    [done('ana'), done('ana'), done('ana'), done('ben')],
    MEMBERS,
  )

  assert.deepEqual(summary.map(row => [row.userId, row.doneCount, row.sharePercent]), [
    ['ana', 3, 75],
    ['ben', 1, 25],
  ])
})

test('a member who has done nothing still appears', () => {
  // A fairness view that hides the person who has not helped is not a fairness
  // view — the whole point is that the imbalance is visible.
  const summary = summariseContributions([done('ana')], MEMBERS)

  const ben = summary.find(row => row.userId === 'ben')
  assert.ok(ben, 'Ben is listed')
  assert.equal(ben.doneCount, 0)
  assert.equal(ben.sharePercent, 0)
})

test('unattributed completions count for the household but nobody claims them', () => {
  // completedById is SET NULL when a member leaves. Their past work should not
  // be reassigned to whoever happens to still be here.
  const summary = summariseContributions([done('ana'), done(null)], MEMBERS)

  assert.equal(summary.find(row => row.userId === 'ana')?.doneCount, 1)
  // One of two DONE records is Ana's, so her share is half — not all of it.
  assert.equal(summary.find(row => row.userId === 'ana')?.sharePercent, 50)
})

test('an empty window reports zero rather than dividing by zero', () => {
  const summary = summariseContributions([], MEMBERS)
  assert.deepEqual(summary.map(row => row.sharePercent), [0, 0])
})

test('skipped chores are counted separately from done ones', () => {
  const summary = summariseContributions(
    [done('ana'), { dueDate: '2026-07-20', status: 'SKIPPED', completedById: 'ben' }],
    MEMBERS,
  )
  const ben = summary.find(row => row.userId === 'ben')
  assert.equal(ben?.doneCount, 0)
  assert.equal(ben?.skippedCount, 1)
})

test('a streak counts consecutive fully-resolved days', () => {
  const due = new Map([['2026-07-24', 2], ['2026-07-25', 1], ['2026-07-26', 1]])
  const resolved = new Map([['2026-07-24', 2], ['2026-07-25', 1], ['2026-07-26', 1]])

  assert.equal(computeStreak(due, resolved, '2026-07-26'), 3)
})

test('an unfinished today does not break the streak', () => {
  // A chore due this evening, outstanding at nine in the morning, must not read
  // as a failure — the day is not over.
  const due = new Map([['2026-07-25', 1], ['2026-07-26', 1]])
  const resolved = new Map([['2026-07-25', 1]])

  assert.equal(computeStreak(due, resolved, '2026-07-26'), 1, 'yesterday still counts')
})

test('a missed earlier day ends the streak', () => {
  const due = new Map([['2026-07-24', 1], ['2026-07-25', 1], ['2026-07-26', 1]])
  const resolved = new Map([['2026-07-24', 1], ['2026-07-26', 1]])

  assert.equal(computeStreak(due, resolved, '2026-07-26'), 1, 'stops at the gap on the 25th')
})

test('days with nothing due neither break nor inflate a streak', () => {
  // Weekday-only chores must not lose their streak every weekend, but an empty
  // weekend cannot manufacture one either.
  const due = new Map([['2026-07-23', 1], ['2026-07-24', 1], ['2026-07-26', 1]])
  const resolved = new Map([['2026-07-23', 1], ['2026-07-24', 1], ['2026-07-26', 1]])

  // The 25th has nothing due and is carried across: 3 due days all resolved.
  assert.equal(computeStreak(due, resolved, '2026-07-26'), 3)
})

test('a household with no chores at all has no streak', () => {
  assert.equal(computeStreak(new Map(), new Map(), '2026-07-26'), 0)
})
