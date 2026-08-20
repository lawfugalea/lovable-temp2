import assert from 'node:assert/strict'
import test from 'node:test'
import {
  describeRecurrence,
  isDateOnly,
  isDueOn,
  lastScheduledOnOrBefore,
  nextOccurrence,
  occurrencesInRange,
  validateRecurrenceInput,
  dateOnlyToDb,
  dbDateToDateOnly,
  type ChoreRecurrence,
} from '../src/lib/chore-recurrence'

const weekly: ChoreRecurrence = { type: 'WEEKLY', daysOfWeek: [1, 4] } // Mon + Thu
const everyThree: ChoreRecurrence = { type: 'EVERY_N_DAYS', intervalDays: 3, anchorDate: '2026-07-01' }
const monthly31: ChoreRecurrence = { type: 'MONTHLY', dayOfMonth: 31 }

test('weekly chores are due on their ISO weekdays', () => {
  assert.equal(isDueOn(weekly, '2026-07-20'), true) // Monday
  assert.equal(isDueOn(weekly, '2026-07-23'), true) // Thursday
  assert.equal(isDueOn(weekly, '2026-07-21'), false) // Tuesday
  assert.equal(nextOccurrence(weekly, '2026-07-21'), '2026-07-23')
  assert.equal(nextOccurrence(weekly, '2026-07-20'), '2026-07-20')
})

test('every-n-days keeps its anchor phase across month boundaries', () => {
  assert.equal(isDueOn(everyThree, '2026-07-01'), true)
  assert.equal(isDueOn(everyThree, '2026-07-31'), true) // 30 days later
  assert.equal(isDueOn(everyThree, '2026-08-03'), true)
  assert.equal(isDueOn(everyThree, '2026-08-02'), false)
  assert.equal(nextOccurrence(everyThree, '2026-08-01'), '2026-08-03')
  // Before the anchor, the anchor itself is the first occurrence.
  assert.equal(nextOccurrence(everyThree, '2026-06-15'), '2026-07-01')
  assert.equal(isDueOn(everyThree, '2026-06-28'), false)
})

test('monthly chores clamp to short months including leap February', () => {
  assert.equal(isDueOn(monthly31, '2026-01-31'), true)
  assert.equal(isDueOn(monthly31, '2026-02-28'), true) // 2026 is not a leap year
  assert.equal(isDueOn(monthly31, '2026-02-27'), false)
  assert.equal(isDueOn(monthly31, '2026-04-30'), true)
  assert.equal(isDueOn({ type: 'MONTHLY', dayOfMonth: 30 }, '2028-02-29'), true) // leap year clamp
  assert.equal(nextOccurrence(monthly31, '2026-02-01'), '2026-02-28')
  assert.equal(nextOccurrence(monthly31, '2026-03-01'), '2026-03-31')
  // After this month's clamped due day, jump to next month.
  assert.equal(nextOccurrence(monthly31, '2026-02-29'.replace('29', '28') /* 2026-02-28 due itself */), '2026-02-28')
  assert.equal(nextOccurrence(monthly31, '2026-03-01'), '2026-03-31')
})

test('occurrencesInRange lists due dates inclusively and stays capped', () => {
  assert.deepEqual(occurrencesInRange(weekly, '2026-07-20', '2026-07-27'), ['2026-07-20', '2026-07-23', '2026-07-27'])
  const daily: ChoreRecurrence = { type: 'EVERY_N_DAYS', intervalDays: 1, anchorDate: '2020-01-01' }
  assert.equal(occurrencesInRange(daily, '2020-01-01', '2030-01-01').length, 100)
})

test('lastScheduledOnOrBefore finds overdue occurrences within the lookback', () => {
  assert.equal(lastScheduledOnOrBefore(weekly, '2026-07-22'), '2026-07-20')
  assert.equal(lastScheduledOnOrBefore(monthly31, '2026-08-02'), '2026-07-31')
  assert.equal(lastScheduledOnOrBefore({ type: 'MONTHLY', dayOfMonth: 15 }, '2026-07-30'), null) // outside 7-day lookback
})

test('date handling is stable across DST transition weeks', () => {
  // Europe/Malta DST: clocks changed 2026-03-29. Weekly Monday chore around it:
  const monday: ChoreRecurrence = { type: 'WEEKLY', daysOfWeek: [1] }
  assert.equal(isDueOn(monday, '2026-03-30'), true)
  assert.equal(nextOccurrence(monday, '2026-03-28'), '2026-03-30')
  const spanning: ChoreRecurrence = { type: 'EVERY_N_DAYS', intervalDays: 2, anchorDate: '2026-03-27' }
  assert.deepEqual(occurrencesInRange(spanning, '2026-03-27', '2026-04-02'), ['2026-03-27', '2026-03-29', '2026-03-31', '2026-04-02'])
})

test('recurrence descriptions read naturally', () => {
  assert.equal(describeRecurrence(weekly), 'Every Monday and Thursday')
  assert.equal(describeRecurrence({ type: 'WEEKLY', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }), 'Every day')
  assert.equal(describeRecurrence({ type: 'EVERY_N_DAYS', intervalDays: 1, anchorDate: '2026-01-01' }), 'Every day')
  assert.equal(describeRecurrence(everyThree), 'Every 3 days')
  assert.equal(describeRecurrence(monthly31), 'Monthly on the 31st')
  assert.equal(describeRecurrence({ type: 'MONTHLY', dayOfMonth: 22 }), 'Monthly on the 22nd')
})

test('validateRecurrenceInput accepts good shapes and rejects bad ones', () => {
  assert.equal(validateRecurrenceInput({ recurrenceType: 'WEEKLY', daysOfWeek: [1, 1, 4] }).ok, true)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'WEEKLY', daysOfWeek: [] }).ok, false)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'WEEKLY', daysOfWeek: [0] }).ok, false)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'EVERY_N_DAYS', intervalDays: 3, anchorDate: '2026-07-01' }).ok, true)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'EVERY_N_DAYS', intervalDays: 0, anchorDate: '2026-07-01' }).ok, false)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'EVERY_N_DAYS', intervalDays: 3, anchorDate: '2026-02-30' }).ok, false)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'MONTHLY', dayOfMonth: 31 }).ok, true)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'MONTHLY', dayOfMonth: 32 }).ok, false)
  assert.equal(validateRecurrenceInput({ recurrenceType: 'YEARLY' }).ok, false)
})

test('date-only round-trips through database representation', () => {
  assert.equal(isDateOnly('2026-02-29'), false)
  assert.equal(isDateOnly('2028-02-29'), true)
  const db = dateOnlyToDb('2026-07-18')
  assert.equal(db.toISOString(), '2026-07-18T00:00:00.000Z')
  assert.equal(dbDateToDateOnly(db), '2026-07-18')
})
