import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateNextDoseTime,
  normalizeDosage,
  normalizeFrequency,
  parseRequiredDate,
  checkDoseSafety,
  getMedicineSchedule,
  needsEpisodeDecision,
} from '../src/lib/medicine'

test('calculateNextDoseTime handles named and numeric schedules', () => {
  const start = new Date('2026-07-15T08:00:00.000Z')
  assert.equal(calculateNextDoseTime('twice daily', start).toISOString(), '2026-07-15T20:00:00.000Z')
  assert.equal(calculateNextDoseTime('every 8 hours', start).toISOString(), '2026-07-15T16:00:00.000Z')
  assert.equal(calculateNextDoseTime('3.5 hours', start).toISOString(), '2026-07-15T11:30:00.000Z')
})

test('episode decision uses a strict 72-hour quiet gap', () => {
  const event = new Date('2026-07-10T08:00:00.000Z')
  assert.equal(needsEpisodeDecision(event, new Date('2026-07-13T08:00:00.000Z')), false)
  assert.equal(needsEpisodeDecision(event, new Date('2026-07-13T08:00:00.001Z')), true)
  assert.equal(needsEpisodeDecision(null), true)
})

test('PRN medicine reports eligibility but is never due', () => {
  const medicine = {
    id: 'medicine', frequency: 'as needed', startDate: '2026-07-15T08:00:00.000Z',
    isActive: true, isTemplate: false, isPrn: true, minGapHours: 6, maxDosesPer24h: 4,
  }
  const doses = [{ id: 'dose', medicineId: 'medicine', takenAt: '2026-07-15T08:00:00.000Z' }]
  const schedule = getMedicineSchedule(medicine, doses, new Date('2026-07-15T14:00:00.000Z'))
  assert.equal(schedule.isDue, false)
  assert.equal(schedule.canGiveNow, true)
  assert.equal(schedule.nextDoseTime, null)
})

test('dose safety checks minimum gaps and rolling daily limits without blocking history', () => {
  const medicine = {
    id: 'medicine', frequency: 'every 6 hours', startDate: '2026-07-15T00:00:00.000Z',
    isActive: true, isTemplate: false, minGapHours: 6, maxDosesPer24h: 2,
  }
  const doses = [
    { id: 'one', medicineId: 'medicine', takenAt: '2026-07-15T08:00:00.000Z' },
    { id: 'two', medicineId: 'medicine', takenAt: '2026-07-15T14:00:00.000Z' },
  ]
  const result = checkDoseSafety(medicine, doses, new Date('2026-07-15T16:00:00.000Z'))
  assert.equal(result.ok, false)
  assert.deepEqual(result.warnings.map(warning => warning.kind).sort(), ['daily-limit', 'too-early'])
})

test('calculateNextDoseTime uses a conservative fallback for unknown schedules', () => {
  const start = new Date('2026-07-15T08:00:00.000Z')
  assert.equal(calculateNextDoseTime('custom', start).toISOString(), '2026-07-15T14:00:00.000Z')
})

test('medicine input normalization preserves complete dosages and validates dates', () => {
  assert.equal(normalizeDosage('5', 'ml'), '5 ml')
  assert.equal(normalizeDosage('5 mg', 'ml'), '5 mg')
  assert.equal(normalizeDosage('', 'ml'), null)
  assert.equal(normalizeFrequency('8'), 'every 8 hours')
  assert.equal(normalizeFrequency(' Twice Daily '), 'twice daily')
  assert.equal(parseRequiredDate('not-a-date'), null)
  assert.equal(parseRequiredDate('2026-07-15T08:00:00.000Z')?.toISOString(), '2026-07-15T08:00:00.000Z')
})
