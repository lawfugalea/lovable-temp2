import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parsePlanRange } from '../src/lib/meals'

test('mobile meal week ranges are valid, ordered, and bounded', () => {
  assert.deepEqual(parsePlanRange('2026-07-20', '2026-07-26'), { from: '2026-07-20', to: '2026-07-26' })
  assert.equal(parsePlanRange('2026-07-26', '2026-07-20'), null)
  assert.equal(parsePlanRange('2026-07-20', '2026-09-01'), null)
  assert.equal(parsePlanRange('invalid', '2026-07-26'), null)
})

test('mobile meal routes require mobile identity and household membership', () => {
  const week = readFileSync('src/pages/api/mobile/v1/meals/week.ts', 'utf8')
  const generate = readFileSync('src/pages/api/mobile/v1/meals/generate-shopping.ts', 'utf8')
  const recipes = readFileSync('src/pages/api/mobile/v1/meals/recipes/index.ts', 'utf8')
  const recipe = readFileSync('src/pages/api/mobile/v1/meals/recipes/[id].ts', 'utf8')
  for (const route of [week, generate, recipes, recipe]) {
    assert.match(route, /requireMobileIdentity/)
    assert.match(route, /mobileHouseholdAvailable/)
  }
  assert.match(week, /id: recipeId, householdId/)
  assert.match(generate, /id: listId, householdId, archivedAt: null/)
  assert.match(recipes, /validateIngredients/)
  assert.match(recipe, /recipeIngredient\.deleteMany/)
  assert.match(recipe, /linksById/)
  assert.doesNotMatch(`${week}${generate}${recipes}${recipe}`, /getServerSession|authOptions/)
})
