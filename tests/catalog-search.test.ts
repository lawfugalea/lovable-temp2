import assert from 'node:assert/strict'
import test from 'node:test'
import { rankCatalogCandidates, scoreCatalogCandidate } from '../src/lib/catalog-search'

const candidates = [
  { id: 'exact', displayName: 'Coca Cola', brand: 'Coca Cola', normalizedName: 'coca cola' },
  { id: 'long', displayName: 'Coca Cola Zero Cans 6 Pack', brand: 'Coca Cola', normalizedName: 'coca cola zero cans 6 pack' },
  { id: 'partial', displayName: 'Colavita Olive Oil', brand: 'Colavita', normalizedName: 'colavita olive oil' },
]

test('catalogue search requires every query token and ranks exact phrases first', () => {
  assert.deepEqual(rankCatalogCandidates(candidates, 'coca cola').map(item => item.id), ['exact', 'long'])
})

test('catalogue search prefers concise prefix matches to incidental substrings', () => {
  assert.ok(
    scoreCatalogCandidate(candidates[0], 'cola') > scoreCatalogCandidate(candidates[2], 'cola'),
  )
})
