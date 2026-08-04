# Shell/Dashboard Motion Documentation and Module-Color Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document (without duplicating) the app's two motion personas, and remove the dashboard's second, independent module-color mapping in favor of the one `src/lib/modules.ts` already provides to the shell.

**Architecture:** Two fully independent parts, touching disjoint files. Part A is documentation-only — no exported values change, no component re-renders differently. Part B is additive to `ModuleEntry` (three new fields, applied to all 8 modules) and deletes `dashboard.tsx`'s local `summaryTones` object in favor of the existing `moduleByKey` lookup.

**Tech Stack:** Next.js Pages Router, React 18, TypeScript strict, Tailwind CSS 3, `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-04-clankeep-shell-dashboard-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **No runtime behavior change in Part A.** `src/lib/motion.ts` and `tailwind.config.js` gain comments only. Neither task touches `ModernAppShell.tsx` or `dashboard.tsx`'s rendered fade/rise timing.
- **Part B is additive to `ModuleEntry`.** The four existing fields (`tileClass`, `activeClass`, `barClass`, `textClass`) are untouched — the shell nav, sidebar, icon rail and bottom tab bar have zero exposure to this change.
- **The three new fields must be byte-identical to today's rendered classes** for the 5 modules that already have a `summaryTones` precedent (`shopping`, `finances`, `medicine`, `chores`, `meals`) — this is a relocation, not a redesign, and must not shift the ring width or any other visual property.
- **`banking` reuses the `finances` colour token, `home` uses the generic `primary` token** — neither has its own `module-X` CSS variable. The three new fields for these two modules must follow the exact same pattern as their own existing `tileClass`/`barClass` already do, not invent a new token.
- Node 22, npm. TypeScript strict.
- Tests run via `npm test` (`node --test --require ts-node/register tests/*.test.ts`). Baseline before this plan: **314 passing, 0 failing.**
- Verification commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Follow the existing flat `tests/*.test.ts` convention. A test file with no Prisma dependency imports its subject via a relative path (`../src/lib/modules`), not the `@/` alias — `ts-node` does not apply the tsconfig `paths` mapping at require time (see `tests/helpers/api-harness.ts`'s own comment on this).
- Branch: continue on `agent/houseflow-production-release`. Commit locally; **do not push** unless asked.

---

### Task 1: Document the two motion personas

**Files:**
- Modify: `src/lib/motion.ts:1-14` (the file-level doc comment)
- Modify: `tailwind.config.js` (the `animation` object's `'fade-in'`/`rise` entries, currently at lines 107-108)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new — no exported value changes shape or name. This task is comments only.

**Why this task has no test-first cycle:** there is no new behavior to assert. The one real risk is a syntax error in `tailwind.config.js` (a plain JS file) breaking the whole build, which `npm run build` catches directly — a fabricated unit test asserting comment text would just be checking prose, not behavior, which is exactly what an earlier spec's own review pushed back on as brittle.

- [ ] **Step 1: Replace `motion.ts`'s file-level doc comment**

The current top-of-file comment (`src/lib/motion.ts:1-14`) states "every animated surface takes its timings from here" and "the whole of Clankeep moves at one speed" — both now inaccurate, since the dashboard's fade/rise deliberately does not. Replace the whole comment block with:

```ts
/**
 * The app's motion vocabulary for interaction feedback — hover, focus, and
 * completing an action. Every such surface takes its timings from here.
 *
 * Personality is "Considered": fast enough never to read as waiting, with a
 * soft spring only on the moments that matter. Chosen over a colour-only option
 * and a playful overshoot option after comparing all three in motion. See
 * docs/superpowers/specs/2026-08-04-clankeep-motion-icon-foundation-design.md.
 *
 * This is not the app's only pace. The dashboard's page-fade and its six
 * summary cards' entrance (`animate-fade-in`, `animate-rise` in
 * tailwind.config.js) run once per load rather than repeating dozens of
 * times a day, so they deliberately keep a slower, separate "Welcome" pace
 * instead of adopting Considered's speed. Those values live only in
 * tailwind.config.js, not mirrored here — two files holding the same numbers
 * is a drift risk the moment either one changes.
 * See docs/superpowers/specs/2026-08-04-clankeep-shell-dashboard-design.md.
 *
 * Reduced motion is handled globally in src/styles/globals.css, which clamps
 * every animation and transition duration with !important. Anything whose
 * appearance must survive that clamp has to carry its resting state in a base
 * class rather than in a keyframe.
 */
