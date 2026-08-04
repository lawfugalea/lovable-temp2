// Pin the zone before any Date work: the day rule is timezone-sensitive by
// design, and a test that drifts with the runner's locale is worse than none.
process.env.TZ = 'UTC'

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  choreBoxClasses,
  choreProgress,
  groupTodayChores,
  isResolved,
  localDateOf,
  todayItemKey,
  type TodayChoreItem,
} from '../src/lib/chore-view'

/**
 * Grouping, and the rule that fixes unreachable undo.
 *
 * Before this, buildTodayView discarded every resolved overdue occurrence, so
 * ticking an overdue chore made the row and its Undo button vanish — and the Log
 * tab had no undo control. Keeping such rows is the fix; the subtlety is *how
 * long* to keep them. Keying off the due date does not work, because
 * lastScheduledOnOrBefore keeps returning the same past date: a weekly chore
 * ticked late would sit in Done for six days. The rule is therefore based on
 * when it was resolved.
 */

function item(overrides: Partial<TodayChoreItem> = {}): TodayChoreItem {
  return {
    chore: {
      id: 'chore-1',
      title: 'Wash the dishes',
      notes: null,
      schedule: 'Every Saturday',
      icon: null,
      assignee: null,
    },
    dueDate: '2026-08-01',
    overdue: true,
    status: 'PENDING',
    completedBy: null,
    completedAt: null,
    ...overrides,
  }
}

const TODAY = '2026-08-04' // a Tuesday; 2026-08-01 was the Saturday before

test('pending occurrences split by overdue', () => {
  const groups = groupTodayChores(
    [item({ overdue: true }), item({ overdue: false, dueDate: TODAY })],
    TODAY,
  )
  assert.equal(groups.overdue.length, 1)
  assert.equal(groups.today.length, 1)
  assert.equal(groups.done.length, 0)
})

test('an overdue chore resolved today lands in Done, so Undo stays reachable', () => {
  const groups = groupTodayChores(
    [item({ status: 'DONE', completedAt: '2026-08-04T09:00:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 1)
  assert.equal(groups.overdue.length, 0)
})

test('an overdue chore resolved on an earlier day is gone from today', () => {
  // The weekly-chore case: due Sat 1 Aug, ticked Sun 2 Aug. On Tue 4 Aug
  // lastScheduledOnOrBefore still returns 1 Aug, so without this rule the row
  // would linger in Done until the following Saturday.
  const groups = groupTodayChores(
    [item({ status: 'DONE', completedAt: '2026-08-02T09:00:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 0)
  assert.equal(groups.overdue.length, 0)
  assert.equal(groups.today.length, 0)
})

test('an occurrence due today stays in Done however long ago it was resolved', () => {
  const groups = groupTodayChores(
    [item({ overdue: false, dueDate: TODAY, status: 'DONE', completedAt: '2026-08-04T00:05:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 1)
})

test('SKIPPED counts as resolved, exactly like DONE', () => {
  assert.equal(isResolved(item({ status: 'SKIPPED' })), true)
  assert.equal(isResolved(item({ status: 'DONE' })), true)
  assert.equal(isResolved(item({ status: 'PENDING' })), false)
  const groups = groupTodayChores(
    [item({ status: 'SKIPPED', completedAt: '2026-08-04T09:00:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 1)
})

test('a resolved overdue row with no completedAt is dropped, not crashed on', () => {
  const groups = groupTodayChores([item({ status: 'DONE', completedAt: null })], TODAY)
  assert.equal(groups.done.length, 0)
})

test('progress counts every group', () => {
  const groups = groupTodayChores(
    [
      item({ overdue: true }),
      item({ overdue: false, dueDate: TODAY }),
      item({ overdue: false, dueDate: TODAY, status: 'DONE', completedAt: '2026-08-04T08:00:00.000Z' }),
    ],
    TODAY,
  )
  assert.deepEqual(choreProgress(groups), { done: 1, total: 3 })
})

test('keys identify an occurrence, not just a chore', () => {
  assert.equal(todayItemKey(item({ dueDate: '2026-08-01' })), 'chore-1:2026-08-01')
  assert.notEqual(todayItemKey(item({ dueDate: '2026-08-01' })), todayItemKey(item({ dueDate: TODAY })))
})

test('localDateOf returns a date-only string', () => {
  assert.equal(localDateOf('2026-08-04T09:00:00.000Z'), '2026-08-04')
})

test('an overdue box carries static amber as well as the pulse', () => {
  // The reduced-motion guarantee. globals.css clamps animate-breathe, so if the
  // amber only lived in the keyframe it would disappear for exactly the people
  // who asked for less movement — and amber is the only non-textual overdue cue.
  const classes = choreBoxClasses('PENDING', true)
  assert.ok(classes.includes('animate-breathe'), 'overdue rows should pulse')
  assert.ok(classes.includes('border-brand-amber'), 'the resting amber must be a base class')
})

test('resolved and ordinary boxes do not pulse', () => {
  assert.ok(!choreBoxClasses('DONE', true).includes('animate-breathe'))
  assert.ok(!choreBoxClasses('SKIPPED', true).includes('animate-breathe'))
  assert.ok(!choreBoxClasses('PENDING', false).includes('animate-breathe'))
})

test('a done box is filled with the chores colour', () => {
  assert.ok(choreBoxClasses('DONE', false).includes('bg-module-chores'))
})
