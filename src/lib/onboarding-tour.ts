/**
 * Guided product tour — step registry.
 *
 * Pure data with no React and no DOM access, so the API route can import it to
 * validate `tourStepId` without pulling a component tree onto the server.
 *
 * The tour walks through the app rather than describing it from the dashboard:
 * it navigates to shopping, meals, chores and notes in turn, so the user has
 * actually seen each area and knows what the button they need looks like. Every
 * step declares the page it belongs on, and TourProvider handles getting there.
 */

export type TourStepId =
  | 'welcome'
  | 'nav'
  | 'shopping'
  | 'meals'
  | 'chores'
  | 'notes'
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
   * The page this step belongs on. TourProvider navigates here before showing
   * the step, and pauses the tour if the user navigates away by other means.
   */
  href: string
  /**
   * Value of the `data-tour` attribute to anchor to. The same value is applied
   * to every breakpoint variant of the target (sidebar / icon rail / bottom tab
   * bar; mobile / desktop button), and `resolveAnchor` picks whichever one is
   * actually visible. Omit for a centred, unanchored card.
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
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    href: '/dashboard',
    title: 'A quick walk through',
    body: "We'll visit each part of ClanKeep in turn — about two minutes. You can leave at any point; press Escape and we'll remember where you got to.",
  },
  {
    id: 'nav',
    href: '/dashboard',
    target: 'nav',
    side: 'right',
    title: 'Everything your home runs on',
    body: 'Shopping, meals, chores, notes, medicine, finance and banking each get their own area. Your household shares all of them. Let’s look at the main ones.',
    bodyMobile: "Shopping, meals, chores and your overview sit in the bar below; tap More for notes, medicine, finance and banking. Let's look at the main ones.",
  },
  {
    id: 'shopping',
    href: '/shopping',
    target: 'page-shopping',
    side: 'bottom',
    title: 'Shopping lists everyone can add to',
    body: 'Pick a list here, and add to it from your phone in the shop. Items sort themselves by aisle, and anything you buy every week can be saved as a template.',
  },
  {
    id: 'meals',
    href: '/meals',
    target: 'page-meals',
    side: 'bottom',
    title: 'Plan the week, then shop for it',
    body: 'Fill in what you are cooking each day, save the recipes your household actually makes, and turn the whole week into one shopping list.',
  },
  {
    id: 'chores',
    href: '/chores',
    target: 'page-chores',
    side: 'bottom',
    title: 'The jobs that come round again',
    body: 'Set up bins, laundry, watering the plants — say how often each repeats and who does it, and ClanKeep works out what is due today.',
  },
  {
    id: 'notes',
    href: '/notes',
    target: 'page-notes',
    side: 'bottom',
    title: 'Everything that is not a list',
    body: 'The wifi password, school dates, the plumber’s number. Keep a note to yourself, or share it with the household.',
  },
  {
    id: 'checklist',
    href: '/dashboard',
    target: 'checklist',
    side: 'top',
    optional: true,
    title: 'Five things to start with',
    body: 'Back on your overview. Each of these takes under a minute and makes the place feel like yours — tick them off in any order.',
  },
  {
    id: 'upgrade',
    href: '/dashboard',
    target: 'upgrade',
    side: 'bottom',
    optional: true,
    when: (ctx) => ctx.plan === 'FREE',
    title: "What's included",
    // Supermarket price comparison is deliberately not named here. It is a
    // Family feature in code, but it only works where the deployment has
    // consented to a supermarket's catalogue (SUPERMARKET_CONSENTED_STORES), and
    // production currently consents to none — so naming it in the tour sells
    // every new signup something the app answers 503 for. Add the clause back in
    // the same breath as switching the stores on.
    body: 'Everything you have just seen is free, along with medicine tracking for one child. The money planner and connected banking are on the Family plan.',
  },
  {
    id: 'help',
    href: '/dashboard',
    target: 'help',
    side: 'bottom',
    optional: true,
    title: 'Help when you want it',
    body: 'Help explains every area in more detail, answers the common questions, and can replay this walkthrough whenever you like.',
  },
  {
    id: 'done',
    href: '/dashboard',
    title: "That's the tour",
    body: 'Press ⌘K (Ctrl+K on Windows) to jump anywhere from any page. Most households start with a shopping list — everything else is in Help when you need it.',
  },
]

export const TOUR_STEP_IDS: readonly string[] = TOUR_STEPS.map((step) => step.id)

export const FIRST_TOUR_STEP_ID: TourStepId = TOUR_STEPS[0].id

/** Pages the tour visits, for prefetching before it starts. */
export const TOUR_ROUTES: readonly string[] = Array.from(new Set(TOUR_STEPS.map((step) => step.href)))

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

/** 1-based position and total, for the "Step 3 of 10" counter. */
export function stepPosition(id: TourStepId, ctx: TourContext): { index: number; total: number } {
  const steps = applicableSteps(ctx)
  return { index: steps.findIndex((step) => step.id === id) + 1, total: steps.length }
}
