import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('mobile medicine overview is identity and household scoped', () => {
  const route = readFileSync('src/pages/api/mobile/v1/medicine/overview.ts', 'utf8')
  assert.match(route, /requireMobileIdentity/)
  assert.match(route, /mobileHouseholdAvailable/)
  assert.match(route, /getMedicineSchedule/)
  assert.doesNotMatch(route, /getServerSession|authOptions/)
})

test('mobile medicine overview stays GET-only while returning scoped management details', () => {
  const route = readFileSync('src/pages/api/mobile/v1/medicine/overview.ts', 'utf8')
  assert.match(route, /req\.method !== 'GET'/)
  assert.match(route, /MedicineDose\.findMany|medicineDose\.findMany/)
  assert.match(route, /feverReading\.findMany/)
  assert.match(route, /healthEpisode\.findMany/)
  assert.match(route, /weightMeasurement\.findMany/)
  assert.match(route, /child\.findMany/)
  assert.match(route, /medicine\.findMany/)
  assert.doesNotMatch(route, /\.(create|update|upsert|delete|deleteMany|createMany)\(/)
  assert.doesNotMatch(route, /warningReason|takenBy|recordedBy|createdBy/)
})

test('mobile health mutations are isolated, authenticated, and safety checked', () => {
  const routes = ['children', 'episodes', 'fever', 'weights', 'medicines', 'doses'].map(name => readFileSync(`src/pages/api/mobile/v1/medicine/${name}.ts`, 'utf8'))
  for (const route of routes) {
    assert.match(route, /requireMobileIdentity/)
    assert.match(route, /mobileHealthMember/)
    assert.doesNotMatch(route, /getServerSession|authOptions/)
  }
  assert.match(routes[5], /checkDoseSafety/)
  assert.match(routes[5], /req\.body|body\.force/)
  assert.match(routes[4], /scheduleVerifiedBy/)
})
