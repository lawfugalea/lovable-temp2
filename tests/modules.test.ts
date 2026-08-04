import assert from 'node:assert/strict'
import test from 'node:test'
import { modules } from '../src/lib/modules'

/**
 * The three card-specific classes that replaced dashboard.tsx's separate
 * summaryTones mapping. The load-bearing property isn't that they're
 * non-empty — it's that each module's three new fields are built on the
 * SAME colour token as that module's own trusted barClass, so a future
 * module can't repeat the copy-paste-wrong-token mistake this migration was
 * itself written to fix.
 */

test('every module has all three card-specific classes', () => {
  for (const entry of modules) {
    assert.ok(entry.cardTileClass.length > 0, `${entry.key} is missing cardTileClass`)
    assert.ok(entry.cardLinkClass.length > 0, `${entry.key} is missing cardLinkClass`)
    assert.ok(entry.cardHoverBorderClass.length > 0, `${entry.key} is missing cardHoverBorderClass`)
  }
})

test("each card class is built on the module's own existing colour token", () => {
  for (const entry of modules) {
    // barClass is always `bg-<token>` — e.g. 'bg-module-shopping' or 'bg-primary'
    // for the two modules with no module-X variable of their own (home, banking).
    const token = entry.barClass.replace(/^bg-/, '')
    assert.ok(entry.cardTileClass.includes(token), `${entry.key}'s cardTileClass does not use its own token (${token})`)
    assert.ok(entry.cardLinkClass.includes(token), `${entry.key}'s cardLinkClass does not use its own token (${token})`)
    assert.ok(entry.cardHoverBorderClass.includes(token), `${entry.key}'s cardHoverBorderClass does not use its own token (${token})`)
  }
})

test('the 5 modules with a prior dashboard mapping keep byte-identical classes', () => {
  const byKey = Object.fromEntries(modules.map(m => [m.key, m]))
  assert.equal(byKey.shopping.cardTileClass, 'bg-module-shopping/10 text-module-shopping ring-module-shopping/15')
  assert.equal(byKey.shopping.cardLinkClass, 'text-module-shopping hover:bg-module-shopping/10 hover:text-module-shopping')
  assert.equal(byKey.shopping.cardHoverBorderClass, 'hover:border-module-shopping/30')
  assert.equal(byKey.finances.cardTileClass, 'bg-module-finances/10 text-module-finances ring-module-finances/15')
  assert.equal(byKey.medicine.cardHoverBorderClass, 'hover:border-module-medicine/30')
  assert.equal(byKey.chores.cardLinkClass, 'text-module-chores hover:bg-module-chores/10 hover:text-module-chores')
  assert.equal(byKey.meals.cardTileClass, 'bg-module-meals/10 text-module-meals ring-module-meals/15')
})

test("banking reuses finances' token, matching its own pre-existing tileClass/barClass", () => {
  const banking = modules.find(m => m.key === 'banking')!
  const finances = modules.find(m => m.key === 'finances')!
  assert.equal(banking.cardTileClass, finances.cardTileClass)
  assert.equal(banking.cardLinkClass, finances.cardLinkClass)
  assert.equal(banking.cardHoverBorderClass, finances.cardHoverBorderClass)
})

test("home uses the generic primary token, not a module-home variable that doesn't exist", () => {
  const home = modules.find(m => m.key === 'home')!
  assert.equal(home.cardTileClass, 'bg-primary/10 text-primary ring-primary/15')
  assert.equal(home.cardLinkClass, 'text-primary hover:bg-primary/10 hover:text-primary')
  assert.equal(home.cardHoverBorderClass, 'hover:border-primary/30')
})
