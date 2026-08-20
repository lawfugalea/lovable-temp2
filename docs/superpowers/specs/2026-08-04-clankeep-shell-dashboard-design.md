# Shell and dashboard motion consistency, and one module-color unification

Status: implemented 2026-08-04
Date: 2026-08-04

## Goal

Bring the app shell (`ModernAppShell`) and the dashboard into the same motion
vocabulary Spec A established for chores, and unify a second, independent
module-color mapping that the dashboard has been carrying since before this
spec. This is Spec B of a seven-spec app-wide UI upgrade — Spec A (chores) is
implemented and live; this spec is deliberately small.

## Scope

Exploration found the shell and dashboard already have a motion layer, just
not one built on Spec A's vocabulary:

- `ModernAppShell.tsx:398` wraps every page's content in `animate-fade-in`
  (0.4s ease-out) — a page-transition fade that already runs on every
  navigation.
- The dashboard's six `SummaryCard`s use `animate-rise` (0.5s, staggered by
  100ms per card via `delayClass`) for their once-per-load entrance
  (`dashboard.tsx:115`).
- Both animations are pre-existing Tailwind utilities, unrelated to
  `src/lib/motion.ts`.

Separately, the dashboard defines its own module-color mapping,
`summaryTones` (`dashboard.tsx:84-110`), duplicating `src/lib/modules.ts`'s
`ModuleEntry` array with three fields `modules.ts` doesn't have. This spec
folds `summaryTones` away rather than let it keep drifting from the shell's
mapping.

## Approved product decisions

- **Keep today's motion pace.** A side-by-side comparison of the current
  timings (0.4s fade, 0.5s rise, 100ms stagger) against Spec A's faster
  "Considered" pace (0.2s, 0.32s, 60ms stagger) was reviewed directly in
  motion, applied to the real dashboard layout and module colors. The
  existing pace stays: it is the app's once-per-session welcome moment, not
  an interaction the user repeats dozens of times a day the way completing a
  chore is, so the case for retuning it to feel "snappier" was weaker than
  it was for chores' completion moment.
- **Document the two-persona split; do not duplicate numbers.** Rather than
  copying the welcome pace's values into `motion.ts` as a second set of named
  constants, `motion.ts` gains one documentation block explaining that the
  app has two deliberate motion personas — Spec A's "Considered" (driving
  `MOTION_DURATION`/`MOTION_EASING`/`ROW_TRANSITION`, used for interaction
  feedback) and a slower "Welcome" pace (the dashboard's existing fade/rise,
  used once per load) — with the welcome pace's actual values staying solely
  in `tailwind.config.js`, cross-referenced by comment. Two files holding the
  same numbers is a drift risk the moment either changes; one file holding
  the numbers and one file explaining them is not.
- **Unify module colors by extending `ModuleEntry`.** Of three ways to remove
  the duplication (extend `modules.ts` with the missing fields; replace all
  fields with a derived-classes helper function; keep `summaryTones` but
  derive it from `modules.ts` at load time), extending `ModuleEntry` was
  chosen: it satisfies "one source of truth" with the smallest blast radius,
  since it is purely additive to a file the shell nav already depends on.
- **New fields go on all 8 modules, not just the 5 the dashboard uses.** The
  original duplication existed because `summaryTones` only ever covered the
  cards that existed when it was written. Requiring every `ModuleEntry`
  literal to carry the new fields (TypeScript enforces this, since it's a
  plain array of object literals) means a future ninth summary card can't
  reintroduce the same partial-mapping problem.

## Architecture

Two independent changes. Neither shares a file with the other, so they can be
built and reviewed separately.

### Part A — document, don't duplicate, the motion split

- `src/lib/motion.ts` — a documentation block (no new exported constants)
  explaining the "Considered" vs "Welcome" persona split, and stating that
  the welcome pace's real values live in `tailwind.config.js`, not here.
- `tailwind.config.js` — a one-line comment on the existing `fade-in` and
  `rise` animation entries, pointing back to `motion.ts`'s explanation.

No behavior change. `ModernAppShell.tsx` and `dashboard.tsx` are not
modified by Part A.

### Part B — unify module colors

