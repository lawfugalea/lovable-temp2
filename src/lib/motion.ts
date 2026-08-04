/**
 * The app's motion vocabulary for interaction feedback — hover, focus, and
 * completing an action. Every such surface takes its timings from here.
 *
 * Personality is "Considered": fast enough never to read as waiting, with a
 * soft spring only on the moments that matter. Chosen over a colour-only option
 * and a playful overshoot option after comparing all three in motion. See
 * docs/superpowers/specs/2026-08-04-clankeep-motion-icon-foundation-design.md.
 *
 * This is not the app's only pace. `animate-fade-in` and `animate-rise`
 * (tailwind.config.js) are pre-existing, widely-shared entrance animations —
 * used well beyond the dashboard, including the app shell's page transition,
 * empty states, notes, and banking surfaces — and this file does not govern
 * them. Their values live only in tailwind.config.js, not mirrored here —
 * two files holding the same numbers is a drift risk the moment either one
 * changes.
 * See docs/superpowers/specs/2026-08-04-clankeep-shell-dashboard-design.md.
 *
 * Reduced motion is handled globally in src/styles/globals.css, which clamps
 * every animation and transition duration with !important. Anything whose
 * appearance must survive that clamp has to carry its resting state in a base
 * class rather than in a keyframe.
 */

/** Milliseconds. Use these for CSS durations and for setTimeout bookkeeping. */
export const MOTION_DURATION = {
  /** Hover, focus, and other feedback that should feel instant. */
  fast: 120,
  /** The default state change, including the chore completion moment. */
  base: 200,
  /** Longer sweeps such as a strikethrough crossing a title. */
  slow: 320,
  /** A highlight fading back to rest. */
  settle: 500,
  /** The overdue idle pulse. Slow enough to notice without demanding attention. */
  breathe: 4000,
} as const

export const MOTION_EASING = {
  /** Decelerating; the default for state changes. */
  out: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  /** Slight overshoot. Reserved for confirmation, never for entrances. */
  spring: 'cubic-bezier(0.34, 1.25, 0.64, 1)',
} as const

/**
 * Variants for a list row moving between groups, for `motion/react`.
 *
 * Durations here are in **seconds**, which is what motion expects — unlike
 * MOTION_DURATION above. They intentionally mirror MOTION_DURATION.base and a
 * slightly quicker exit, so a row leaves a little faster than it arrives and the
 * list never looks congested.
 */
export const ROW_TRANSITION = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.18 } },
} as const