```

Do not touch `MOTION_DURATION`, `MOTION_EASING`, or `ROW_TRANSITION` below this comment — they are unchanged.

- [ ] **Step 2: Cross-reference from `tailwind.config.js`**

In `tailwind.config.js`, the `animation` object currently opens with (find via the exact string `'fade-in': 'fade-in 0.4s ease-out',`):

```js
  		animation: {
  			'fade-in': 'fade-in 0.4s ease-out',
  			rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
```

Add a comment immediately above those two lines, matching the file's existing indentation style (mirror the surrounding lines exactly rather than reformatting):

```js
  		animation: {
  			// Dashboard's once-per-load "Welcome" pace — deliberately slower than
  			// the "Considered" interaction pace in src/lib/motion.ts. See
  			// docs/superpowers/specs/2026-08-04-clankeep-shell-dashboard-design.md.
  			'fade-in': 'fade-in 0.4s ease-out',
  			rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `npm run build 2>&1 | tail -20`

Expected: success. This is the one real gate for this task — a malformed comment inside the `tailwind.config.js` object literal (e.g. an unterminated `//` swallowing the next line) fails here, not silently.

- [ ] **Step 4: Verify lint and the test baseline are unchanged**

Run: `npm run lint && npm test 2>&1 | tail -8`

Expected: lint clean; test count still `314 / 314`, 0 failures — this task adds no tests and changes no logic, so the count must not move.

- [ ] **Step 5: Commit**

```bash
git add src/lib/motion.ts tailwind.config.js
git commit -m "docs(motion): document the dashboard's separate welcome-pace persona

Corrects motion.ts's own claim that every animated surface shares one
pace — the dashboard's page-fade and card-rise deliberately don't, and
now say so instead of silently contradicting the file's opening comment."
```

---

### Task 2: Unify module colors — extend `ModuleEntry`, retire `summaryTones`

**Files:**
- Modify: `src/lib/modules.ts` (the `ModuleEntry` interface and all 8 entries in the `modules` array)
- Modify: `src/pages/dashboard.tsx` (delete `summaryTones`, widen `SummaryCardProps.tone`, update `SummaryCard`)
- Test: `tests/modules.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (fully independent).
- Produces: `ModuleEntry` gains `cardTileClass: string`, `cardLinkClass: string`, `cardHoverBorderClass: string`. `moduleByKey` (already exported, unchanged in shape — just now carries richer entries) is what `dashboard.tsx`'s `SummaryCard` consumes instead of the deleted `summaryTones`.

- [ ] **Step 1: Write the failing tests**

Create `tests/modules.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test 2>&1 | grep -A10 "modules.test"`

Expected: FAIL — TypeScript error, `Property 'cardTileClass' does not exist on type 'ModuleEntry'` (or equivalent `undefined` access failures), since the fields don't exist yet.

- [ ] **Step 3: Add the three fields to `ModuleEntry` and populate all 8 modules**

In `src/lib/modules.ts`, add three fields to the `ModuleEntry` interface, immediately after `textClass`:

```ts
  /** Module-coloured text on its own. */
  textClass: string
  /** Summary-card icon tile: soft tinted background, module-coloured icon, and a ring. */
  cardTileClass: string
  /** Summary-card "Open X" ghost-button hover state. */
  cardLinkClass: string
  /** Summary-card's whole-card border tint on hover. */
  cardHoverBorderClass: string
}
```

Add the three fields to **every one of the 8 entries** in the `modules` array, in this exact order (`textClass` is the last existing field in each entry, so add these three right after it):

**`home`** (after `textClass: 'text-primary',`):
```ts
    cardTileClass: 'bg-primary/10 text-primary ring-primary/15',
    cardLinkClass: 'text-primary hover:bg-primary/10 hover:text-primary',
    cardHoverBorderClass: 'hover:border-primary/30',
```

**`shopping`** (after `textClass: 'text-module-shopping',`):
```ts
    cardTileClass: 'bg-module-shopping/10 text-module-shopping ring-module-shopping/15',
    cardLinkClass: 'text-module-shopping hover:bg-module-shopping/10 hover:text-module-shopping',
    cardHoverBorderClass: 'hover:border-module-shopping/30',
```

**`meals`** (after `textClass: 'text-module-meals',`):
```ts
    cardTileClass: 'bg-module-meals/10 text-module-meals ring-module-meals/15',
    cardLinkClass: 'text-module-meals hover:bg-module-meals/10 hover:text-module-meals',
    cardHoverBorderClass: 'hover:border-module-meals/30',
```

**`chores`** (after `textClass: 'text-module-chores',`):
```ts
    cardTileClass: 'bg-module-chores/10 text-module-chores ring-module-chores/15',
    cardLinkClass: 'text-module-chores hover:bg-module-chores/10 hover:text-module-chores',
    cardHoverBorderClass: 'hover:border-module-chores/30',
```

**`finances`** (after `textClass: 'text-module-finances',` — the first occurrence, for the `finances` entry, not `banking`'s identical-looking one):
```ts
    cardTileClass: 'bg-module-finances/10 text-module-finances ring-module-finances/15',
    cardLinkClass: 'text-module-finances hover:bg-module-finances/10 hover:text-module-finances',
    cardHoverBorderClass: 'hover:border-module-finances/30',
```

**`banking`** (after its own `textClass: 'text-module-finances',` — identical values to `finances`, because `banking`'s existing `tileClass`/`activeClass`/`barClass`/`textClass` already reuse the `module-finances` token; there is no separate `module-banking` CSS variable):
```ts
    cardTileClass: 'bg-module-finances/10 text-module-finances ring-module-finances/15',
    cardLinkClass: 'text-module-finances hover:bg-module-finances/10 hover:text-module-finances',
    cardHoverBorderClass: 'hover:border-module-finances/30',
```

**`medicine`** (after `textClass: 'text-module-medicine',`):
```ts
    cardTileClass: 'bg-module-medicine/10 text-module-medicine ring-module-medicine/15',
    cardLinkClass: 'text-module-medicine hover:bg-module-medicine/10 hover:text-module-medicine',
    cardHoverBorderClass: 'hover:border-module-medicine/30',
```

**`notes`** (after `textClass: 'text-module-notes',`):
```ts
    cardTileClass: 'bg-module-notes/10 text-module-notes ring-module-notes/15',
    cardLinkClass: 'text-module-notes hover:bg-module-notes/10 hover:text-module-notes',
    cardHoverBorderClass: 'hover:border-module-notes/30',
```

Do not add `ring-1` inside `cardTileClass` — the ring **width** utility stays hardcoded in `dashboard.tsx`'s own JSX (Step 5 below), matching exactly how the ring width and ring colour are already split apart today. `cardTileClass` supplies only the ring **colour**, same as today's `summaryTones.tile`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test 2>&1 | grep -A20 "modules.test"`

Expected: PASS, all 5 new tests.

- [ ] **Step 5: Update `dashboard.tsx` to consume `moduleByKey` instead of `summaryTones`**

Add the import. `dashboard.tsx` uses double-quoted import strings throughout (unlike some other files in this repo) — match that convention. Add this line after the existing `import { visibleTodayChores } from "@/lib/chore-view"` line:

```ts
import { moduleByKey, type ModuleKey } from "@/lib/modules"
```

Change `SummaryCardProps.tone`'s type from:

```ts
  tone: "shopping" | "finances" | "medicine" | "chores" | "meals"
```

to:

```ts
  tone: ModuleKey
```

Delete the entire `summaryTones` object (currently the block starting `const summaryTones = {` and ending at the closing `}` right before `function SummaryCard`).

Replace the whole `SummaryCard` function body:

```ts
function SummaryCard({ eyebrow, title, description, href, action, icon: Icon, tone, delayClass }: SummaryCardProps) {
  const tones = summaryTones[tone]
  return (
    <Card className={cn("group animate-rise overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-soft", tones.hover, delayClass)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1", tones.tile)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <Badge variant="outline" className="font-medium text-muted-foreground">{eyebrow}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-muted-foreground">{description}</p>
        <Button asChild variant="ghost" className={cn("mt-5 -ml-3", tones.link)}>
          <Link href={href}>{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}
```

with:

```ts
function SummaryCard({ eyebrow, title, description, href, action, icon: Icon, tone, delayClass }: SummaryCardProps) {
  const entry = moduleByKey[tone]
  return (
    <Card className={cn("group animate-rise overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-soft", entry.cardHoverBorderClass, delayClass)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1", entry.cardTileClass)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <Badge variant="outline" className="font-medium text-muted-foreground">{eyebrow}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-muted-foreground">{description}</p>
        <Button asChild variant="ghost" className={cn("mt-5 -ml-3", entry.cardLinkClass)}>
          <Link href={href}>{action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}
```

Note this changes nothing about the rendered classes for the 5 already-covered modules — `entry.cardHoverBorderClass`/`cardTileClass`/`cardLinkClass` are byte-identical to the deleted `tones.hover`/`tones.tile`/`tones.link`, per Step 3's exact values and the "byte-identical" test in Step 1. The `ring-1` width utility stays exactly where it already was, in this same JSX.

The five existing call sites (`tone="shopping"`, `tone="finances"` ×2, `tone="medicine"`, `tone="meals"`, `tone="chores"`) need no changes — they already type-check against the wider `ModuleKey` union.

- [ ] **Step 6: Typecheck, lint, and confirm no other consumer of `summaryTones` exists**

Run: `grep -rn "summaryTones" src/` — expect no output (confirms the deletion is complete and nothing else referenced it).

Run: `npm run typecheck && npm run lint`

Expected: both clean.

- [ ] **Step 7: Build, and confirm the full test suite**

Run: `npm run build 2>&1 | tail -20`

Expected: success.

Run: `npm test 2>&1 | tail -10`

Expected: `319` passing (314 baseline + 5 new), 0 failing.

- [ ] **Step 8: Commit**

```bash
git add src/lib/modules.ts src/pages/dashboard.tsx tests/modules.test.ts
git commit -m "refactor(dashboard): unify module colors into modules.ts, retire summaryTones

dashboard.tsx carried its own module-color mapping since before this app had
one shared source. ModuleEntry gains the three fields summaryTones had that
modules.ts didn't; SummaryCard now reads moduleByKey, the same lookup
EmptyState already uses. Purely additive to modules.ts — the shell nav's
four existing fields are untouched."
```

---

## Self-review record

**Spec coverage.** Part A (motion.ts documentation, tailwind.config.js cross-reference) → Task 1. Part B (three new `ModuleEntry` fields, all 8 modules, `summaryTones` deletion, `SummaryCard` migration, completeness test) → Task 2. Both "out of scope" callouts in the spec (nav/drawer/command-palette motion, `EmptyState` migration, `Skeleton`/`Button` changes, new reduced-motion handling) require no task, since they require no code — confirmed nothing in either task touches `ModernAppShell.tsx`, `CommandPalette.tsx`, `BottomTabBar.tsx`, or any `Skeleton`/`EmptyState`/`Button` file.

**Placeholder scan.** No TBD/TODO; every code block is complete, exact, real values — including all 8 modules' three new fields spelled out in full in Task 2, not abbreviated or left as "repeat the pattern."

**Type consistency.** `ModuleEntry`'s three new field names (`cardTileClass`, `cardLinkClass`, `cardHoverBorderClass`) are used identically in the interface (Task 2 Step 3), the test (Task 2 Step 1), and `SummaryCard`'s new body (Task 2 Step 5) — no drift between them. `moduleByKey`'s existing exported shape (`Record<ModuleKey, ModuleEntry>`, `src/lib/modules.ts:135`) is unchanged; Task 2 only enriches what `ModuleEntry` itself contains.

**One inconsistency caught and fixed while writing this plan, not left for the implementer to discover.** The spec's own illustrative example for `cardTileClass` (`bg-module-shopping/10 text-module-shopping ring-1 ring-module-shopping/15`) included `ring-1` — but the actual current code splits the ring **width** (hardcoded in `dashboard.tsx`'s JSX, `ring-1`) from the ring **colour** (`summaryTones.tile`, no `ring-1`). Task 2 uses the verified real split (no `ring-1` in the field), confirmed against `dashboard.tsx`'s actual current source before this plan was written, not against the spec's shorthand example.

**Known limitation.** No test renders `SummaryCard` itself (no React Testing Library in this repo's test setup) — coverage is at the data layer (`modules.ts`'s field values), which is where the actual risk lives (a wrong token copy-pasted into the wrong module), not at the rendering layer (which is an unmodified, already-correct `cn()` composition).
