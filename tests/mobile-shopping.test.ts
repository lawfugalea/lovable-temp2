import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  normalizeMobileShoppingItemCreate,
  normalizeMobileShoppingItemPatch,
  normalizeMobileShoppingListName,
} from '../src/lib/mobile-shopping-core'

test('mobile shopping list names are trimmed and bounded', () => {
  assert.deepEqual(normalizeMobileShoppingListName('  Weekly shop  '), { ok: true, value: 'Weekly shop' })
  assert.equal(normalizeMobileShoppingListName(' ').ok, false)
  assert.equal(normalizeMobileShoppingListName('x'.repeat(101)).ok, false)
  assert.equal(normalizeMobileShoppingListName(null).ok, false)
})

test('mobile shopping item creation normalizes safe fields', () => {
  assert.deepEqual(normalizeMobileShoppingItemCreate({ title: '  Milk ', qty: ' 2 L ', quantityCount: 3 }), {
    ok: true,
    value: { title: 'Milk', qty: '2 L', quantityCount: 3 },
  })
  assert.deepEqual(normalizeMobileShoppingItemCreate({ title: 'Apples' }), {
    ok: true,
    value: { title: 'Apples', qty: null, quantityCount: 1 },
  })
  assert.equal(normalizeMobileShoppingItemCreate({ title: '' }).ok, false)
  assert.equal(normalizeMobileShoppingItemCreate({ title: 'x'.repeat(201) }).ok, false)
  assert.equal(normalizeMobileShoppingItemCreate({ title: 'Milk', qty: 'x'.repeat(81) }).ok, false)
  assert.equal(normalizeMobileShoppingItemCreate({ title: 'Milk', quantityCount: 0 }).ok, false)
  assert.equal(normalizeMobileShoppingItemCreate({ title: 'Milk', quantityCount: 1000 }).ok, false)
  assert.equal(normalizeMobileShoppingItemCreate({ title: 'Milk', quantityCount: 1.5 }).ok, false)
})

test('mobile shopping item patches accept only supported validated changes', () => {
  assert.deepEqual(normalizeMobileShoppingItemPatch({ status: 'DONE', quantityCount: 4 }), {
    ok: true,
    value: { quantityCount: 4, status: 'DONE' },
  })
  assert.deepEqual(normalizeMobileShoppingItemPatch({ qty: ' 500 g ' }), {
    ok: true,
    value: { qty: '500 g' },
  })
  assert.equal(normalizeMobileShoppingItemPatch({}).ok, false)
  assert.equal(normalizeMobileShoppingItemPatch({ unsupported: true }).ok, false)
  assert.equal(normalizeMobileShoppingItemPatch({ status: 'DELETED' }).ok, false)
  assert.equal(normalizeMobileShoppingItemPatch({ title: ' ' }).ok, false)
})

test('mobile shopping routes require mobile identity and household-scoped access', () => {
  const lists = readFileSync('src/pages/api/mobile/v1/shopping/lists/index.ts', 'utf8')
  const items = readFileSync('src/pages/api/mobile/v1/shopping/lists/[listId]/items.ts', 'utf8')
  const item = readFileSync('src/pages/api/mobile/v1/shopping/items/[id].ts', 'utf8')
  const list = readFileSync('src/pages/api/mobile/v1/shopping/lists/[listId].ts', 'utf8')

  for (const route of [lists, items, item, list]) assert.match(route, /requireMobileIdentity/)
  assert.match(lists, /mobileHouseholdAvailable/)
  assert.match(items, /mobileShoppingListAvailable/)
  assert.match(item, /mobileShoppingListAvailable/)
  assert.match(list, /mobileShoppingListAvailable/)
  assert.doesNotMatch(`${lists}${items}${item}${list}`, /getServerSession|authOptions/)
})
