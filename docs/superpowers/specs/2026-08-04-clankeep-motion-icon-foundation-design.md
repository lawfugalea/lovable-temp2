# Motion and icon foundation, piloted on chores

Status: implemented 2026-08-04
Date: 2026-08-04

## Goal

Establish two reusable UI systems — a motion vocabulary and a chore icon
system — and prove them on the chores surface. Chores gains identity icons that
react to state, a grouped Overdue / Today / Done list, and a fix for a case
where undo is currently unreachable.

This is the first of seven specs in an app-wide UI upgrade. It exists to set the
vocabulary the other six reuse, so it deliberately spends effort on shared
primitives that chores alone would not justify.

## Scope of the wider programme

The app-wide sweep decomposes into seven specs, each with its own
spec → plan → implementation cycle:

| # | Spec | Surface |
|---|------|---------|
| **A** | **This document** — motion + icon foundation, piloted on chores | `components/ui`, `components/chores` |
| B | Shell and dashboard | `ModernAppShell`, `dashboard.tsx` |
| C | Shopping | `shopping.tsx`, `components/shopping` |
| D | Meals and medicine | `meals.tsx`, `medicine.tsx` and their components |
| E | Finances and banking | `components/finance`, `components/banking`, `components/charts` |
| F | Notes | `notes.tsx`, `components/notes` |
| G | Settings, admin, household, help | those four pages |

Spec C must absorb `docs/SHOPPING_PAGE_REDESIGN_PLAN.md`, which is approved and
unimplemented. Nothing in this spec may contradict it.

## Approved product decisions

- **Motion personality: "Considered".** 200ms envelope, soft spring on the
  check, identity-icon-to-check swap, and a slow 4s breathe on overdue rows.
  Chosen over a calmer colour-only option and a playful overshoot option after
  comparing all three animating side by side.
- **Icons are both identity and state.** Each chore shows an icon for what it
  is, and that icon reacts to status.
- **Icon source is hybrid.** Inferred from the title by default, overridable per
  chore through a picker.
- **Stay on `lucide-react@0.344`.** Four common chores have no matching icon in
  that version; documented substitutes are used instead.
- **Motion implementation is hybrid.** CSS and Tailwind for state transitions,
  `motion`'s `AnimatePresence` only for rows moving between groups.
- **Chores pilot includes restructuring**, not just polish: grouped list,
  progress summary, and the undo fix.
- **Reduced motion follows the OS setting only.** No in-app toggle.

## Architecture

Three units with one purpose each, and one narrow point of contact.

### Unit 1 — Motion vocabulary

Shared, with no knowledge of chores.

- `src/lib/motion.ts` — the single source of truth for timings, exported as
  named constants: durations `fast: 120ms`, `base: 200ms`, `slow: 320ms`;
  easings `out` and `spring: cubic-bezier(.34, 1.25, .64, 1)`; the idle
  `breathe: 4s`. Specs B–G import these rather than restating numbers.
- Reduced motion is asked via `usePrefersReducedMotion()`, which already
  existed in `src/hooks/useMediaQuery.ts` before this spec — reused as-is
  rather than duplicated with a new hook file.
- `tailwind.config.js` — four new keyframes (`check-in`, `strike`, `breathe`,
  `row-settle`) alongside the eight already defined.
- `src/styles/globals.css` — one `prefers-reduced-motion` block that neutralises
  the new keyframes to their end state.

### Unit 2 — Chore icon system

No knowledge of motion.

- `src/lib/chore-icons.ts` — the registry mapping stable string ids to lucide
  components, the eight category groups, the keyword inference table, and
  `resolveChoreIcon()`. Pure functions, no React, directly unit-testable.
- `src/components/chores/ChoreIconPicker.tsx` — the searchable, grouped grid
  used inside the chore form.

### Unit 3 — Chores surface

Consumes units 1 and 2.

- `src/components/chores/ChoreIcon.tsx` — takes an icon id and a status,
  renders the icon-to-check swap. **The only module that depends on both
  systems.**
- `src/components/chores/ChoreGroupedList.tsx` — Overdue / Today / Done
  grouping. Extracted so `chores.tsx` does not grow; `ChoreTodayList` remains
  the row renderer for a single flat group, which is what the dashboard's
  `compact` mode still needs.
- `src/lib/chore-view.ts` — **pure**, no prisma import: the grouping function and
  the "was this resolved on the caller's local today" rule (see the undo fix).
  It must stay prisma-free so the client can import it and so the unit suite can
  test it without a database — the same constraint commits `077322b` and
  `4a6f157` were fixing, and which `tests/script-import-safety.test.ts` guards.
  `src/lib/chores.ts` cannot host this logic because it imports prisma.

### Why these boundaries

