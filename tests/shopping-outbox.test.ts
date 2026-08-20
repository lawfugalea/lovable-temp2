import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_AGE_MS,
  MAX_ENTRIES,
  normalizeQueue,
  shouldRetry,
  type OutboxOperation,
} from '../src/lib/shopping-outbox'

const NOW = Date.UTC(2026, 6, 26, 12, 0, 0)

function status(itemId: string, value: 'ACTIVE' | 'DONE', ageMs: number): OutboxOperation {
  return { kind: 'set-status', itemId, status: value, queuedAt: NOW - ageMs }
}

test('only the final intent for an item is replayed', () => {
  // Ticking then unticking while offline must reach the server as one write.
  // Replaying both in order would work, but replaying them out of order — or
  // retrying a partially-applied batch — would leave the item in whichever
  // state happened to land last.
  const queue = normalizeQueue([
    status('item-a', 'DONE', 5_000),
    status('item-a', 'ACTIVE', 4_000),
    status('item-a', 'DONE', 3_000),
  ], NOW)

  assert.equal(queue.length, 1)
  assert.deepEqual(queue[0], status('item-a', 'DONE', 3_000))
})

test('intents for different items are all kept', () => {
  const queue = normalizeQueue([
    status('item-a', 'DONE', 3_000),
    status('item-b', 'DONE', 2_000),
  ], NOW)
  assert.equal(queue.length, 2)
})

test('stale intents are dropped rather than applied to a rebuilt list', () => {
  // A tick queued last week, on a list that has since been cleared and rebuilt
  // for this week's shop, would mark the wrong item as bought.
  const queue = normalizeQueue([
    status('old', 'DONE', MAX_AGE_MS + 1),
    status('fresh', 'DONE', 1_000),
  ], NOW)

  assert.deepEqual(queue.map(operation => (operation as { itemId: string }).itemId), ['fresh'])
})

test('additions are preserved alongside status changes and stay ordered', () => {
  const queue = normalizeQueue([
    { kind: 'add-item', listId: 'list-1', title: 'Milk', quantityCount: 1, queuedAt: NOW - 3_000 },
    status('item-a', 'DONE', 2_000),
    { kind: 'add-item', listId: 'list-1', title: 'Bread', quantityCount: 2, queuedAt: NOW - 1_000 },
  ], NOW)

  assert.equal(queue.length, 3)
  // Oldest first, so a replay applies them in the order the shopper made them.
  assert.deepEqual(queue.map(operation => operation.queuedAt), [NOW - 3_000, NOW - 2_000, NOW - 1_000])
})

test('the queue is bounded so localStorage cannot grow without limit', () => {
  const many: OutboxOperation[] = []
  for (let index = 0; index < MAX_ENTRIES + 50; index += 1) {
    many.push({
      kind: 'add-item',
      listId: 'list-1',
      title: `Item ${index}`,
      quantityCount: 1,
      queuedAt: NOW - (MAX_ENTRIES + 50 - index) * 1_000,
    })
  }
  const queue = normalizeQueue(many, NOW)

  assert.equal(queue.length, MAX_ENTRIES)
  // The newest survive: those are the intents most likely still correct.
  const newestTitle: string = (queue[queue.length - 1] as { title: string }).title
  const expectedTitle: string = `Item ${MAX_ENTRIES + 49}`
  assert.equal(newestTitle, expectedTitle)
})

test('replay retries transport failures but never retries a rejection', () => {
  // The distinction that matters: still offline (keep the write) versus the
  // server refusing it (drop it, or the shopper is stuck retrying forever).
  assert.equal(shouldRetry(null), true, 'never reached the server')
  assert.equal(shouldRetry(503), true, 'server may recover')
  assert.equal(shouldRetry(500), true, 'server may recover')

  assert.equal(shouldRetry(200), false, 'applied')
  assert.equal(shouldRetry(404), false, 'item deleted by someone else')
  assert.equal(shouldRetry(403), false, 'no longer a member of this household')
  assert.equal(shouldRetry(400), false, 'server will never accept this payload')
})
