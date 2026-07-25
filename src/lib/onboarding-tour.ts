/**
 * Guided product tour — step registry.
 *
 * Pure data with no React and no DOM access, so the API route can import it to
 * validate `tourStepId` without pulling a component tree onto the server.
 *
 * Every step anchors to something on /dashboard. The engine supports navigating
 * between steps (see `href`) but the shipped tour deliberately uses none of it:
 * route changes unmount ModernAppShell, which churns every anchor mid-tour. What
 * each module is for is explained where the user actually arrives with intent —
 * the per-module first-run empty states and /help.
 */

export type TourStepId =
  | 'welcome'
  | 'nav'
  | 'search'
  | 'header'
  | 'checklist'
  | 'upgrade'
  | 'help'
  | 'done'

/** What the engine knows about the household when deciding which steps apply. */
export interface TourContext {
  plan: 'FREE' | 'FAMILY'
}

export interface TourStep {
  id: TourStepId
  /**
   * Value of the `data-tour` attribute to anchor to. The same value is applied
   * to every breakpoint variant of the target (sidebar / icon rail / bottom tab
   * bar); `resolveAnchor` picks whichever one is actually visible. Omit for a
   * centred, unanchored card.
   */
  target?: string
  title: string
  body: string
  /** Copy substituted below the `sm` breakpoint, where the nav lives at the bottom. */
  bodyMobile?: string
  /** Preferred popover side at >= sm. Ignored in the mobile sheet presentation. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /**
   * Skip silently when the anchor cannot be resolved — the target is legitimately
   * absent at this breakpoint or for this user. Non-optional steps whose anchor
   * is missing fall back to a centred card rather than dead-ending the tour.
   */
  optional?: boolean
  /** Skip when the predicate is false. Used for plan-dependent steps. */
  when?: (ctx: TourContext) => boolean
  /** Navigate before showing this step. Unused by the shipped tour — see above. */
  href?: string
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    title: 'A quick look around',
    body: "This takes about 90 seconds and shows you where everything lives. You can leave at any point — press Escape and we'll remember where you got to.",
  },
  {
    id: 'nav',
    target: 'nav',
    side: 'right',
    title: 'Everything your home runs on',
    body: 'Shopping, meals, chores, notes, medicine, finance and banking each get their own area. Your household shares all of them.',
    bodyMobile: 'Shopping, meals, chores and your overview sit in the bar below. Tap More for notes, medicine, finance and banking.',
  },
  {
    id: 'search',
    target: 'search',
    side: 'bottom',
    title: 'Jump anywhere',
    body: 'Search opens from any page with ⌘K (Ctrl+K on Windows). Type a page name to go there, or search help if you get stuck.',
  },
  {
    id: 'header',
    target: 'header-title',
    side: 'bottom',
    title: "You're always in one household",
    body: 'Everything you add belongs to your household, and everyone you invite sees it. This line tells you which area you are looking at.',
  },
  {
    id: 'checklist',
    target: 'checklist',
    side: 'top',
    optional: true,
    title: 'Five things to start with',
    body: 'Each one takes under a minute and makes the place feel like yours. Tick them off in any order, or dismiss the card — you can bring it back from Help.',
  },
  {
    id: 'upgrade',
    target: 'upgrade',
    side: 'bottom',
    optional: true,
    when: (ctx) => ctx.plan === 'FREE',
    title: "What's included",
    body: 'Shopping, meals, chores, notes and medicine for one child are free. The money planner, connected banking and supermarket price comparison are on the Family plan.',
  },
  {
    id: 'help',
    target: 'help',
    side: 'bottom',
    optional: true,
    title: 'Help when you want it',
    body: 'Help explains every area in more detail, answers the common questions, and can replay this tour whenever you like.',
  },
  {
    id: 'done',
    title: "That's the tour",
    body: 'Start wherever feels most useful — most households begin with a shopping list. Everything else is in Help when you need it.',
  },
]

export const TOUR_STEP_IDS: readonly string[] = TOUR_STEPS.map((step) => step.id)

export const FIRST_TOUR_STEP_ID: TourStepId = TOUR_STEPS[0].id

export function isTourStepId(value: unknown): value is TourStepId {
  return typeof value === 'string' && TOUR_STEP_IDS.includes(value)
}

export function getTourStep(id: TourStepId): TourStep | null {
  return TOUR_STEPS.find((step) => step.id === id) ?? null
}

/** Steps that apply to this household, in order. */
export function applicableSteps(ctx: TourContext): TourStep[] {
  return TOUR_STEPS.filter((step) => step.when === undefined || step.when(ctx))
}

function walk(from: TourStepId, ctx: TourContext, direction: 1 | -1): TourStepId | null {
  const steps = applicableSteps(ctx)
  const index = steps.findIndex((step) => step.id === from)
  // An inapplicable current step (e.g. the plan changed mid-tour) resolves to
  // the nearest applicable one rather than stranding the user.
  if (index === -1) return direction === 1 ? (steps[0]?.id ?? null) : null
  return steps[index + direction]?.id ?? null
}

export function nextStepId(from: TourStepId, ctx: TourContext): TourStepId | null {
  return walk(from, ctx, 1)
}

export function prevStepId(from: TourStepId, ctx: TourContext): TourStepId | null {
  return walk(from, ctx, -1)
}

/** 1-based position and total, for the "Step 3 of 7" counter. */
export function stepPosition(id: TourStepId, ctx: TourContext): { index: number; total: number } {
  const steps = applicableSteps(ctx)
  return { index: steps.findIndex((step) => step.id === id) + 1, total: steps.length }
}