`chore-icons.ts` knows nothing about animation and `motion.ts` knows nothing
about chores, so shopping or meals can adopt either half without dragging in
the other. `ChoreIcon.tsx` is the only file that would need rewriting if either
system changed shape.

### Shared primitives that gain the CSS layer

So specs B–G inherit polish rather than reimplementing it:

- `src/components/ui/Skeleton.tsx` — skeleton-to-content crossfade, 180ms,
  replacing the current hard swap.
- `src/components/ui/EmptyState.tsx` — icon entrance.
- `src/components/ui/Button.tsx` — press feedback.

`tabs.tsx` needed no change: `TabsTrigger` already carries `transition-all`,
and the chores page draws its own per-trigger underline rather than a shared
moving indicator, so there was nothing to add.

`Dialog.tsx` is deliberately excluded: it already animates correctly via Radix
and already respects reduced motion.

## The icon system in detail

### Stored value is a semantic id, not a lucide name

`Chore.icon` holds `"hoover"`, `"dishes"`, `"bin"` — never `"Wind"`,
`"UtensilsCrossed"`, `"Trash2"`.

This is what makes the 0.344 substitutes safe. The registry maps
`hoover -> Wind` today; a future lucide upgrade changes that to
`hoover -> Vacuum` with **no data migration**. Storing library names would bake
today's compromise into the database.

### Resolution precedence

`resolveChoreIcon(chore)` resolves in this order:

1. `chore.icon` is set and present in the registry — use it. An explicit user
   choice always wins.
2. Otherwise infer from the title.
3. No keyword match — the `ListChecks` fallback.

`icon: null` therefore means **auto**, not "no icon". Renaming a chore keeps
updating its icon until the user overrides it.

### Inference rules

Lowercase the title, match on word boundaries, and evaluate **longest keyword
first**. The ordering is load-bearing: `"wash"` must not win against
`"washing up"` or `"dishes"`, or "wash the dishes" resolves to a washing
machine. Resolution must be deterministic for a given title.

The keyword table uses British and Maltese English as used in the household:
`hoover`, `washing up`, `bin`, `rubbish`, `tumble dryer`. A US-centric list
would miss most of how these chores are actually typed.

### The four substitutes

`lucide-react@0.344` has no vacuum, broom/mop, toilet, or dish/plate icon.
Verified against the installed package: 76 of 79 candidate icons exist;
`Toilet`, `Vacuum` and `Broom` do not.

| Chore concept | Icon used | Note |
|---|---|---|
| `dishes` / washing up | `UtensilsCrossed` | substitute |
| `hoover` / vacuum | `Wind` | substitute, least confident |
| `sweep` / mop | `Brush` | substitute |
| `bathroom` / toilet | `Bath` | substitute |

Because ids are semantic, replacing any of these later is a one-line registry
change.

### Registry shape

Roughly 60 icons in eight groups — Cleaning, Kitchen, Laundry, Bathroom,
Home & repair, Outdoor, Pets, Family & admin — not the full 4,538 lucide
exports. The picker's first cell is **Auto**, showing the currently inferred
icon, so reverting to inference is one click.

### Validation and the security rule

The API accepts `icon` only when it is `null` or a key present in the registry;
anything else returns `400` in the same shape as existing chore validation
errors. The renderer resolves components **through the registry map only** — an
unknown id yields the fallback. There is no dynamic component lookup from a
stored string, so a stored value can never become an arbitrary rendered
component. A `CHORE_ICON_MAX` constant sits beside the existing
`CHORE_TITLE_MAX` and `CHORE_NOTES_MAX` in `src/lib/chores.ts`.

### Where icons appear

Today rows, the all-chores list, log entries, and the dashboard compact widget.
One component, four call sites.

### Migration

One additive nullable column, `Chore.icon String?`. No backfill: every existing
chore lights up immediately through inference. No destructive statements. It
satisfies `scripts/check-migration-manifest.mjs` (unique timestamp,
`migration.sql` present) and gives `scripts/check-migration-drift.mjs` nothing
to catch.

## The motion system in detail

Four animations. Nothing else animates.

### 1. The completion moment — 200ms envelope, fires on click

| Element | Change | Timing |
|---|---|---|
| Box fill and border | to `module-chores`, white icon | 200ms ease-out |
| Identity icon | opacity 1 to 0, scale 1 to 0.7 | 160ms ease-out |
| Check mark | opacity 0 to 1, scale 0.55 to 1 | 160ms / 260ms spring, 60ms delay |
| Title | colour to muted | 200ms ease-out |
| Strikethrough | `scaleX(0)` to `scaleX(1)` from left | 320ms, 80ms delay |
| Row | tint to `module-chores / 7%`, settle back | 500ms ease-out |

Undo plays the exact mirror: check out, identity icon back in, strikethrough
retracts. One component handles both directions, so undo cannot look broken.

### 2. Overdue breathe

