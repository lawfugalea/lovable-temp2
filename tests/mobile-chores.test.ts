import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isDateOnly } from '../src/lib/chore-recurrence'

test('mobile chore dates use strict date-only values', () => {
  assert.equal(isDateOnly('2026-07-21'), true)
  assert.equal(isDateOnly('2026-02-30'), false)
  assert.equal(isDateOnly('21-07-2026'), false)
})

test('mobile chore routes require mobile identity and household membership', () => {
  const today = readFileSync('src/pages/api/mobile/v1/chores/today.ts', 'utf8')
  const complete = readFileSync('src/pages/api/mobile/v1/chores/complete.ts', 'utf8')
  const management = readFileSync('src/pages/api/mobile/v1/chores/index.ts', 'utf8')
  const detail = readFileSync('src/pages/api/mobile/v1/chores/[id].ts', 'utf8')
  for (const route of [today, complete, management, detail]) {
    assert.match(route, /requireMobileIdentity/)
    assert.match(route, /mobileHouseholdAvailable/)
  }
  assert.match(complete, /isDueOn/)
  assert.match(complete, /householdId, active: true/)
  assert.match(management, /validateRecurrenceInput/)
  assert.match(detail, /id, householdId/)
  assert.doesNotMatch(`${today}${complete}${management}${detail}`, /getServerSession|authOptions/)
})
