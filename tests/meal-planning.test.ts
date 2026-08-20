import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateIngredients, mergeIntoExistingItems, toComparisonInputs } from '../src/lib/meal-planning'

test('aggregation combines by catalogue product and by normalized name+unit', () => {
  const aggregated = aggregateIngredients([
    { name: 'Pasta rigatoni', quantity: 1, unit: null, canonicalProductId: 'cp1' },
    { name: 'Rigatoni pasta 500g', quantity: 2, unit: null, canonicalProductId: 'cp1' },
    { name: 'Olive oil', quantity: '0.5', unit: 'l', canonicalProductId: null },
    { name: 'olive  OIL', quantity: 0.75, unit: 'L', canonicalProductId: null },
    { name: 'Olive oil', quantity: 1, unit: 'tbsp', canonicalProductId: null },
  ])
  assert.equal(aggregated.length, 3)
  const pasta = aggregated.find(entry => entry.canonicalProductId === 'cp1')!
  assert.equal(pasta.totalQuantity, 3)
  assert.equal(pasta.quantityCount, 3)
  const oilLitres = aggregated.find(entry => entry.unit?.toLowerCase() === 'l')!
  assert.equal(oilLitres.totalQuantity, 1.25)
  assert.equal(oilLitres.quantityCount, 2) // rounded up only at the end
  const oilSpoon = aggregated.find(entry => entry.unit === 'tbsp')!
  assert.equal(oilSpoon.quantityCount, 1)
})

test('exact fractional sums do not over-round', () => {
  const aggregated = aggregateIngredients([
    { name: 'Milk', quantity: 0.5, unit: 'l', canonicalProductId: null },
    { name: 'Milk', quantity: 0.5, unit: 'l', canonicalProductId: null },
  ])
  assert.equal(aggregated[0].totalQuantity, 1)
  assert.equal(aggregated[0].quantityCount, 1)
})

test('invalid quantities fall back to one and blank names are dropped', () => {
  const aggregated = aggregateIngredients([
    { name: 'Eggs', quantity: 'a dozen', unit: null, canonicalProductId: null },
    { name: '   ', quantity: 2, unit: null, canonicalProductId: null },
  ])
  assert.equal(aggregated.length, 1)
  assert.equal(aggregated[0].quantityCount, 1)
})

test('comparison inputs use synthetic plan ids', () => {
  const inputs = toComparisonInputs(aggregateIngredients([
    { name: 'Milk', quantity: 2, unit: null, canonicalProductId: 'cp9' },
  ]))
  assert.deepEqual(inputs, [{ id: 'plan:0', title: 'Milk', quantityCount: 2, canonicalProductId: 'cp9' }])
})

test('merge increments matching items and creates the rest', () => {
  const plan = mergeIntoExistingItems(
    aggregateIngredients([
      { name: 'Fresh milk 1L', quantity: 2, unit: null, canonicalProductId: 'cp-milk' },
      { name: 'Bananas', quantity: 1, unit: null, canonicalProductId: null },
      { name: 'Coffee beans', quantity: 1, unit: null, canonicalProductId: null },
    ]),
    [
      { id: 'item1', title: 'Benna milk', quantityCount: 1, canonicalProductId: 'cp-milk' },
      { id: 'item2', title: 'BANANAS', quantityCount: 3, canonicalProductId: null },
    ],
  )
  assert.deepEqual(plan.increments, [
    { itemId: 'item1', addCount: 2 },
    { itemId: 'item2', addCount: 1 },
  ])
  assert.deepEqual(plan.creates, [
    { title: 'Coffee beans', quantityCount: 1, canonicalProductId: null },
  ])
})