Border colour oscillating between amber 35% and 90% over 4s, `ease-in-out`,
infinite. Applies only to rows that are both overdue **and** pending, and stops
the instant one is resolved. This is the only always-on animation in the app.

### 3. Group relocation

The single place `AnimatePresence` is used. The row exits its old group
(opacity to 0, `translateY(-4px)`, 180ms) and enters the new one (opacity 0 to
1, `translateY(6px)`, 200ms); rows left behind close the gap through motion's
layout animation instead of jumping.

### 4. Skeleton-to-content crossfade

180ms, in `ui/Skeleton.tsx`, inherited by every module.

### Optimistic completion

Today, completing a chore sets `busyKey`, disables the control, and waits for
`/api/chores/complete` before anything visibly changes — which would put the
200ms animation behind a network round trip and make it feel like latency.

Completion becomes optimistic: the animation fires on click, the request goes
out behind it, and on failure the row animates back with a `sonner` toast.

This is the largest correctness surface in the spec and needs real tests.

### Reduced motion, and what must survive it

All four animations collapse to their end state instantly.

The overdue breathe is the exception that matters: it becomes a **static amber
border at the mid value**, not nothing. The pulse is the only non-textual
overdue signal, and removing it entirely would quietly cost information for
exactly the users who asked for less motion. Reduced motion removes movement,
not meaning.

### Accessibility

- The identity icon is `aria-hidden`; the title already carries the meaning.
- The completion control keeps its existing `aria-label`.
- Group headings are real headings, so Overdue / Today / Done is navigable.
- No state is signalled by colour alone: overdue keeps its "was due Sat 2 Aug"
  text, done keeps the strikethrough and "done by" attribution.

## Chores surface restructure

Three groups: **Overdue**, then **Today**, then **Done**.

- **Done** is collapsed by default when it holds more than three items, so a
  busy day does not push tomorrow's work off screen.
- A compact progress summary at the top (`3 of 7 done`). This is the only new
  element in the today list itself; the rest of the restructure reorganises what
  is already there. (The Log tab's undo control and the dashboard's undo
  affordance are additions too, but they belong to the undo fix below.)
- Resolving a row plays the group relocation animation, so Overdue to Done is a
  visible move rather than a disappearance.

## The undo fix

### Current behaviour

Undo is fully implemented — the button in `ChoreTodayList`, the `undoItem`
handler, and `DELETE /api/chores/complete` — but it becomes **unreachable** for
overdue chores.

The last line of `buildTodayView` in `src/lib/chores.ts`:

```js
// Overdue-but-resolved occurrences are history, not today's work.
.filter(item => !(item.overdue && item.status !== 'PENDING'))
```

The sequence:

1. The user ticks an overdue chore. `resolveItem` POSTs successfully, then calls
   `await loadToday()`.
2. The refetch drops that row, because it is now overdue **and** resolved.
3. The row vanishes from the Today tab, taking its Undo button with it.
4. It appears in the Log tab, which has no undo control — only a badge, title
   and date.

Undo is then impossible through the UI. A chore due **today** is unaffected: it
stays in the list with its Undo button. The defect is specific to overdue
chores, which are the ones most likely to be caught up on in a hurry and
mis-tapped.

Traced through the code, not reproduced against the production database. The
filter is unconditional, so the path is not in doubt.

### The fix

- `buildTodayView` stops discarding resolved overdue occurrences. They move into
  the **Done** group, where the Undo button lives, so a tick and its undo are
  always in the same place.
- The original comment's intent is preserved: they must not accumulate forever.

**How "must not accumulate" is actually enforced.** A naive "keep resolved
overdue occurrences" rule does not age out the next day.
`lastScheduledOnOrBefore` returns the last scheduled date *on or before* the
requested date, so a weekly chore due Saturday keeps resolving to that same
Saturday every day until the following Saturday — the resolved row would sit in
Done for up to six days.

The rule is therefore based on **when it was resolved**, not when it was due: a
resolved *overdue* occurrence is shown only if it was resolved on the caller's
local today. Occurrences due today are always shown regardless of when they were
resolved, because they are today's work either way.

The timezone-safe split:

- `buildTodayView` returns resolved overdue occurrences and includes
  `completedAt` on each item.
- The **client** decides whether `completedAt` falls on its local today, exactly
  as it already decides what "today" is when it sends `?date=`. No timezone
  information has to cross the API boundary, and the existing comment in
  `today.ts` — "the client sends its own local date so today is the family's
  today" — keeps holding.

This requires adding `completedAt: string | null` to the `TodayChoreItem`
interface, which currently carries only `completedBy`.

