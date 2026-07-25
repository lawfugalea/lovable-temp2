import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import {
  FIRST_TOUR_STEP_ID,
  TOUR_ROUTES,
  TOUR_STEPS,
  TOUR_STEP_IDS,
  applicableSteps,
  isTourStepId,
  nextStepId,
  prevStepId,
  stepPosition,
  type TourContext,
} from '../src/lib/onboarding-tour'
import { parseOnboardingPatch } from '../src/lib/onboarding-state'

const FREE: TourContext = { plan: 'FREE' }
const FAMILY: TourContext = { plan: 'FAMILY' }

test('tour step ids are unique and stable', () => {
  assert.equal(new Set(TOUR_STEP_IDS).size, TOUR_STEP_IDS.length)
  assert.equal(FIRST_TOUR_STEP_ID, 'welcome')
  assert.equal(TOUR_STEPS[TOUR_STEPS.length - 1].id, 'done')
})

test('every anchored step declares a target and every step has copy', () => {
  for (const step of TOUR_STEPS) {
    assert.ok(step.title.length > 0, `${step.id} needs a title`)
    assert.ok(step.body.length > 0, `${step.id} needs a body`)
    if (step.side !== undefined) {
      assert.ok(step.target, `${step.id} declares a side but no target`)
    }
  }
})

test('every step declares an internal page for the walkthrough to route to', () => {
  for (const step of TOUR_STEPS) {
    assert.ok(step.href.startsWith('/'), `${step.id} href must be an internal path`)
    assert.ok(!step.href.includes('//'), `${step.id} href must not be protocol-relative`)
  }
})

