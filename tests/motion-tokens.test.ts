import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { MOTION_DURATION, MOTION_EASING, ROW_TRANSITION } from '../src/lib/motion'

/**
 * The motion vocabulary, and the one property of it that a code review would
 * not catch: globals.css clamps every animation and transition under
 * prefers-reduced-motion, so a keyframe is not allowed to be the only carrier
 * of a meaningful colour. See the spec's "Reduced motion" section.
 */

test('durations and easings match the approved "Considered" personality', () => {
  assert.equal(MOTION_DURATION.fast, 120)
  assert.equal(MOTION_DURATION.base, 200)
  assert.equal(MOTION_DURATION.slow, 320)
  assert.equal(MOTION_DURATION.settle, 500)
  assert.equal(MOTION_DURATION.breathe, 4000)
  assert.equal(MOTION_EASING.spring, 'cubic-bezier(0.34, 1.25, 0.64, 1)')
  assert.equal(MOTION_EASING.out, 'cubic-bezier(0.22, 0.61, 0.36, 1)')
})

test('row transition variants are in seconds, as motion/react expects', () => {
  assert.equal(ROW_TRANSITION.exit.transition.duration, 0.18)
  assert.equal(ROW_TRANSITION.animate.transition.duration, 0.2)
  assert.equal(ROW_TRANSITION.initial.y, 6)
  assert.equal(ROW_TRANSITION.exit.y, -4)
})

const tailwindConfig = readFileSync(join(process.cwd(), 'tailwind.config.js'), 'utf8')

/*
 * Only two config assertions, deliberately. Whether a keyframe exists and parses
 * is already proven by `npm run build` failing without it, so asserting the name
 * appears in the file would just duplicate the build. The two below are
 * different: nothing else in the suite notices if they regress, and both would
 * silently break the overdue signal for reduced-motion users.
 */

test('the breathe keyframe only modulates borderColor', () => {
  // It must not be the sole source of the amber overdue ring: globals.css
  // neutralises it under reduced motion, and the ring is the only non-textual
  // overdue signal. The resting colour belongs on a base class (Task 3).
  const breathe = tailwindConfig.slice(tailwindConfig.indexOf("breathe: {"))
  const body = breathe.slice(0, breathe.indexOf('},') + 1)
  assert.ok(body.includes('borderColor'))
  assert.ok(!body.includes('backgroundColor'), 'breathe must not animate a fill')
})

test('globals.css still carries the global reduced-motion clamp', () => {
  // Later tasks depend on this existing. If it is ever removed, every animation
  // in this plan needs an explicit reduced-motion branch instead.
  const globals = readFileSync(join(process.cwd(), 'src/styles/globals.css'), 'utf8')
  assert.ok(globals.includes('@media (prefers-reduced-motion: reduce)'))
  assert.ok(globals.includes('animation-duration: 0.01ms !important'))
})