Throughout this spec, **resolved** means status `DONE` or `SKIPPED`. Both appear
in the Done group and both are undoable.
- **The Log tab gains an undo control** for the "I completed that last Tuesday
  by mistake" case. `DELETE /api/chores/complete` already accepts any
  `choreId` + `dueDate` pair with no restriction to today, so this is UI only.
  Undoing from the Log reuses the existing `undoItem` path and must refresh all
  three dependent views: refetch the log, refetch today (the occurrence may
  reappear as pending overdue), and bump `statsRefreshKey` so the fairness panel
  recalculates.
- The dashboard `compact` mode gains a visible undo affordance. Today it hides
  the button (`ChoreTodayList.tsx:107`) while the checkbox still undoes on
  click — a working action with no discoverable affordance.

## Data flow, errors, security

### Optimistic reconciliation and its race

`loadToday()` currently overwrites everything it returns, so a slow response
could clobber a newer tap once completion is optimistic.

The page keeps a set of in-flight keys (`choreId:dueDate`) and, when merging a
refetch, preserves the optimistic status of any key still in flight. The single
`busyKey` becomes a per-item map, so one pending request no longer blocks an
unrelated row.

### Errors

A failed complete or undo reverts the row through the mirrored animation and
raises a `sonner` toast carrying the server's message, reusing the existing
`errorMessage()` helper so wording stays consistent. An unknown icon id returns
`400` and surfaces inline in `ChoreFormDialog`, matching how title and
recurrence errors already behave.

### Security

No new endpoints. Every path still passes through `getUserIdOr401` and
`requireActiveHousehold`, so `tests/api-authorization.test.ts` and
`tests/api-guard-coverage.test.ts` need no changes — and if they did, that would
be the signal something is wrong. The only new input is `icon`, whitelisted
against the registry.

## Testing

`node:test`, following the existing `tests/*.test.ts` convention.

- **`tests/chore-icons.test.ts`**
  - Specificity ordering: `"wash the dishes"` must not resolve to a washing
    machine. This is the load-bearing assertion.
  - Precedence: explicit beats inferred beats fallback.
  - Unknown ids are rejected by validation.
  - **Every registry id maps to a real lucide export.** This makes the
    substitute decision safe and catches a future lucide bump breaking an id.
- **`tests/chore-view.test.ts`** — the undo fix's regression tests, against the
  pure `src/lib/chore-view.ts`, no database required:
  - A resolved overdue occurrence resolved on the local today is grouped into
    **Done**, so its Undo button is reachable.
  - The same occurrence resolved on an earlier day is excluded — specifically
    covering the weekly-chore case where `lastScheduledOnOrBefore` keeps
    returning the same past Saturday for six days.
  - Occurrences due today are grouped regardless of when they were resolved.
  - `SKIPPED` is treated as resolved, exactly like `DONE`.
- **Extend the chores tests** — `buildTodayView` no longer discards resolved
  overdue occurrences and populates `completedAt` on every resolved item.
- **API validation** — unknown icon returns 400; `null` is accepted as auto.
- **`tests/migration-safety.test.ts`** — assert the new migration is additive
  only.
- **Static motion checks** — every new keyframe has a defined reduced-motion end
  state, so the amber overdue border cannot silently vanish. No attempt to test
  animation timing.

Existing gates unchanged: `npm test`, `npm run lint`, `npm run typecheck`,
`npm run build`, `node scripts/check-migration-manifest.mjs`.

## Out of scope

- The chore fairness panel and streaks.
- The `lucide-react` upgrade.
- Every other module — specs B through G.
- An in-app reduced-motion toggle.

## Files touched

**New**

- `src/lib/motion.ts`
- `src/lib/chore-icons.ts`
- `src/lib/chore-view.ts` — pure, must not import prisma
- `src/components/chores/ChoreIcon.tsx`
- `src/components/chores/ChoreIconPicker.tsx`
- `src/components/chores/ChoreGroupedList.tsx`
- `prisma/migrations/<generated timestamp>_chore_icon/migration.sql`
- `tests/chore-icons.test.ts`
- `tests/chore-view.test.ts`

**Changed**

- `prisma/schema.prisma` — `Chore.icon String?`
- `src/lib/chores.ts` — serialise `icon`, `CHORE_ICON_MAX`, the
  `buildTodayView` filter fix, `completedAt` on `TodayChoreItem`
- `src/pages/api/chores/index.ts`, `src/pages/api/chores/[id].ts` — accept and
  validate `icon`
- `src/components/chores/ChoreFormDialog.tsx` — the picker field
- `src/components/chores/ChoreTodayList.tsx` — icon, motion, visible compact
  undo
- `src/pages/chores.tsx` — grouping, progress summary, optimistic state, log
  undo
- `src/pages/dashboard.tsx` — compact undo affordance
- `tailwind.config.js`, `src/styles/globals.css` — keyframes and the
  reduced-motion block
- `src/components/ui/Skeleton.tsx`, `EmptyState.tsx`, `Button.tsx`
- `tests/migration-safety.test.ts`