test('copy never leaks HTML entities into plain strings', () => {
  // These are rendered as React text, not dangerouslySetInnerHTML, so an entity
  // would show up literally as "&rsquo;" on screen.
  for (const step of TOUR_STEPS) {
    for (const [field, value] of Object.entries({ title: step.title, body: step.body, bodyMobile: step.bodyMobile })) {
      if (typeof value !== 'string') continue
      assert.doesNotMatch(value, /&[a-z]+;|&#\d+;/i, `${step.id}.${field} contains an HTML entity`)
    }
  }
})

test('the walkthrough actually visits the main modules', () => {
  // Regression guard: the tour was once a dashboard-only orientation that never
  // showed the user a single feature page.
  const visited = new Set(TOUR_STEPS.map((step) => step.href))
  for (const route of ['/shopping', '/meals', '/chores', '/notes']) {
    assert.ok(visited.has(route), `the tour never visits ${route}`)
  }
  assert.ok(TOUR_ROUTES.includes('/dashboard'))
})

test('the tour starts and ends on the dashboard', () => {
  assert.equal(TOUR_STEPS[0].href, '/dashboard')
  assert.equal(TOUR_STEPS[TOUR_STEPS.length - 1].href, '/dashboard')
})

test('every target the tour asks for exists as a data-tour anchor in the source', () => {
  // The anchor lookup is a runtime string match, so a renamed or mistyped target
  // fails silently — the step just loses its highlight and falls back to a
  // centred card. This catches it at build time instead.
  const output = execFileSync(
    'grep',
    ['-rhoE', 'data-tour="[a-z-]+"', 'src/'],
    { cwd: process.cwd(), encoding: 'utf8' },
  )
  const anchors = new Set(
    output.split('\n').filter(Boolean).map((line) => line.replace(/^data-tour="|"$/g, '')),
  )
  for (const step of TOUR_STEPS) {
    if (!step.target) continue
    assert.ok(anchors.has(step.target), `no data-tour="${step.target}" anchor exists for step "${step.id}"`)
  }
})

test('steps that route to a module page anchor to that page', () => {
  // A step pointing at a target that only exists on another page would fall back
  // to a centred card, silently losing the highlight.
  const pageAnchors: Record<string, string> = {
    '/shopping': 'page-shopping',
    '/meals': 'page-meals',
    '/chores': 'page-chores',
    '/notes': 'page-notes',
  }
  for (const step of TOUR_STEPS) {
    const expected = pageAnchors[step.href]
    if (!expected) continue
    assert.equal(step.target, expected, `${step.id} should anchor to ${expected}`)
  }
})

test('plan-gated steps are filtered out for Family households', () => {
  const freeIds = applicableSteps(FREE).map((s) => s.id)
  const familyIds = applicableSteps(FAMILY).map((s) => s.id)
  assert.ok(freeIds.includes('upgrade'))
  assert.ok(!familyIds.includes('upgrade'))
})

test('nextStepId skips steps whose `when` is false', () => {
  // On Family, `upgrade` sits between `checklist` and `help` but must not appear.
  assert.equal(nextStepId('checklist', FREE), 'upgrade')
  assert.equal(nextStepId('checklist', FAMILY), 'help')
})

test('prevStepId walks back over filtered steps', () => {
  assert.equal(prevStepId('help', FREE), 'upgrade')
  assert.equal(prevStepId('help', FAMILY), 'checklist')
})

test('the walk terminates at both ends', () => {
  assert.equal(nextStepId('done', FREE), null)
  assert.equal(prevStepId('welcome', FREE), null)
})

test('a step that no longer applies resolves forward instead of stranding', () => {
  // Household upgraded to Family while paused on the `upgrade` step.
  assert.equal(nextStepId('upgrade', FAMILY), 'welcome')
})

test('stepPosition counts only applicable steps', () => {
  const free = stepPosition('done', FREE)
  const family = stepPosition('done', FAMILY)
  assert.equal(free.total, TOUR_STEPS.length)
  assert.equal(family.total, TOUR_STEPS.length - 1)
  assert.equal(free.index, free.total)
})

test('isTourStepId rejects arbitrary strings', () => {
  assert.ok(isTourStepId('welcome'))
  assert.ok(!isTourStepId('DROP TABLE'))
  assert.ok(!isTourStepId(''))
  assert.ok(!isTourStepId(undefined))
})

test('PATCH parser rejects an unknown tour step', () => {
  const result = parseOnboardingPatch({ tourStepId: 'not-a-step' })
  assert.equal(result.ok, false)
})

test('PATCH parser accepts a null tour step', () => {
  const result = parseOnboardingPatch({ tourStepId: null })
  assert.ok(result.ok)
  assert.deepEqual(result.data, { tourStepId: null })
})

test('finishing the tour clears the resume point', () => {
  const result = parseOnboardingPatch({ tourCompleted: true })
  assert.ok(result.ok)
  assert.ok(result.data.tourCompletedAt instanceof Date)
  assert.equal(result.data.tourStepId, null)
})

test('replaying the tour clears the completion timestamp', () => {
  const result = parseOnboardingPatch({ tourCompleted: false, tourStepId: 'welcome' })
  assert.ok(result.ok)
  assert.equal(result.data.tourCompletedAt, null)
  assert.equal(result.data.tourStepId, 'welcome')
})

test('PATCH parser rejects non-boolean flags', () => {
  assert.equal(parseOnboardingPatch({ tourCompleted: 'yes' }).ok, false)
  assert.equal(parseOnboardingPatch({ checklistDismissed: 1 }).ok, false)
})

test('checklist dismissal maps to a timestamp and restoring maps to null', () => {
  const dismissed = parseOnboardingPatch({ checklistDismissed: true })
  assert.ok(dismissed.ok)
  assert.ok(dismissed.data.checklistDismissedAt instanceof Date)

  const restored = parseOnboardingPatch({ checklistDismissed: false })
  assert.ok(restored.ok)
  assert.equal(restored.data.checklistDismissedAt, null)
})

test('PATCH parser rejects empty and non-object bodies', () => {
  assert.equal(parseOnboardingPatch({}).ok, false)
  assert.equal(parseOnboardingPatch(null).ok, false)
  assert.equal(parseOnboardingPatch('nope').ok, false)
})
