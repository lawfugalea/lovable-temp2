import assert from 'node:assert/strict'
import test from 'node:test'
import {
  foldPlural,
  rankCatalogCandidates,
  scoreCatalogCandidate,
  tokenVariants,
  withinOneEdit,
} from '../src/lib/catalog-search'

function candidate(id: string, displayName: string, brand: string | null = null) {
  return { id, displayName, brand, normalizedName: displayName.toLowerCase() }
}

const drinks = [
  candidate('exact', 'Coca Cola', 'Coca Cola'),
  candidate('long', 'Coca Cola Zero Cans 6 Pack', 'Coca Cola'),
  candidate('partial', 'Colavita Olive Oil', 'Colavita'),
]

test('catalogue search requires every query token and ranks exact phrases first', () => {
  assert.deepEqual(rankCatalogCandidates(drinks, 'coca cola').map(item => item.id), ['exact', 'long'])
})

test('catalogue search prefers whole-word matches to word prefixes', () => {
  assert.ok(
    scoreCatalogCandidate(drinks[0], 'cola') > scoreCatalogCandidate(drinks[2], 'cola'),
  )
})

test('tokens never match substrings inside words', () => {
  assert.equal(scoreCatalogCandidate(candidate('wine', 'Chateau Medoc 75cl'), 'tea'), -1)
  assert.equal(scoreCatalogCandidate(candidate('shampoo', 'Baby Shampoo Regular'), 'ham'), -1)
  assert.equal(scoreCatalogCandidate(candidate('straws', 'Veggie Straws Salt Vinegar'), 'egg'), -1)
  assert.equal(scoreCatalogCandidate(candidate('seat', 'Toilet Seat White'), 'oil'), -1)
  assert.ok(scoreCatalogCandidate(candidate('tea', 'Twinings Green Tea 20 Bags'), 'tea') > 0)
})

test('singular and plural forms of a token both match', () => {
  assert.ok(scoreCatalogCandidate(candidate('banana', 'Fresh Banana 1kg'), 'bananas') > 0)
  assert.ok(scoreCatalogCandidate(candidate('eggs', 'Free Range Eggs x6'), 'egg') > 0)
  assert.ok(scoreCatalogCandidate(candidate('tomato', 'Cherry Tomatoes 250g'), 'tomato') > 0)
  assert.deepEqual(tokenVariants('bananas').includes('banana'), true)
  assert.equal(foldPlural('tomatoes'), 'tomato')
})

test('head-noun products outrank products that merely mention the token', () => {
  const milk = [
    candidate('chocolate', 'Cadbury Milk Chocolate Cake Bars'),
    candidate('fresh', 'Benna Fresh Milk 1L', 'Benna'),
  ]
  assert.deepEqual(rankCatalogCandidates(milk, 'milk').map(item => item.id), ['fresh', 'chocolate'])
})

test('single-letter typos still find the product', () => {
  assert.ok(scoreCatalogCandidate(candidate('banana', 'Fresh Banana 1kg'), 'bananna') > 0)
  assert.ok(scoreCatalogCandidate(candidate('yoghurt', 'Greek Yoghurt 500g'), 'yogurt') > 0)
  assert.ok(withinOneEdit('bananna', 'banana'))
  assert.ok(!withinOneEdit('milk', 'mint'))
})

test('typo-tolerant matches are hidden when confident matches exist', () => {
  const pool = [
    candidate('m1', 'Fresh Milk 1L'),
    candidate('m2', 'Skimmed Milk 1L'),
    candidate('m3', 'Goat Milk 500ml'),
    candidate('typo', 'Milo Chocolate Drink'),
  ]
  const ranked = rankCatalogCandidates(pool, 'milk')
  assert.ok(!ranked.some(item => item.id === 'typo'))
})