- `src/lib/modules.ts` — `ModuleEntry` gains three fields, added to all 8
  entries in the `modules` array:
  - `cardTileClass` — icon tile plus ring, e.g.
    `bg-module-shopping/10 text-module-shopping ring-1 ring-module-shopping/15`
    (today's `summaryTones.tile`).
  - `cardLinkClass` — the "Open X" ghost-button hover state, e.g.
    `text-module-shopping hover:bg-module-shopping/10 hover:text-module-shopping`
    (today's `summaryTones.link`).
  - `cardHoverBorderClass` — the whole card's border-on-hover, e.g.
    `hover:border-module-shopping/30` (today's `summaryTones.hover`).

  Only 5 of the 8 modules (`shopping`, `finances`, `medicine`, `chores`,
  `meals`) have an existing `summaryTones` entry to mirror. The other 3 —
  `home`, `banking`, `notes` — get the same mechanical derivation applied to
  their own color token, not a guess: take each module's existing `tileClass`
  color (e.g. `module-notes`, or `primary` for `home`, which uses the generic
  primary token rather than a `module-X` one — `modules.ts`'s `home` entry is
  already `bg-primary/10 text-primary`, not `bg-module-home/10`) and apply the
  same three suffix patterns (`ring-1 ring-<token>/15`,
  `hover:bg-<token>/10 hover:text-<token>`, `hover:border-<token>/30`) that
  the other 5 modules already demonstrate. `home`'s three new fields are
  therefore built on `primary`, exactly mirroring how its existing
  `tileClass`/`activeClass`/`barClass`/`textClass` already do.
- `src/pages/dashboard.tsx`:
  - Delete the `summaryTones` object entirely.
  - Widen `SummaryCardProps.tone` from its current hand-rolled
    `"shopping" | "finances" | "medicine" | "chores" | "meals"` union to the
    full `ModuleKey` (imported from `@/lib/modules`).
  - `SummaryCard` swaps `summaryTones[tone]` for `moduleByKey[tone]` — the
    same lookup `src/components/ui/EmptyState.tsx` already uses for its own
    module-tinted tile, not a new pattern introduced by this spec.
  - The five existing `tone="..."` call sites (`shopping`, two uses of
    `finances`, `medicine`, `meals`, `chores`) are untouched; they now
    type-check against the wider union instead of the narrower one.

This is purely additive to `modules.ts`: the shell nav, sidebar, icon rail
and bottom tab bar read only the four fields that existed before this spec,
so Part B carries zero risk to code that currently works.

## Out of scope, and why

- **Nav, sidebar, drawer and command-palette interaction motion.** The
  product decision was consistency polish, not new interaction motion —
  nothing about hover, open, or close behavior on `CommandPalette.tsx`,
  the mobile `Sheet` drawer, or `BottomTabBar.tsx` changes.
- **Migrating dashboard empty states to the shared `EmptyState` component.**
  The dashboard currently handles empty conditions (no shopping items, no
  meds due) via each `SummaryCard`'s own description text. That is a
  content/structure decision, not a motion-consistency one.
- **`Skeleton`/`Button` changes.** The dashboard's existing `DashboardSkeleton`
  already renders via `<Skeleton>`, so it already inherited Spec A's
  `animate-skeleton-in` crossfade for free. Nothing to do here.
- **New reduced-motion handling.** Unlike chores' overdue pulse, the
  page-fade and card-rise carry no state information — nothing is lost by
  letting them collapse to instant. The pre-existing global clamp in
  `src/styles/globals.css:355-364` (which predates both this spec and Spec A)
  already does this correctly; no per-animation static fallback is needed,
  unlike the chores overdue ring.

## Testing

- **`modules.ts` completeness** — a test asserting every one of the 8
  `ModuleEntry` entries has a non-empty `cardTileClass`, `cardLinkClass`, and
  `cardHoverBorderClass`. Mirrors Spec A's "every registry id maps to a real
  lucide export" defensive-completeness test: cheap, and it is what catches
  a ninth module forgetting the new fields.
- **No API, database, or migration testing** — this spec touches no server
  code and no schema. It is confined to `src/lib/modules.ts` and
  `src/pages/dashboard.tsx`, plus the two documentation-only edits in Part A.
- Existing gates unchanged: `npm test`, `npm run lint`, `npm run typecheck`,
  `npm run build`. (No test currently exercises `modules.ts` or
  `dashboard.tsx` at all — this spec is the first to add any.)

## Files touched

**Changed**

- `src/lib/motion.ts` — documentation block only, no new exports
- `tailwind.config.js` — one-line cross-reference comment on `fade-in`/`rise`
- `src/lib/modules.ts` — three new fields per `ModuleEntry`, all 8 modules
- `src/pages/dashboard.tsx` — delete `summaryTones`, widen `tone` prop,
  `SummaryCard` reads `moduleByKey`

**New**

- A test file covering `modules.ts`'s completeness (exact path decided at
  planning time, following this repo's existing `tests/*.test.ts` flat
  convention)
