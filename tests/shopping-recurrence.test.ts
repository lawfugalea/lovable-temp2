import assert from 'node:assert/strict'
import test from 'node:test'
import { dateOnlyToDb } from '../src/lib/chore-recurrence'
import { isTemplateDue, selectDueTemplates, type RecurringTemplateRow } from '../src/lib/shopping-recurrence'

function weekly(overrides: Partial<RecurringTemplateRow> = {}): RecurringTemplateRow {
  return {
    id: 'template-1',
    recurrenceType: 'WEEKLY',
    daysOfWeek: [1], // Monday
    intervalDays: null,
    anchorDate: null,
    dayOfMonth: null,
    autoListId: 'list-1',
    lastRunOn: null,
    ...overrides,
  }
}

// 2026-07-27 is a Monday; 2026-07-28 a Tuesday.
const MONDAY = '2026-07-27'
const TUESDAY = '2026-07-28'

test('a weekly template fills its list on the chosen weekday only', () => {
  assert.equal(isTemplateDue(weekly(), MONDAY), true)
  assert.equal(isTemplateDue(weekly(), TUESDAY), false)
})

test('a template that already ran today never runs twice', () => {
  // The worker is at-least-once: a retry after a partial failure, or two
  // overlapping cron ticks, must not double the household's weekly staples.
  const alreadyRun = weekly({ lastRunOn: dateOnlyToDb(MONDAY) })
  assert.equal(isTemplateDue(alreadyRun, MONDAY), false)
})

test('a run recorded on a previous due date does not block the next one', () => {
  const lastWeek = weekly({ lastRunOn: dateOnlyToDb('2026-07-20') })
  assert.equal(isTemplateDue(lastWeek, MONDAY), true)
})

test('a template whose target list was deleted stops instead of filling another', () => {
  // The FK nulls autoListId on list deletion. Refilling some other list would
  // put groceries somewhere the household never chose.
  assert.equal(isTemplateDue(weekly({ autoListId: null }), MONDAY), false)
})

test('a corrupt schedule is skipped rather than crashing the worker run', () => {
  // EVERY_N_DAYS without an interval or anchor cannot describe a schedule. One
  // bad row must not stop every other household's refill.
  const corrupt = weekly({
    recurrenceType: 'EVERY_N_DAYS',
    daysOfWeek: [],
    intervalDays: null,
    anchorDate: null,
  })
  assert.equal(isTemplateDue(corrupt, MONDAY), false)
})

test('every-n-days honours its anchor phase', () => {
  const fortnightly = weekly({
    recurrenceType: 'EVERY_N_DAYS',
    daysOfWeek: [],
    intervalDays: 14,
    anchorDate: dateOnlyToDb('2026-07-13'),
  })
  assert.equal(isTemplateDue(fortnightly, MONDAY), true, '14 days after the anchor')
  assert.equal(isTemplateDue(fortnightly, '2026-07-20'), false, 'only 7 days after')
})

test('selection returns just the due templates', () => {
  const rows = [
    weekly({ id: 'due' }),
    weekly({ id: 'wrong-day', daysOfWeek: [3] }),
    weekly({ id: 'no-list', autoListId: null }),
    weekly({ id: 'already-run', lastRunOn: dateOnlyToDb(MONDAY) }),
  ]
  assert.deepEqual(selectDueTemplates(rows, MONDAY).map(row => row.id), ['due'])
})
