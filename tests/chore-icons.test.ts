import assert from 'node:assert/strict'
import test from 'node:test'
import * as lucide from 'lucide-react'
import {
  CHORE_ICONS,
  CHORE_ICON_GROUPS,
  CHORE_ICON_MAX,
  FALLBACK_CHORE_ICON_ID,
  choreIconComponent,
  inferChoreIconId,
  isChoreIconId,
  resolveChoreIconId,
  type ChoreIconId,
} from '../src/lib/chore-icons'

/**
 * The icon system. Two properties here are load-bearing rather than cosmetic:
 *
 *   1. Inference is specificity-ordered. "wash the dishes" must not resolve to
 *      a washing machine.
 *   2. Every registry id maps to an icon that actually exists in the installed
 *      lucide version. lucide 0.344 has no vacuum, broom, toilet or dish icon,
 *      so the registry leans on documented substitutes; this test is what stops
 *      a future dependency bump from silently blanking one.
 */

test('every registry id maps to a real lucide export', () => {
  const exported = new Set(Object.keys(lucide))
  for (const [id, Component] of Object.entries(CHORE_ICONS)) {
    assert.ok(Component, `${id} has no component`)
    const name = (Component as { displayName?: string }).displayName
    assert.ok(name, `${id} resolved to something without a displayName`)
    assert.ok(exported.has(name), `${id} maps to ${name}, which lucide does not export`)
  }
})

test('inference is specificity-ordered, so dishes beat washing', () => {
  assert.equal(inferChoreIconId('Wash the dishes'), 'dishes')
  assert.equal(inferChoreIconId('Washing up'), 'dishes')
  assert.equal(inferChoreIconId('Do the washing up after dinner'), 'dishes')
  // Plain "washing" is the laundry sense.
  assert.equal(inferChoreIconId('Put the washing on'), 'laundry')
  assert.equal(inferChoreIconId('Empty the washing machine'), 'laundry')
})

test('inference understands British and Maltese phrasing', () => {
  assert.equal(inferChoreIconId('Hoover downstairs'), 'hoover')
  assert.equal(inferChoreIconId('Vacuum the stairs'), 'hoover')
  assert.equal(inferChoreIconId('Take out the bins'), 'bin')
  assert.equal(inferChoreIconId('Rubbish out'), 'bin')
  assert.equal(inferChoreIconId('Recycling out on Tuesday'), 'recycling')
  assert.equal(inferChoreIconId('Empty the tumble dryer'), 'laundry')
  assert.equal(inferChoreIconId('Clean the loo'), 'bathroom')
})

test('inference matches on word boundaries only', () => {
  // "bin" must not fire inside "binder" or "combine".
  assert.equal(inferChoreIconId('Sort the binder'), FALLBACK_CHORE_ICON_ID)
  assert.equal(inferChoreIconId('Combine the leftovers'), FALLBACK_CHORE_ICON_ID)
})

test('an unmatched title falls back rather than throwing', () => {
  assert.equal(inferChoreIconId('Sort out that thing in the shed'), FALLBACK_CHORE_ICON_ID)
  assert.equal(inferChoreIconId(''), FALLBACK_CHORE_ICON_ID)
})

test('an explicit icon always beats inference', () => {
  assert.equal(resolveChoreIconId({ title: 'Take out the bins', icon: 'plants' }), 'plants')
  // null means "auto", so renaming keeps updating the icon.
  assert.equal(resolveChoreIconId({ title: 'Take out the bins', icon: null }), 'bin')
  assert.equal(resolveChoreIconId({ title: 'Take out the bins' }), 'bin')
})

test('an unknown stored id is ignored, never rendered', () => {
  // The whole point: a stored string can never become an arbitrary component.
  assert.equal(isChoreIconId('not-an-icon'), false)
  assert.equal(isChoreIconId('constructor'), false)
  assert.equal(isChoreIconId('__proto__'), false)
  assert.equal(resolveChoreIconId({ title: 'Take out the bins', icon: 'not-an-icon' }), 'bin')
  assert.equal(choreIconComponent('not-an-icon' as ChoreIconId), CHORE_ICONS[FALLBACK_CHORE_ICON_ID])
})

test('the picker groups cover the registry exactly once, minus the fallback', () => {
  const grouped = CHORE_ICON_GROUPS.flatMap(group => group.ids)
  assert.equal(new Set(grouped).size, grouped.length, 'an id appears in two groups')
  const registry = Object.keys(CHORE_ICONS).filter(id => id !== FALLBACK_CHORE_ICON_ID)
  assert.deepEqual([...grouped].sort(), registry.sort())
  assert.equal(CHORE_ICON_GROUPS.length, 8)
})

test('every id fits the stored column cap', () => {
  for (const id of Object.keys(CHORE_ICONS)) {
    assert.ok(id.length <= CHORE_ICON_MAX, `${id} is longer than CHORE_ICON_MAX`)
  }
})
