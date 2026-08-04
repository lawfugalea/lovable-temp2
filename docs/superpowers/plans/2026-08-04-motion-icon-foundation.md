# Motion and Icon Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Clankeep a shared motion vocabulary and a chore icon system, prove both on the chores surface, and fix the case where undo is unreachable after ticking an overdue chore.

**Architecture:** Three units with one narrow point of contact. `src/lib/motion.ts` plus four Tailwind keyframes carry the motion vocabulary and know nothing about chores. `src/lib/chore-icons.ts` maps semantic icon ids to lucide components and infers one from a chore title, knowing nothing about motion. `src/lib/chore-view.ts` is a database-free view model holding the Overdue/Today/Done grouping and its day rule. Only `src/components/chores/ChoreIcon.tsx` depends on both systems.

**Tech Stack:** Next.js 16 (Pages Router, webpack), React 18, TypeScript strict, Prisma 6 + PostgreSQL, Tailwind CSS 3, `lucide-react@0.344`, `motion@12`, `sonner`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-04-clankeep-motion-icon-foundation-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Node 22** throughout. npm, not yarn or pnpm.
- **Read `node_modules/next/dist/docs/` before writing Next-specific code.** Per `AGENTS.md`, this Next version has breaking changes versus training data.
- **The unit suite must never touch a database.** Every configured database URL in this repo points at production. Tests that need Prisma must stub it via `tests/helpers/api-harness.ts` (`stubModule('@/lib/prisma', …)`). Commits `077322b` and `4a6f157` exist purely to fix violations of this, and `tests/script-import-safety.test.ts` guards it.
- **`lucide-react` stays at `0.344`.** Do not upgrade it in this plan. It has no vacuum, broom/mop, toilet or dish icon; the documented substitutes are used instead.
- **A stored icon value is a semantic id, never a lucide component name.** `"hoover"`, not `"Wind"`.
- **Reduced motion is already global.** `src/styles/globals.css:355-364` clamps *every* animation and transition to `0.01ms` with `!important` under `prefers-reduced-motion: reduce`. Anything whose appearance must survive that clamp has to carry its resting state in a **base class**, not in a keyframe. This is why the overdue amber ring is a base class that the `breathe` keyframe merely modulates.
- **`usePrefersReducedMotion()` already exists** in `src/hooks/useMediaQuery.ts`. Do not create a new hook file. (The spec named `src/hooks/useReducedMotion.ts`; that was written before the existing hook was found.)
- **`src/components/ui/tabs.tsx` already has `transition-all`.** No change needed there, despite the spec listing it. Verified, not assumed.
- **British and Maltese English** in the keyword table and all user-facing copy: `hoover`, `washing up`, `bin`, `rubbish`, `tumble dryer`.
- **Migration naming:** `prisma/migrations/YYYYMMDDHHMMSS_snake_case_name/migration.sql`, hand-written SQL opening with a comment explaining why. Latest existing is `20260803120000_pantry`.
- **Motion's import path is `motion/react`**, matching `src/components/landing/Hero.tsx:6`.
- **Branch:** work continues on `agent/houseflow-production-release`. Commit locally; **do not push** unless asked.
- **Verification commands:** `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `node scripts/check-migration-manifest.mjs`.

---

### Task 1: Motion vocabulary and keyframes

Establishes the timings every later task imports, and the four keyframes they compile to.

**Files:**
- Create: `src/lib/motion.ts`
- Modify: `tailwind.config.js:106-113` (the `animation` block) and `tailwind.config.js:117-198` (the `keyframes` block)
- Test: `tests/motion-tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MOTION_DURATION: { fast: 120, base: 200, slow: 320, settle: 500, breathe: 4000 }` — milliseconds.
  - `MOTION_EASING: { out: string, spring: string }` — CSS timing functions.
  - `ROW_TRANSITION: { initial: {opacity,y}, animate: {opacity,y,transition}, exit: {opacity,y,transition} }` — `motion/react` variants in **seconds**, consumed by Task 6.
  - Tailwind utilities `animate-check-in`, `animate-strike`, `animate-breathe`, `animate-row-settle`.

- [ ] **Step 1: Write the failing test**

Create `tests/motion-tokens.test.ts`:

```ts
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

/** The body of a `name: { ... }` block in the config, brace-balanced. */
function configBlock(source: string, name: string): string {
  const start = source.indexOf(`${name}: {`)
  assert.notEqual(start, -1, `no ${name} block in tailwind.config.js`)
  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`unterminated ${name} block`)
}

test('the breathe keyframe only modulates borderColor', () => {
  // It must not be the sole source of the amber overdue ring: globals.css
  // neutralises it under reduced motion, and the ring is the only non-textual
  // overdue signal. The resting colour belongs on a base class (Task 3).
  //
  // Brace-balanced, not sliced to the first "},": that naive version stopped at
  // the end of the '0%, 100%' sub-key and never inspected '50%', so a
  // backgroundColor added there would have passed silently.
  const body = configBlock(tailwindConfig, 'breathe')
  // Proves the scan actually reached the second branch, so this test cannot
  // quietly go hollow again.
  assert.ok(body.includes('0.9'), "the '50%' branch must be inside the scanned block")
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test 2>&1 | grep -A5 motion-tokens`

Expected: FAIL — `Cannot find module '../src/lib/motion'`.

- [ ] **Step 3: Create the motion vocabulary**

Create `src/lib/motion.ts`:

```ts
/**
 * The app's motion vocabulary. Every animated surface takes its timings from
 * here, so the whole of Clankeep moves at one speed.
 *
 * Personality is "Considered": fast enough never to read as waiting, with a
 * soft spring only on the moments that matter. Chosen over a colour-only option
 * and a playful overshoot option after comparing all three in motion. See
 * docs/superpowers/specs/2026-08-04-clankeep-motion-icon-foundation-design.md.
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
```

- [ ] **Step 4: Register the animations in Tailwind**

In `tailwind.config.js`, inside the `animation` block (which currently ends with `'grow-bar': 'grow-bar 0.5s cubic-bezier(0.22, 1, 0.36, 1) both'`), add four entries after `grow-bar`:

```js
  			'grow-bar': 'grow-bar 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
  			// Chore completion. `both` holds the end state, which is also what
  			// the reduced-motion clamp in globals.css lands on.
  			'check-in': 'check-in 0.26s cubic-bezier(0.34, 1.25, 0.64, 1) 0.06s both',
  			strike: 'strike 0.32s cubic-bezier(0.22, 0.61, 0.36, 1) 0.08s both',
  			// The only always-on animation in the app.
  			'breathe': 'breathe 4s ease-in-out infinite',
  			'row-settle': 'row-settle 0.5s ease-out both'
```

- [ ] **Step 5: Register the keyframes in Tailwind**

In the same file, inside the `keyframes` block, after the `'accordion-up'` entry and before the closing `}`, add:

```js
  			},
  			// The check mark arriving as the identity icon leaves.
  			'check-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.55)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			// A strikethrough drawn left to right across a finished title.
  			strike: {
  				'0%': {
  					transform: 'scaleX(0)'
  				},
  				'100%': {
  					transform: 'scaleX(1)'
  				}
  			},
  			// Overdue idle pulse. This ONLY modulates the border — the resting
  			// amber lives on the row's base class, because globals.css clamps
  			// animations under prefers-reduced-motion and the ring is the only
  			// non-textual overdue signal. See choreBoxClasses in chore-view.ts.
  			breathe: {
  				'0%, 100%': {
  					borderColor: 'hsl(var(--brand-amber) / 0.35)'
  				},
  				'50%': {
  					borderColor: 'hsl(var(--brand-amber) / 0.9)'
  				}
  			},
  			// A just-resolved row flashing faintly, then settling back.
  			'row-settle': {
  				'0%': {
  					backgroundColor: 'hsl(var(--module-chores) / 0.07)'
  				},
  				'100%': {
  					backgroundColor: 'transparent'
  				}
  			}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test 2>&1 | tail -20`

Expected: PASS, all four `motion-tokens` tests.

- [ ] **Step 7: Confirm Tailwind still compiles**

Run: `npm run build 2>&1 | tail -15`

Expected: build succeeds. A malformed keyframes object fails here, not in the unit test.

- [ ] **Step 8: Commit**

```bash
git add src/lib/motion.ts tailwind.config.js tests/motion-tokens.test.ts
git commit -m "feat(motion): add the shared motion vocabulary and four keyframes"
```

---

### Task 2: Chore icon registry, inference and resolution

**Files:**
- Create: `src/lib/chore-icons.ts`
- Test: `tests/chore-icons.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ChoreIconId` — the union of registry keys.
  - `CHORE_ICONS: Record<ChoreIconId, LucideIcon>`
  - `CHORE_ICON_GROUPS: ReadonlyArray<{ name: string; ids: readonly ChoreIconId[] }>`
  - `FALLBACK_CHORE_ICON_ID: 'general'`
  - `CHORE_ICON_MAX: 32`
  - `isChoreIconId(value: unknown): value is ChoreIconId`
  - `inferChoreIconId(title: string): ChoreIconId`
  - `resolveChoreIconId(chore: { title: string; icon?: string | null }): ChoreIconId`
  - `choreIconComponent(id: ChoreIconId): LucideIcon`

- [ ] **Step 1: Write the failing test**

Create `tests/chore-icons.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test 2>&1 | grep -A5 chore-icons`

Expected: FAIL — `Cannot find module '../src/lib/chore-icons'`.

- [ ] **Step 3: Create the icon registry**

Create `src/lib/chore-icons.ts`:

```ts
import {
  AppWindow, Baby, Bath, Bed, Bike, Blinds, Bone, BookOpen, Brush, Calendar, Car,
  Cat, ChefHat, Coffee, CookingPot, CreditCard, Dog, DoorOpen, Drill, FileText,
  Fish, Flower2, Fuel, GraduationCap, Hammer, Heart, KeyRound, Lamp, Leaf,
  Lightbulb, ListChecks, Mail, Microwave, Package, PaintRoller, PawPrint, Phone,
  Pill, Plug, Recycle, Refrigerator, Salad, Shirt, ShoppingCart, Shovel,
  ShowerHead, Sofa, Sparkles, SprayCan, Sprout, Thermometer, Trash2, Trees,
  Users, UtensilsCrossed, Wallet, WashingMachine, Waves, Wind, Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * Chore icons, keyed by a **semantic id** rather than a lucide component name.
 *
 * This indirection is the point. lucide 0.344 has no vacuum, broom, toilet or
 * dish icon, so four common chores use substitutes: `hoover` -> Wind,
 * `sweep` -> Brush, `bathroom` -> Bath, `dishes` -> UtensilsCrossed. Because the
 * database stores "hoover" and not "Wind", replacing a substitute later — or
 * upgrading lucide — is a one-line change here with no data migration.
 *
 * Never widen this to a dynamic lookup over lucide's ~4,500 exports. The
 * registry is also the allowlist that stops a stored string from becoming an
 * arbitrary rendered component.
 */
export const CHORE_ICONS = {
  // Cleaning
  clean: SprayCan,
  sweep: Brush,
  hoover: Wind,
  windows: AppWindow,
  bin: Trash2,
  recycling: Recycle,
  tidy: Sparkles,

  // Kitchen
  dishes: UtensilsCrossed,
  cooking: CookingPot,
  fridge: Refrigerator,
  microwave: Microwave,
  'meal-prep': ChefHat,
  veg: Salad,
  coffee: Coffee,

  // Laundry
  laundry: WashingMachine,
  clothes: Shirt,
  towels: Waves,

  // Bathroom
  bathroom: Bath,
  shower: ShowerHead,

  // Home and repair
  lightbulb: Lightbulb,
  repair: Wrench,
  diy: Hammer,
  drill: Drill,
  paint: PaintRoller,
  plugs: Plug,
  heating: Thermometer,
  blinds: Blinds,
  doors: DoorOpen,
  keys: KeyRound,
  bed: Bed,
  furniture: Sofa,
  lamp: Lamp,

  // Outdoor
  plants: Sprout,
  leaves: Leaf,
  garden: Trees,
  flowers: Flower2,
  digging: Shovel,
  car: Car,
  bike: Bike,
  fuel: Fuel,

  // Pets
  pets: PawPrint,
  dog: Dog,
  cat: Cat,
  fish: Fish,
  'pet-food': Bone,

  // Family and admin
  baby: Baby,
  family: Users,
  post: Mail,
  bills: CreditCard,
  budget: Wallet,
  paperwork: FileText,
  calendar: Calendar,
  calls: Phone,
  shopping: ShoppingCart,
  parcels: Package,
  medicine: Pill,
  health: Heart,
  homework: BookOpen,
  school: GraduationCap,

  /** Shown when nothing matched. Not offered as a group choice. */
  general: ListChecks,
} satisfies Record<string, LucideIcon>

export type ChoreIconId = keyof typeof CHORE_ICONS

export const FALLBACK_CHORE_ICON_ID: ChoreIconId = 'general'

/** Longest id is "meal-prep"; 32 leaves room without inviting junk. */
export const CHORE_ICON_MAX = 32

/** Picker layout. The fallback is deliberately absent — "Auto" covers it. */
export const CHORE_ICON_GROUPS: ReadonlyArray<{ name: string; ids: readonly ChoreIconId[] }> = [
  { name: 'Cleaning', ids: ['clean', 'sweep', 'hoover', 'windows', 'bin', 'recycling', 'tidy'] },
  { name: 'Kitchen', ids: ['dishes', 'cooking', 'fridge', 'microwave', 'meal-prep', 'veg', 'coffee'] },
  { name: 'Laundry', ids: ['laundry', 'clothes', 'towels'] },
  { name: 'Bathroom', ids: ['bathroom', 'shower'] },
  {
    name: 'Home & repair',
    ids: ['lightbulb', 'repair', 'diy', 'drill', 'paint', 'plugs', 'heating', 'blinds', 'doors', 'keys', 'bed', 'furniture', 'lamp'],
  },
  { name: 'Outdoor', ids: ['plants', 'leaves', 'garden', 'flowers', 'digging', 'car', 'bike', 'fuel'] },
  { name: 'Pets', ids: ['pets', 'dog', 'cat', 'fish', 'pet-food'] },
  {
    name: 'Family & admin',
    ids: ['baby', 'family', 'post', 'bills', 'budget', 'paperwork', 'calendar', 'calls', 'shopping', 'parcels', 'medicine', 'health', 'homework', 'school'],
  },
]

/**
 * Title keywords, in British and Maltese English as the household actually types
 * them. Order in this array does not matter — matching is longest-keyword-first,
 * see ORDERED below.
 */
const KEYWORDS: ReadonlyArray<readonly [string, ChoreIconId]> = [
  // Kitchen. "washing up" and "dishes" must both outrank "washing".
  ['washing up', 'dishes'], ['wash up', 'dishes'], ['dishes', 'dishes'], ['dishwasher', 'dishes'],
  ['oven', 'cooking'], ['cook', 'cooking'], ['cooking', 'cooking'], ['dinner', 'cooking'], ['lunch', 'cooking'],
  ['fridge', 'fridge'], ['freezer', 'fridge'], ['microwave', 'microwave'],
  ['meal prep', 'meal-prep'], ['meal plan', 'meal-prep'], ['coffee', 'coffee'],

  // Cleaning
  ['hoover', 'hoover'], ['hoovering', 'hoover'], ['vacuum', 'hoover'],
  ['sweep', 'sweep'], ['mop', 'sweep'],
  ['scrub', 'clean'], ['clean', 'clean'], ['cleaning', 'clean'],
  ['tidy', 'tidy'], ['declutter', 'tidy'],
  ['bin', 'bin'], ['bins', 'bin'], ['rubbish', 'bin'], ['trash', 'bin'],
  ['recycling', 'recycling'], ['recycle', 'recycling'],
  ['window', 'windows'], ['windows', 'windows'],

  // Laundry
  ['washing machine', 'laundry'], ['tumble dryer', 'laundry'], ['laundry', 'laundry'], ['washing', 'laundry'],
  ['iron', 'clothes'], ['ironing', 'clothes'], ['fold', 'clothes'], ['clothes', 'clothes'],
  ['towels', 'towels'],

  // Bathroom and bedroom
  ['bathroom', 'bathroom'], ['toilet', 'bathroom'], ['loo', 'bathroom'], ['shower', 'shower'],
  ['bed', 'bed'], ['sheets', 'bed'], ['bedding', 'bed'],

  // Home and repair
  ['light bulb', 'lightbulb'], ['lightbulb', 'lightbulb'], ['bulb', 'lightbulb'],
  ['repair', 'repair'], ['fix', 'repair'], ['paint', 'paint'],
  ['heating', 'heating'], ['boiler', 'heating'], ['aircon', 'heating'],
  ['blinds', 'blinds'], ['curtains', 'blinds'], ['keys', 'keys'], ['doors', 'doors'],
  ['furniture', 'furniture'], ['sofa', 'furniture'],

  // Outdoor
  ['water the plants', 'plants'], ['plant', 'plants'], ['plants', 'plants'],
  ['garden', 'garden'], ['lawn', 'garden'], ['grass', 'garden'], ['mow', 'garden'],
  ['leaves', 'leaves'], ['flowers', 'flowers'],
  ['car', 'car'], ['bike', 'bike'], ['petrol', 'fuel'], ['fuel', 'fuel'],

  // Pets
  ['walk the dog', 'dog'], ['dog', 'dog'], ['cat', 'cat'], ['litter', 'cat'],
  ['aquarium', 'fish'], ['fish', 'fish'], ['pet', 'pets'], ['pets', 'pets'],

  // Family and admin
  ['bills', 'bills'], ['bill', 'bills'], ['pay', 'bills'], ['budget', 'budget'],
  ['post', 'post'], ['letters', 'post'],
  ['parcel', 'parcels'], ['parcels', 'parcels'], ['package', 'parcels'],
  ['shopping', 'shopping'], ['groceries', 'shopping'],
  ['medicine', 'medicine'], ['pills', 'medicine'], ['prescription', 'medicine'],
  ['homework', 'homework'], ['school', 'school'],
  ['baby', 'baby'], ['nappies', 'baby'],
  ['calendar', 'calendar'], ['call', 'calls'], ['phone', 'calls'],
  ['paperwork', 'paperwork'], ['admin', 'paperwork'], ['filing', 'paperwork'],
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Longest keyword first. This ordering is load-bearing, not tidiness: "washing"
 * would otherwise win against "washing up", and "wash the dishes" would show a
 * washing machine. Compiled once at module load.
 */
const ORDERED: ReadonlyArray<readonly [RegExp, ChoreIconId]> = [...KEYWORDS]
  .sort((a, b) => b[0].length - a[0].length)
  .map(([keyword, id]) => [new RegExp(`\\b${escapeRegExp(keyword)}\\b`), id] as const)

export function isChoreIconId(value: unknown): value is ChoreIconId {
  // hasOwnProperty, not `in`: "constructor" and "__proto__" are not icons.
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHORE_ICONS, value)
}

export function inferChoreIconId(title: string): ChoreIconId {
  const haystack = title.toLowerCase()
  for (const [pattern, id] of ORDERED) {
    if (pattern.test(haystack)) return id
  }
  return FALLBACK_CHORE_ICON_ID
}

/** An explicit choice wins; `null` or an unknown id means infer from the title. */
export function resolveChoreIconId(chore: { title: string; icon?: string | null }): ChoreIconId {
  if (isChoreIconId(chore.icon)) return chore.icon
  return inferChoreIconId(chore.title)
}

export function choreIconComponent(id: ChoreIconId): LucideIcon {
  return isChoreIconId(id) ? CHORE_ICONS[id] : CHORE_ICONS[FALLBACK_CHORE_ICON_ID]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test 2>&1 | grep -A30 "chore-icons"`

Expected: PASS, all nine tests.

If `every registry id maps to a real lucide export` fails, the named export does not exist in 0.344 — pick another and note the substitution in a comment. Do not upgrade lucide.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chore-icons.ts tests/chore-icons.test.ts
git commit -m "feat(chores): add the chore icon registry, inference and resolution"
```

---

### Task 3: Chore view model — grouping, the day rule, and the box classes

The database-free half of the chores surface. This is where the undo fix's behaviour actually lives, and where the reduced-motion guarantee becomes testable.

**Files:**
- Create: `src/lib/chore-view.ts`
- Test: `tests/chore-view.test.ts`

**Interfaces:**
- Consumes: nothing (must not import prisma — see Global Constraints).
- Produces:
  - `interface ChoreSummary { id, title, notes, schedule, icon, assignee }`
  - `interface TodayChoreItem { chore, dueDate, overdue, status, completedBy, completedAt }`
  - `type ChoreStatus = 'PENDING' | 'DONE' | 'SKIPPED'`
  - `interface GroupedChores { overdue: TodayChoreItem[]; today: TodayChoreItem[]; done: TodayChoreItem[] }`
  - `localDateOnly(date?: Date): string`
  - `localDateOf(isoTimestamp: string): string`
  - `todayItemKey(item: TodayChoreItem): string`
  - `isResolved(item: TodayChoreItem): boolean`
  - `groupTodayChores(items: TodayChoreItem[], localDate: string): GroupedChores`
  - `choreProgress(groups: GroupedChores): { done: number; total: number }`
  - `choreBoxClasses(status: ChoreStatus, overdue: boolean): string`

- [ ] **Step 1: Write the failing test**

Create `tests/chore-view.test.ts`:

```ts
// Pin the zone before any Date work: the day rule is timezone-sensitive by
// design, and a test that drifts with the runner's locale is worse than none.
process.env.TZ = 'UTC'

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  choreBoxClasses,
  choreProgress,
  groupTodayChores,
  isResolved,
  localDateOf,
  todayItemKey,
  type TodayChoreItem,
} from '../src/lib/chore-view'

/**
 * Grouping, and the rule that fixes unreachable undo.
 *
 * Before this, buildTodayView discarded every resolved overdue occurrence, so
 * ticking an overdue chore made the row and its Undo button vanish — and the Log
 * tab had no undo control. Keeping such rows is the fix; the subtlety is *how
 * long* to keep them. Keying off the due date does not work, because
 * lastScheduledOnOrBefore keeps returning the same past date: a weekly chore
 * ticked late would sit in Done for six days. The rule is therefore based on
 * when it was resolved.
 */

function item(overrides: Partial<TodayChoreItem> = {}): TodayChoreItem {
  return {
    chore: {
      id: 'chore-1',
      title: 'Wash the dishes',
      notes: null,
      schedule: 'Every Saturday',
      icon: null,
      assignee: null,
    },
    dueDate: '2026-08-01',
    overdue: true,
    status: 'PENDING',
    completedBy: null,
    completedAt: null,
    ...overrides,
  }
}

const TODAY = '2026-08-04' // a Tuesday; 2026-08-01 was the Saturday before

test('pending occurrences split by overdue', () => {
  const groups = groupTodayChores(
    [item({ overdue: true }), item({ overdue: false, dueDate: TODAY })],
    TODAY,
  )
  assert.equal(groups.overdue.length, 1)
  assert.equal(groups.today.length, 1)
  assert.equal(groups.done.length, 0)
})

test('an overdue chore resolved today lands in Done, so Undo stays reachable', () => {
  const groups = groupTodayChores(
    [item({ status: 'DONE', completedAt: '2026-08-04T09:00:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 1)
  assert.equal(groups.overdue.length, 0)
})

test('an overdue chore resolved on an earlier day is gone from today', () => {
  // The weekly-chore case: due Sat 1 Aug, ticked Sun 2 Aug. On Tue 4 Aug
  // lastScheduledOnOrBefore still returns 1 Aug, so without this rule the row
  // would linger in Done until the following Saturday.
  const groups = groupTodayChores(
    [item({ status: 'DONE', completedAt: '2026-08-02T09:00:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 0)
  assert.equal(groups.overdue.length, 0)
  assert.equal(groups.today.length, 0)
})

test('an occurrence due today stays in Done however long ago it was resolved', () => {
  const groups = groupTodayChores(
    [item({ overdue: false, dueDate: TODAY, status: 'DONE', completedAt: '2026-08-04T00:05:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 1)
})

test('SKIPPED counts as resolved, exactly like DONE', () => {
  assert.equal(isResolved(item({ status: 'SKIPPED' })), true)
  assert.equal(isResolved(item({ status: 'DONE' })), true)
  assert.equal(isResolved(item({ status: 'PENDING' })), false)
  const groups = groupTodayChores(
    [item({ status: 'SKIPPED', completedAt: '2026-08-04T09:00:00.000Z' })],
    TODAY,
  )
  assert.equal(groups.done.length, 1)
})

test('a resolved overdue row with no completedAt is dropped, not crashed on', () => {
  const groups = groupTodayChores([item({ status: 'DONE', completedAt: null })], TODAY)
  assert.equal(groups.done.length, 0)
})

test('progress counts every group', () => {
  const groups = groupTodayChores(
    [
      item({ overdue: true }),
      item({ overdue: false, dueDate: TODAY }),
      item({ overdue: false, dueDate: TODAY, status: 'DONE', completedAt: '2026-08-04T08:00:00.000Z' }),
    ],
    TODAY,
  )
  assert.deepEqual(choreProgress(groups), { done: 1, total: 3 })
})

test('keys identify an occurrence, not just a chore', () => {
  assert.equal(todayItemKey(item({ dueDate: '2026-08-01' })), 'chore-1:2026-08-01')
  assert.notEqual(todayItemKey(item({ dueDate: '2026-08-01' })), todayItemKey(item({ dueDate: TODAY })))
})

test('localDateOf returns a date-only string', () => {
  assert.equal(localDateOf('2026-08-04T09:00:00.000Z'), '2026-08-04')
})

test('an overdue box carries static amber as well as the pulse', () => {
  // The reduced-motion guarantee. globals.css clamps animate-breathe, so if the
  // amber only lived in the keyframe it would disappear for exactly the people
  // who asked for less movement — and amber is the only non-textual overdue cue.
  const classes = choreBoxClasses('PENDING', true)
  assert.ok(classes.includes('animate-breathe'), 'overdue rows should pulse')
  assert.ok(classes.includes('border-brand-amber'), 'the resting amber must be a base class')
})

test('resolved and ordinary boxes do not pulse', () => {
  assert.ok(!choreBoxClasses('DONE', true).includes('animate-breathe'))
  assert.ok(!choreBoxClasses('SKIPPED', true).includes('animate-breathe'))
  assert.ok(!choreBoxClasses('PENDING', false).includes('animate-breathe'))
})

test('a done box is filled with the chores colour', () => {
  assert.ok(choreBoxClasses('DONE', false).includes('bg-module-chores'))
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test 2>&1 | grep -A5 chore-view`

Expected: FAIL — `Cannot find module '../src/lib/chore-view'`.

- [ ] **Step 3: Create the view model**

Create `src/lib/chore-view.ts`:

```ts
import { cn } from './utils'

/**
 * The chores view model: types, grouping, and the presentation rules that both
 * the server-rendered page and the tests need.
 *
 * This module must stay free of Prisma. The client imports it, and the unit
 * suite must not open a database connection — every configured database URL in
 * this repo is production. src/lib/chores.ts holds the query side.
 */

export type ChoreStatus = 'PENDING' | 'DONE' | 'SKIPPED'

export interface ChoreSummary {
  id: string
  title: string
  notes: string | null
  schedule: string
  /** A semantic id from chore-icons.ts, or null meaning "infer from the title". */
  icon: string | null
  assignee: { id: string; name: string | null } | null
}

export interface TodayChoreItem {
  chore: ChoreSummary
  dueDate: string
  overdue: boolean
  status: ChoreStatus
  completedBy: { id: string; name: string | null } | null
  /** ISO timestamp of when this was resolved, or null while pending. */
  completedAt: string | null
}

export interface GroupedChores {
  overdue: TodayChoreItem[]
  today: TodayChoreItem[]
  done: TodayChoreItem[]
}

/**
 * `YYYY-MM-DD` in the viewer's own timezone.
 *
 * en-CA is used for its ISO ordering, not as a display locale — this value is a
 * machine-readable key that goes into API query strings and comparisons, so it
 * is deliberately *not* APP_LOCALE ('en-MT'). Anything shown to a person should
 * use APP_LOCALE from src/lib/utils.ts instead. The same trick already appears
 * in chores.tsx and dashboard.tsx, which this replaces.
 */
export function localDateOnly(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

export function localDateOf(isoTimestamp: string): string {
  return localDateOnly(new Date(isoTimestamp))
}

/** An occurrence is a chore *and* a due date; the same chore recurs. */
export function todayItemKey(item: TodayChoreItem): string {
  return `${item.chore.id}:${item.dueDate}`
}

export function isResolved(item: TodayChoreItem): boolean {
  return item.status !== 'PENDING'
}

/**
 * Whether a resolved **overdue** occurrence still belongs on the today screen.
 *
 * Kept only for the day it was resolved, so Undo stays reachable for as long as
 * anyone would plausibly want it without turning Today into a history log.
 *
 * Keying off the due date instead does not work: lastScheduledOnOrBefore returns
 * the same past date every day until the next occurrence, so a weekly chore
 * ticked late would sit in Done for six days.
 */
function keepResolvedOverdue(item: TodayChoreItem, localDate: string): boolean {
  if (!item.completedAt) return false
  return localDateOf(item.completedAt) === localDate
}

/**
 * Split today's occurrences into Overdue, Today and Done.
 *
 * `localDate` is the viewer's own `YYYY-MM-DD`. The decision is made here rather
 * than on the server so no timezone has to cross the API boundary — the same
 * reason /api/chores/today already takes a client-supplied date.
 */
export function groupTodayChores(items: TodayChoreItem[], localDate: string): GroupedChores {
  const groups: GroupedChores = { overdue: [], today: [], done: [] }
  for (const item of items) {
    if (!isResolved(item)) {
      if (item.overdue) groups.overdue.push(item)
      else groups.today.push(item)
      continue
    }
    // Due today: always shown, however long ago it was resolved. Overdue: only
    // for the day it was resolved.
    if (!item.overdue || keepResolvedOverdue(item, localDate)) groups.done.push(item)
  }
  return groups
}

export function choreProgress(groups: GroupedChores): { done: number; total: number } {
  return {
    done: groups.done.length,
    total: groups.overdue.length + groups.today.length + groups.done.length,
  }
}

/**
 * Classes for the 36px completion box.
 *
 * The overdue case carries **both** `animate-breathe` and a static
 * `border-brand-amber/60`. That is deliberate: globals.css neutralises every
 * animation under prefers-reduced-motion, and the amber ring is the only
 * non-textual overdue signal. Reduced motion should remove movement, not
 * meaning. Keep the static colour if you ever touch the keyframe.
 */
export function choreBoxClasses(status: ChoreStatus, overdue: boolean): string {
  return cn(
    'relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 transition-colors duration-200',
    status === 'DONE' && 'border-module-chores bg-module-chores text-white',
    status === 'SKIPPED' && 'border-muted-foreground/30 bg-muted text-muted-foreground',
    status === 'PENDING' && overdue && 'border-brand-amber/60 bg-background text-brand-amber animate-breathe',
    status === 'PENDING' && !overdue && 'border-input bg-background text-muted-foreground',
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test 2>&1 | grep -A40 chore-view`

Expected: PASS, all twelve tests.

- [ ] **Step 5: Confirm the module is genuinely database-free**

Run: `TS_NODE_PROJECT=tsconfig.test.json node --require ts-node/register -e "require('./src/lib/chore-view.ts'); console.log('loaded with no prisma client')"`

Expected: prints the message. If it instead tries to connect or complains about `DATABASE_URL`, something in the import graph pulled Prisma in — find it and remove it.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chore-view.ts tests/chore-view.test.ts
git commit -m "feat(chores): add the database-free chores view model and grouping"
```

---

### Task 4: Schema, migration, serialization, the buildTodayView fix and API validation

**Files:**
- Modify: `prisma/schema.prisma:1098-1121` (the `Chore` model)
- Create: `prisma/migrations/20260804090000_chore_icon/migration.sql`
- Modify: `src/lib/chores.ts` — `CHORE_ICON_MAX` re-export, `ChoreRow`, `serializeChore`, `TodayChoreItem`, `buildTodayView`
- Modify: `src/pages/api/chores/index.ts:26-71` (POST)
- Modify: `src/pages/api/chores/[id].ts:24-66` (PATCH)
- Test: `tests/chores-today-view.test.ts`
- Modify: `tests/migration-safety.test.ts`

**Interfaces:**
- Consumes: `isChoreIconId`, `CHORE_ICON_MAX` from Task 2; `TodayChoreItem`, `ChoreSummary` from Task 3.
- Produces:
  - `Chore.icon: String?` in the database.
  - `serializeChore()` returns an extra `icon: string | null`.
  - `buildTodayView()` returns resolved overdue occurrences, each with `completedAt: string | null`.
  - `src/lib/chores.ts` re-exports `TodayChoreItem` from `chore-view.ts` so existing importers keep working.

- [ ] **Step 1: Write the failing test**

Create `tests/chores-today-view.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { registerSrcAlias, resetStubs, stubModule, unloadModule } from './helpers/api-harness'

registerSrcAlias()

/**
 * buildTodayView, with Prisma replaced by a fake. Nothing here opens a
 * database connection — in this repo every configured database URL is
 * production, so the unit suite must never reach one.
 *
 * The behaviour under test is the undo fix: a resolved overdue occurrence used
 * to be filtered out of the response, which made its Undo button unreachable.
 * It is now returned, with completedAt so the client can decide whether it is
 * still today's business.
 */

const CHORE = {
  id: 'chore-1',
  householdId: 'household-1',
  title: 'Wash the dishes',
  notes: null,
  icon: null as string | null,
  recurrenceType: 'WEEKLY' as const,
  daysOfWeek: [6], // Saturday, ISO weekday 6
  intervalDays: null,
  anchorDate: null,
  dayOfMonth: null,
  active: true,
  assignee: null,
}

type Completion = {
  choreId: string
  dueDate: Date
  status: 'DONE' | 'SKIPPED'
  completedAt: Date
  completedBy: { id: string; name: string | null } | null
}

function loadChores(completions: Completion[], chore: Record<string, unknown> = CHORE) {
  resetStubs()
  unloadModule('@/lib/chores')
  stubModule('@/lib/prisma', {
    prisma: {
      chore: { findMany: async () => [chore] },
      choreCompletion: { findMany: async () => completions },
    },
  })
  // Required after stubbing, so chores.ts binds to the fake.
  return require('@/lib/chores') as typeof import('../src/lib/chores')
}

// 2026-08-01 is a Saturday. 2026-08-04 is the Tuesday after it.
const DUE = '2026-08-01'
const TODAY = '2026-08-04'

test('a pending overdue occurrence is returned', async () => {
  const { buildTodayView } = loadChores([])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items.length, 1)
  assert.equal(items[0].dueDate, DUE)
  assert.equal(items[0].overdue, true)
  assert.equal(items[0].status, 'PENDING')
  assert.equal(items[0].completedAt, null)
})

test('a resolved overdue occurrence is still returned, so undo stays reachable', async () => {
  const { buildTodayView } = loadChores([
    {
      choreId: 'chore-1',
      dueDate: new Date(`${DUE}T00:00:00.000Z`),
      status: 'DONE',
      completedAt: new Date('2026-08-04T09:00:00.000Z'),
      completedBy: { id: 'user-1', name: 'Ryan' },
    },
  ])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items.length, 1, 'the row must not be filtered out any more')
  assert.equal(items[0].status, 'DONE')
  assert.equal(items[0].completedAt, '2026-08-04T09:00:00.000Z')
  assert.deepEqual(items[0].completedBy, { id: 'user-1', name: 'Ryan' })
})

test('a skipped overdue occurrence is returned too', async () => {
  const { buildTodayView } = loadChores([
    {
      choreId: 'chore-1',
      dueDate: new Date(`${DUE}T00:00:00.000Z`),
      status: 'SKIPPED',
      completedAt: new Date('2026-08-04T09:00:00.000Z'),
      completedBy: null,
    },
  ])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items.length, 1)
  assert.equal(items[0].status, 'SKIPPED')
})

test('the serialised chore carries its icon id', async () => {
  const { buildTodayView } = loadChores([], { ...CHORE, icon: 'dishes' })
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items[0].chore.icon, 'dishes')
})

test('a chore with no icon serialises null, meaning infer', async () => {
  const { buildTodayView } = loadChores([])
  const items = await buildTodayView('household-1', TODAY)
  assert.equal(items[0].chore.icon, null)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test 2>&1 | grep -A10 chores-today-view`

Expected: FAIL — the resolved-overdue test reports `items.length` of `0`, because the filter is still there. That failure *is* the bug, reproduced.

- [ ] **Step 3: Add the column to the schema**

In `prisma/schema.prisma`, inside `model Chore`, add `icon` after `notes`:

```prisma
  title          String
  notes          String?
  /// Semantic icon id from src/lib/chore-icons.ts ("hoover", "dishes"), never a
  /// lucide component name. NULL means infer from the title.
  icon           String?
  recurrenceType ChoreRecurrenceType
```

- [ ] **Step 4: Write the migration**

Create `prisma/migrations/20260804090000_chore_icon/migration.sql`:

```sql
-- Chores can carry an icon. The stored value is a semantic id from
-- src/lib/chore-icons.ts ("hoover", "dishes") and never a lucide component
-- name, so the icon a household picked survives an icon-library change.
--
-- NULL means "infer from the title", which is what every existing chore does —
-- hence no backfill. Additive and reversible by dropping the column.
ALTER TABLE "Chore" ADD COLUMN "icon" TEXT;
```

- [ ] **Step 5: Regenerate the Prisma client and check the manifest**

Run: `npm run prisma:generate && node scripts/check-migration-manifest.mjs`

Expected: client generated; manifest check exits 0.

- [ ] **Step 6: Serialize the icon and stop discarding resolved overdue rows**

In `src/lib/chores.ts`:

Add to the imports at the top:

```ts
import { CHORE_ICON_MAX } from './chore-icons'
import type { ChoreStatus, TodayChoreItem } from './chore-view'
```

Re-export so existing importers of `TodayChoreItem` keep working, next to `CHORE_TITLE_MAX`:

```ts
export const CHORE_TITLE_MAX = 200
export const CHORE_NOTES_MAX = 2000
export { CHORE_ICON_MAX }
export type { TodayChoreItem }
```

Add `icon` to `ChoreRow`:

```ts
export interface ChoreRow {
  id: string
  title: string
  notes: string | null
  icon: string | null
  recurrenceType: 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'
```

Add it to `serializeChore`'s return, after `notes`:

```ts
    notes: chore.notes,
    icon: chore.icon,
    active: chore.active,
```

**Delete** the local `TodayChoreItem` interface (it is now imported from `chore-view.ts`).

In `buildTodayView`, replace the final `return items.map(...).filter(...)` block with:

```ts
  return items.map(item => {
    const completion = byKey.get(completionKey(item.chore.id, item.dueDate))
    return {
      chore: serializeChore(item.chore),
      dueDate: item.dueDate,
      overdue: item.overdue,
      status: (completion?.status ?? 'PENDING') as ChoreStatus,
      completedBy: completion?.completedBy ?? null,
      completedAt: completion?.completedAt ? completion.completedAt.toISOString() : null,
    }
  })
  // Resolved overdue occurrences are deliberately NOT filtered out here any
  // more. Dropping them made their Undo button unreachable: the row vanished
  // from Today on the next refetch and the Log tab had no undo control. The
  // client keeps them for the day they were resolved — see groupTodayChores in
  // chore-view.ts, which knows the viewer's timezone and this function does not.
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test 2>&1 | grep -A20 chores-today-view`

Expected: PASS, all five tests.

- [ ] **Step 8: Accept and validate `icon` on POST**

In `src/pages/api/chores/index.ts`, add the import:

```ts
import { isChoreIconId } from '@/lib/chore-icons'
```

After the `notes` line in the POST branch, add:

```ts
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, CHORE_NOTES_MAX) : ''
    // null or absent means "infer from the title". Anything else must be a known
    // id: the registry is the allowlist that stops a stored string becoming an
    // arbitrary rendered component.
    let icon: string | null = null
    if (body.icon !== undefined && body.icon !== null && body.icon !== '') {
      if (!isChoreIconId(body.icon)) return res.status(400).json({ error: 'Unknown icon' })
      icon = body.icon
    }
```

Add `icon,` to the `prisma.chore.create` data, after `notes`:

```ts
        notes: notes || null,
        icon,
        assigneeId,
```

- [ ] **Step 9: Accept and validate `icon` on PATCH**

In `src/pages/api/chores/[id].ts`, add the same import:

```ts
import { isChoreIconId } from '@/lib/chore-icons'
```

After the `body.notes` block in the PATCH branch, add:

```ts
    if (body.icon !== undefined) {
      if (body.icon === null || body.icon === '') {
        data.icon = null // back to inferring from the title
      } else if (isChoreIconId(body.icon)) {
        data.icon = body.icon
      } else {
        return res.status(400).json({ error: 'Unknown icon' })
      }
    }
```

- [ ] **Step 10: Assert the migration is additive**

In `tests/migration-safety.test.ts`, add a `readFileSync` next to the existing ones:

```ts
const choreIconMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260804090000_chore_icon/migration.sql'),
  'utf8',
)
```

and a test at the end of the file:

```ts
test('the chore icon migration only adds a nullable column', () => {
  assert.match(choreIconMigration, /ALTER TABLE "Chore" ADD COLUMN "icon" TEXT;/)
  // Additive only: no data loss, and safe to deploy before the code that uses it.
  assert.doesNotMatch(choreIconMigration, /DROP|DELETE|TRUNCATE|NOT NULL/i)
})
```

- [ ] **Step 11: Run the full unit suite and typecheck**

Run: `npm test 2>&1 | tail -20 && npm run typecheck`

Expected: all tests pass; typecheck clean. Typecheck is what catches every remaining `TodayChoreItem` shape mismatch across `chores.tsx`, `dashboard.tsx` and `ChoreTodayList.tsx` — expect errors there and leave them for Tasks 5 and 6 only if the command still exits 0 for `src/lib` and `src/pages/api`. If it fails on those UI files, note the errors and continue; Tasks 5–8 resolve them.

- [ ] **Step 12: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260804090000_chore_icon src/lib/chores.ts \
  src/pages/api/chores/index.ts src/pages/api/chores/\[id\].ts \
  tests/chores-today-view.test.ts tests/migration-safety.test.ts
git commit -m "fix(chores): keep resolved overdue occurrences so undo stays reachable

Also adds the nullable Chore.icon column and validates it against the icon
registry on create and update."
```

---

### Task 5: ChoreIcon, ChoreRow and the upgraded chore row list

**Files:**
- Create: `src/components/chores/ChoreIcon.tsx`
- Create: `src/components/chores/ChoreRow.tsx`
- Modify: `src/components/chores/ChoreTodayList.tsx` (whole file)

**Interfaces:**
- Consumes: `choreBoxClasses`, `TodayChoreItem`, `todayItemKey`, `isResolved` from Task 3; `choreIconComponent`, `resolveChoreIconId` from Task 2.
- Produces:
  - `<ChoreIcon title icon status overdue />`
  - `<ChoreRow item busy compact onResolve onUndo />` — **one row, no container**. Task 6's grouped list renders these directly inside its own per-group card, which is why the row must not carry its own border.
  - `ChoreTodayList` becomes a thin container that maps `ChoreRow`. Its props change: `busyKey: string | null` becomes `busyKeys: ReadonlySet<string>`, and `compact` now renders a visible Undo. Tasks 6 and 8 update the two call sites.
  - `todayItemKey` is re-exported from `chore-view.ts`, not defined here. Update importers.

**Why the row is a separate component:** the group list and the flat list need the
same row inside different containers. Rendering `<ChoreTodayList items={[item]}/>`
per row instead would give every row its own `rounded-xl border`, so a group of
three would read as three stacked cards rather than one card with dividers.

- [ ] **Step 1: Create the ChoreIcon component**

Create `src/components/chores/ChoreIcon.tsx`:

```tsx
import { Check, SkipForward } from 'lucide-react'
import { choreIconComponent, resolveChoreIconId } from '@/lib/chore-icons'
import { choreBoxClasses, type ChoreStatus } from '@/lib/chore-view'
import { cn } from '@/lib/utils'

interface ChoreIconProps {
  title: string
  icon: string | null
  status: ChoreStatus
  overdue: boolean
  className?: string
}

/**
 * The 36px box on a chore row: an icon for what the chore *is*, swapping to a
 * check or skip mark when it is resolved.
 *
 * This is the only component that depends on both the icon registry and the
 * motion vocabulary. Everything about the box's colour, including the
 * reduced-motion-safe amber overdue ring, comes from choreBoxClasses.
 *
 * Decorative: the row's title carries the meaning, and the surrounding button
 * carries the label, so everything here is aria-hidden.
 */
export function ChoreIcon({ title, icon, status, overdue, className }: ChoreIconProps) {
  const Identity = choreIconComponent(resolveChoreIconId({ title, icon }))
  return (
    <span className={cn(choreBoxClasses(status, overdue), className)} aria-hidden="true">
      {status === 'DONE' ? (
        <Check className="h-4 w-4 animate-check-in" strokeWidth={3} />
      ) : status === 'SKIPPED' ? (
        <SkipForward className="h-4 w-4 animate-check-in" />
      ) : (
        <Identity className="h-[17px] w-[17px]" />
      )}
    </span>
  )
}

export default ChoreIcon
```

- [ ] **Step 2: Create the row**

Create `src/components/chores/ChoreRow.tsx`:

```tsx
import { RotateCcw, SkipForward } from 'lucide-react'
import { ChoreIcon } from '@/components/chores/ChoreIcon'
import { Button } from '@/components/ui/Button'
import { isResolved, type TodayChoreItem } from '@/lib/chore-view'
import { APP_LOCALE, cn } from '@/lib/utils'

interface ChoreRowProps {
  item: TodayChoreItem
  /** A request is in flight for this occurrence. Guards double taps. */
  busy: boolean
  compact?: boolean
  onResolve: (item: TodayChoreItem, status: 'DONE' | 'SKIPPED') => void
  onUndo: (item: TodayChoreItem) => void
}

function overdueLabel(dueDate: string) {
  const date = new Date(`${dueDate}T12:00:00Z`)
  // APP_LOCALE, not undefined: src/lib/utils.ts documents that Clankeep ships to
  // Malta and that a new formatter must not fall back to US conventions. The
  // previous version of this function passed undefined.
  return `was due ${date.toLocaleDateString(APP_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })}`
}

/**
 * One chore occurrence. Deliberately carries **no border or rounding** — the
 * flat list and the grouped list each supply their own container, so a group of
 * rows reads as one card with dividers rather than a stack of separate cards.
 */
export default function ChoreRow({ item, busy, compact = false, onResolve, onUndo }: ChoreRowProps) {
  const resolved = isResolved(item)
  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-card px-3 py-2.5 sm:px-4',
        compact && 'py-2',
        // A faint flash that settles back, so a completion registers even when
        // the row does not move between groups.
        resolved && 'animate-row-settle',
      )}
    >
      <button
        type="button"
        aria-busy={busy}
        onClick={() => (resolved ? onUndo(item) : onResolve(item, 'DONE'))}
        aria-label={resolved ? `Mark ${item.chore.title} not done` : `Mark ${item.chore.title} done`}
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChoreIcon
          title={item.chore.title}
          icon={item.chore.icon}
          status={item.status}
          overdue={item.overdue}
        />
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', resolved && 'text-muted-foreground')}>
          <span className="relative inline-block max-w-full truncate align-bottom">
            {item.chore.title}
            {/* Drawn left to right on completion; `both` fill holds the end
                state, which is also where the reduced-motion clamp lands. */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-0 top-1/2 h-[1.5px] w-full origin-left bg-current',
                resolved ? 'animate-strike' : 'scale-x-0',
              )}
            />
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.overdue && !resolved ? (
            <span className="font-semibold text-brand-amber">{overdueLabel(item.dueDate)}</span>
          ) : (
            item.chore.schedule
          )}
          {item.chore.assignee && <> · {item.chore.assignee.name || 'Assigned'}</>}
          {item.status === 'DONE' && item.completedBy && <> · done by {item.completedBy.name || 'someone'}</>}
          {item.status === 'SKIPPED' && <> · skipped</>}
        </p>
      </div>

      {!resolved && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-busy={busy}
          onClick={() => onResolve(item, 'SKIPPED')}
          className="shrink-0 text-muted-foreground"
        >
          <SkipForward className="h-4 w-4" />
          {!compact && 'Skip'}
        </Button>
      )}
      {resolved && (
        /* Visible in compact mode too. It used to be hidden there, which left the
           dashboard with a working undo and no affordance for it. */
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-busy={busy}
          onClick={() => onUndo(item)}
          className="shrink-0 text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          {!compact && 'Undo'}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Reduce the row list to a container**

Replace the whole of `src/components/chores/ChoreTodayList.tsx`:

```tsx
import { ListChecks } from 'lucide-react'
import ChoreRow from '@/components/chores/ChoreRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { todayItemKey, type TodayChoreItem } from '@/lib/chore-view'
import { cn } from '@/lib/utils'

export { todayItemKey }
export type { TodayChoreItem }

interface ChoreTodayListProps {
  items: TodayChoreItem[]
  /** Occurrences with a request in flight. Guards double taps without disabling. */
  busyKeys: ReadonlySet<string>
  compact?: boolean
  onResolve: (item: TodayChoreItem, status: 'DONE' | 'SKIPPED') => void
  onUndo: (item: TodayChoreItem) => void
  emptyAction?: React.ReactNode
}

/**
 * A flat list of chore occurrences in one card. Still used by the dashboard's
 * compact widget; the chores page uses ChoreGroupedList instead.
 */
export default function ChoreTodayList({
  items,
  busyKeys,
  compact = false,
  onResolve,
  onUndo,
  emptyAction,
}: ChoreTodayListProps) {
  if (!items.length) {
    if (compact) return null
    return (
      <EmptyState
        icon={ListChecks}
        module="chores"
        title="Nothing due today"
        description="Chores appear here on the days they are scheduled. Enjoy the quiet."
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn('divide-y overflow-hidden rounded-xl border', compact && 'rounded-lg')}>
      {items.map(item => (
        <ChoreRow
          key={todayItemKey(item)}
          item={item}
          busy={busyKeys.has(todayItemKey(item))}
          compact={compact}
          onResolve={onResolve}
          onUndo={onUndo}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verify the new components compile in isolation**

Run: `npm run typecheck 2>&1 | grep -E "ChoreTodayList|ChoreIcon|ChoreRow"`

Expected: no output for these three files. Errors in `chores.tsx` and `dashboard.tsx` about `busyKey`/`busyKeys` are expected and are fixed in Tasks 6 and 8.

- [ ] **Step 5: Commit**

```bash
git add src/components/chores/ChoreIcon.tsx src/components/chores/ChoreRow.tsx src/components/chores/ChoreTodayList.tsx
git commit -m "feat(chores): give rows identity icons, completion motion and a visible undo"
```

---

### Task 6: Grouped list and the chores page, with optimistic completion

**Files:**
- Create: `src/components/chores/ChoreGroupedList.tsx`
- Modify: `src/pages/chores.tsx` — `resolveItem`, `undoItem`, busy state, the `today` tab body

**Interfaces:**
- Consumes: `groupTodayChores`, `choreProgress`, `localDateOnly`, `todayItemKey` from Task 3; `ROW_TRANSITION` from Task 1; **`ChoreRow`** from Task 5 (not `ChoreTodayList` — the group supplies its own card container).
- Produces: `<ChoreGroupedList items busyKeys localDate onResolve onUndo emptyAction />`

- [ ] **Step 1: Create the grouped list**

Create `src/components/chores/ChoreGroupedList.tsx`:

```tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ListChecks } from 'lucide-react'
import ChoreRow from '@/components/chores/ChoreRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROW_TRANSITION } from '@/lib/motion'
import { choreProgress, groupTodayChores, todayItemKey, type TodayChoreItem } from '@/lib/chore-view'
import { cn } from '@/lib/utils'

interface ChoreGroupedListProps {
  items: TodayChoreItem[]
  busyKeys: ReadonlySet<string>
  /** The viewer's own YYYY-MM-DD; decides which resolved overdue rows still show. */
  localDate: string
  onResolve: (item: TodayChoreItem, status: 'DONE' | 'SKIPPED') => void
  onUndo: (item: TodayChoreItem) => void
  emptyAction?: React.ReactNode
}

/** Collapse Done once it would push the rest of the day off screen. */
const DONE_COLLAPSE_THRESHOLD = 3

/**
 * Today's chores as Overdue, Today and Done.
 *
 * AnimatePresence is used here and nowhere else in the app: a row resolving
 * moves between groups, and without it the rows left behind jump rather than
 * close the gap. Everything else animates in CSS.
 */
export default function ChoreGroupedList({
  items,
  busyKeys,
  localDate,
  onResolve,
  onUndo,
  emptyAction,
}: ChoreGroupedListProps) {
  const groups = groupTodayChores(items, localDate)
  const progress = choreProgress(groups)
  const [doneOpen, setDoneOpen] = useState(false)

  if (progress.total === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        module="chores"
        title="Nothing due today"
        description="Chores appear here on the days they are scheduled. Enjoy the quiet."
        action={emptyAction}
      />
    )
  }

  const showDone = groups.done.length > 0
  const collapsible = groups.done.length > DONE_COLLAPSE_THRESHOLD
  const doneVisible = !collapsible || doneOpen

  const section = (
    heading: string,
    rows: TodayChoreItem[],
    tone: string,
  ) => (
    <section aria-labelledby={`chore-group-${heading.toLowerCase()}`}>
      <h2
        id={`chore-group-${heading.toLowerCase()}`}
        className={cn('mb-1.5 px-1 text-xs font-bold uppercase tracking-wide', tone)}
      >
        {heading} <span className="font-semibold opacity-60">{rows.length}</span>
      </h2>
      {/* One card per group, with dividers between rows. `divide-y` applies to
          the motion.div children, which are the direct children here. */}
      <div className="divide-y overflow-hidden rounded-xl border">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map(item => (
            <motion.div
              key={todayItemKey(item)}
              layout
              initial={ROW_TRANSITION.initial}
              animate={ROW_TRANSITION.animate}
              exit={ROW_TRANSITION.exit}
            >
              <ChoreRow
                item={item}
                busy={busyKeys.has(todayItemKey(item))}
                onResolve={onResolve}
                onUndo={onUndo}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5">
        <p className="text-sm font-medium">
          {progress.done} of {progress.total} done
        </p>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" role="presentation">
          <div
            className="h-full rounded-full bg-module-chores transition-[width] duration-200"
            style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
          />
        </div>
      </div>

      {groups.overdue.length > 0 && section('Overdue', groups.overdue, 'text-brand-amber')}
      {groups.today.length > 0 && section('Today', groups.today, 'text-muted-foreground')}

      {showDone && (
        <div>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setDoneOpen(open => !open)}
              aria-expanded={doneOpen}
              className="mb-1.5 flex items-center gap-1 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              Done <span className="font-semibold opacity-60">{groups.done.length}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', doneOpen && 'rotate-180')} />
            </button>
          ) : null}
          {doneVisible && (collapsible
            ? section('Done', groups.done, 'sr-only')
            : section('Done', groups.done, 'text-muted-foreground'))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Make completion optimistic in the chores page**

In `src/pages/chores.tsx`:

Replace the `localDateOnly` local helper and the `ChoreTodayList` import with:

```ts
import ChoreGroupedList from '@/components/chores/ChoreGroupedList'
import ChoreTodayList from '@/components/chores/ChoreTodayList'
import { localDateOnly, todayItemKey, type TodayChoreItem } from '@/lib/chore-view'
```

Delete the local `function localDateOnly()` definition (it now comes from `chore-view.ts`) and drop `todayItemKey, type TodayChoreItem` from the `ChoreTodayList` import.

Replace the `busyKey` state with a busy set plus an optimistic overlay:

```ts
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  /**
   * Statuses applied on click, before the server answers.
   *
   * The overlay is applied at render and cleared per key when that key's own
   * request settles, which is what stops a slow refetch from clobbering a newer
   * tap: loadToday() replaces todayItems, but an in-flight key keeps its
   * optimistic status until its own request finishes.
   */
  const [optimistic, setOptimistic] = useState<Record<string, 'DONE' | 'SKIPPED'>>({})
```

Add helpers just below:

```ts
  const setBusy = useCallback((key: string, busy: boolean) => {
    setBusyKeys(current => {
      const next = new Set(current)
      if (busy) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const clearOptimistic = useCallback((key: string) => {
    setOptimistic(current => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])
```

Replace `resolveItem` and `undoItem` with:

```ts
  const resolveItem = useCallback(async (item: TodayChoreItem, resolveStatus: 'DONE' | 'SKIPPED') => {
    const key = todayItemKey(item)
    if (busyKeys.has(key)) return
    setBusy(key, true)
    // Apply first: the 200ms completion animation should not sit behind a
    // network round trip, or it reads as latency instead of feedback.
    setOptimistic(current => ({ ...current, [key]: resolveStatus }))
    try {
      const response = await fetch('/api/chores/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate, status: resolveStatus }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not update this chore'))
      setLogLoaded(false)
      setStatsRefreshKey(current => current + 1)
      await loadToday()
      if (resolveStatus === 'DONE') toast.success(`${item.chore.title} done`)
    } catch (error) {
      // Clearing the overlay reverts to server truth, which plays the mirrored
      // animation back to pending.
      toast.error(error instanceof Error ? error.message : 'Could not update this chore')
    } finally {
      clearOptimistic(key)
      setBusy(key, false)
    }
  }, [busyKeys, clearOptimistic, loadToday, setBusy])

  const undoItem = useCallback(async (item: TodayChoreItem) => {
    const key = todayItemKey(item)
    if (busyKeys.has(key)) return
    setBusy(key, true)
    try {
      const response = await fetch('/api/chores/complete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId: item.chore.id, dueDate: item.dueDate }),
      })
      if (!response.ok) throw new Error('Could not undo')
      setLogLoaded(false)
      setStatsRefreshKey(current => current + 1)
      await Promise.all([loadToday(), logLoaded ? loadLog() : Promise.resolve()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not undo')
    } finally {
      clearOptimistic(key)
      setBusy(key, false)
    }
  }, [busyKeys, clearOptimistic, loadLog, loadToday, logLoaded, setBusy])
```

- [ ] **Step 3: Render the overlay and the grouped list**

Replace the `pendingToday` line with an overlay-aware derivation:

```ts
  const visibleItems = useMemo(
    () => todayItems.map(item => {
      const status = optimistic[todayItemKey(item)]
      return status ? { ...item, status } : item
    }),
    [todayItems, optimistic],
  )
  const pendingToday = visibleItems.filter(item => item.status === 'PENDING').length
```

Add `useMemo` to the React import on line 1.

In the `today` tab body, swap `ChoreTodayList` for `ChoreGroupedList`:

```tsx
            <ChoreGroupedList
              items={visibleItems}
              busyKeys={busyKeys}
              localDate={localDateOnly()}
              onResolve={(item, resolveStatus) => void resolveItem(item, resolveStatus)}
              onUndo={item => void undoItem(item)}
              emptyAction={chores.length === 0 ? (
                <Button type="button" onClick={openCreate} className="min-h-11"><Plus />Create your first chore</Button>
              ) : undefined}
            />
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`

Expected: both clean for `src/pages/chores.tsx` and `src/components/chores/*`. `dashboard.tsx` still fails on `busyKey`; Task 8 fixes it.

- [ ] **Step 5: Build, to prove `motion/react` bundles on this route**

Run: `npm run build 2>&1 | tail -25`

Expected: success. `AnimatePresence` with `mode="popLayout"` is the riskiest new import; a failure here is a version mismatch, not a logic bug.

- [ ] **Step 6: Commit**

```bash
git add src/components/chores/ChoreGroupedList.tsx src/pages/chores.tsx
git commit -m "feat(chores): group today into overdue/today/done with optimistic completion"
```

---

### Task 7: The icon picker in the chore form

**Files:**
- Create: `src/components/chores/ChoreIconPicker.tsx`
- Modify: `src/components/chores/ChoreFormDialog.tsx` — `ChoreDto`, the reset effect, `submit`, and the field after the title

**Interfaces:**
- Consumes: `CHORE_ICON_GROUPS`, `choreIconComponent`, `inferChoreIconId` from Task 2.
- Produces: `<ChoreIconPicker title value onChange />`, where `value: string | null` and `null` means Auto.

- [ ] **Step 1: Create the picker**

Create `src/components/chores/ChoreIconPicker.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { CHORE_ICON_GROUPS, choreIconComponent, inferChoreIconId, type ChoreIconId } from '@/lib/chore-icons'
import { cn } from '@/lib/utils'

interface ChoreIconPickerProps {
  /** The current title, so Auto can preview what inference would choose. */
  title: string
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * Icon override for a chore. `null` is Auto, which keeps inferring from the
 * title — so renaming a chore keeps updating its icon until someone overrules
 * it here.
 *
 * Offers the ~60 curated ids from the registry, not lucide's ~4,500 exports.
 */
export default function ChoreIconPicker({ title, value, onChange }: ChoreIconPickerProps) {
  const [query, setQuery] = useState('')
  const inferred = useMemo(() => inferChoreIconId(title), [title])
  const AutoIcon = choreIconComponent(inferred)

  const needle = query.trim().toLowerCase()
  const groups = CHORE_ICON_GROUPS
    .map(group => ({
      name: group.name,
      ids: needle
        ? group.ids.filter(id => id.includes(needle) || group.name.toLowerCase().includes(needle))
        : group.ids,
    }))
    .filter(group => group.ids.length > 0)

  const cell = (id: ChoreIconId | null, Icon: typeof AutoIcon, label: string) => {
    const selected = value === id
    return (
      <button
        key={id ?? 'auto'}
        type="button"
        onClick={() => onChange(id)}
        aria-pressed={selected}
        aria-label={label}
        title={label}
        className={cn(
          'grid h-10 w-10 place-items-center rounded-lg border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected
            ? 'border-module-chores bg-module-chores/10 text-module-chores'
            : 'border-input text-muted-foreground hover:border-module-chores/50 hover:text-foreground',
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div>
      <span className="text-sm font-medium">Icon</span>
      <div className="mt-1 flex items-center gap-2">
        {cell(null, AutoIcon, `Auto — currently ${inferred}`)}
        <div className="min-w-0 flex-1">
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search icons…"
            aria-label="Search icons"
            className="h-10"
          />
        </div>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {value === null ? 'Chosen from the name as you type' : 'Pick the first tile to go back to automatic'}
      </p>

      <div className="mt-2 max-h-48 space-y-3 overflow-y-auto rounded-lg border p-2">
        {groups.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No icons match that.</p>}
        {groups.map(group => (
          <div key={group.name}>
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {group.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.ids.map(id => cell(id, choreIconComponent(id), id.replace(/-/g, ' ')))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into the form**

In `src/components/chores/ChoreFormDialog.tsx`:

Add the import:

```ts
import ChoreIconPicker from '@/components/chores/ChoreIconPicker'
```

Add `icon` to `ChoreDto`, after `notes`:

```ts
  notes: string | null
  icon: string | null
```

Add the state beside `notes`:

```ts
  const [icon, setIcon] = useState<string | null>(null)
```

Add to the reset effect, after `setNotes(...)`:

```ts
    setIcon(chore?.icon ?? null)
```

Add to the request body in `submit`, after `notes`:

```ts
          notes: notes.trim(),
          icon,
```

Insert the picker after the title field's closing `</div>` (currently line 136) and before the `Repeats` block:

```tsx
          <ChoreIconPicker title={title} value={icon} onChange={setIcon} />
```

- [ ] **Step 3: Verify round-tripping by hand**

Run: `npm run dev` and open `http://localhost:3000/chores`.

Check, in order:
1. Create a chore called `Hoover the stairs` without touching the picker. The Auto tile previews the hoover icon as you type, and the row shows it.
2. Edit it, choose the `bin` tile, save. The row shows the bin icon.
3. Edit again, click the Auto tile, save. The row returns to the hoover icon.
4. Rename it to `Wash the dishes` while on Auto. The icon becomes the dishes icon.

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`

Expected: clean apart from `dashboard.tsx`, which Task 8 fixes.

- [ ] **Step 5: Commit**

```bash
git add src/components/chores/ChoreIconPicker.tsx src/components/chores/ChoreFormDialog.tsx
git commit -m "feat(chores): add the icon picker with an automatic option"
```

---

### Task 8: Undo in the log tab and on the dashboard

Closes the last two holes: the Log had no undo at all, and the dashboard's undo had no affordance.

**Files:**
- Modify: `src/pages/chores.tsx` — the `LogEntry` type and the log tab rows
- Modify: `src/pages/dashboard.tsx:251-263` (`undoChore`) and the `ChoreTodayList` call around line 515

**Interfaces:**
- Consumes: `ChoreTodayList`'s `busyKeys` prop from Task 5.
- Produces: nothing new.

- [ ] **Step 1: Add undo to the log rows**

In `src/pages/chores.tsx`, add a handler above the return:

```ts
  /**
   * Undo straight from the history list, for the "I ticked that last Tuesday by
   * mistake" case. DELETE /api/chores/complete takes any choreId + dueDate with
   * no restriction to today, so this needs no API change.
   */
  const undoLogEntry = useCallback(async (entry: LogEntry) => {
    const key = `${entry.choreId}:${entry.dueDate}`
    if (busyKeys.has(key)) return
    setBusy(key, true)
    try {
      const response = await fetch('/api/chores/complete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId: entry.choreId, dueDate: entry.dueDate }),
      })
      if (!response.ok) throw new Error('Could not undo')
      // All three dependent views: the log itself, today (the occurrence may
      // reappear as pending overdue), and the fairness panel.
      setStatsRefreshKey(current => current + 1)
      await Promise.all([loadLog(), loadToday()])
      toast.success(`${entry.title} moved back to pending`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not undo')
    } finally {
      setBusy(key, false)
    }
  }, [busyKeys, loadLog, loadToday, setBusy])
```

Add the button inside the log row, after the closing `</div>` of the text block and before the row's closing `</div>`:

```tsx
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-busy={busyKeys.has(`${entry.choreId}:${entry.dueDate}`)}
                  onClick={() => void undoLogEntry(entry)}
                  className="shrink-0 text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                  Undo
                </Button>
```

Add `RotateCcw` to the `lucide-react` import on line 5.

- [ ] **Step 2: Update the dashboard call site**

In `src/pages/dashboard.tsx`, replace the `choreBusyKey` state declaration with a set. Find it with:

Run: `grep -n "choreBusyKey" src/pages/dashboard.tsx`

Then replace the declaration with:

```ts
  const [choreBusyKeys, setChoreBusyKeys] = useState<Set<string>>(new Set())

  const setChoreBusy = useCallback((key: string, busy: boolean) => {
    setChoreBusyKeys(current => {
      const next = new Set(current)
      if (busy) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])
```

In `resolveChore` and `undoChore`, replace `setChoreBusyKey(todayItemKey(item))` with `setChoreBusy(todayItemKey(item), true)` and `setChoreBusyKey(null)` with `setChoreBusy(todayItemKey(item), false)`. Add `setChoreBusy` to each `useCallback` dependency array.

Update the render call:

```tsx
            <ChoreTodayList
              items={todayChores}
              busyKeys={choreBusyKeys}
              compact
              onResolve={(item, resolveStatus) => void resolveChore(item, resolveStatus)}
              onUndo={(item) => void undoChore(item)}
            />
```

- [ ] **Step 3: Typecheck, lint and test**

Run: `npm run typecheck && npm run lint && npm test 2>&1 | tail -12`

Expected: all clean. This is the first point at which the whole repo typechecks again.

- [ ] **Step 4: Verify the original bug is gone, by hand**

Run: `npm run dev`, then:
1. Create a chore that recurs weekly on **yesterday's** weekday, so it appears as overdue.
2. On `/chores`, confirm it sits under **Overdue** with a slowly pulsing amber ring.
3. Tick it. It should animate into **Done** — not vanish — with an Undo button beside it.
4. Click Undo. It should return to Overdue.
5. Open the **Log** tab. The entry should have an Undo button; use it and confirm the chore reappears as pending on Today.
6. On `/dashboard`, tick a chore in the compact widget and confirm a visible Undo appears.
7. In your OS accessibility settings, turn on reduced motion, reload, and confirm the overdue ring is still amber — static, not gone.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chores.tsx src/pages/dashboard.tsx
git commit -m "feat(chores): allow undo from the log and show it on the dashboard widget"
```

---

### Task 9: Shared primitives

The part specs B–G inherit. Small, deliberately.

**Files:**
- Modify: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/ui/EmptyState.tsx:19-26`
- Modify: `src/components/ui/Button.tsx:7`

**Interfaces:**
- Consumes: the Tailwind utilities from Task 1.
- Produces: no API changes — every existing call site keeps working.

- [ ] **Step 1: Crossfade the skeleton**

Replace `src/components/ui/Skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils"

/**
 * Loading placeholder. The fade-in stops a skeleton from appearing as a hard
 * flash on a fast connection, and pairs with content that fades in behind it.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-fade-in animate-pulse rounded-md bg-muted", className)} {...props} />
}

export { Skeleton }
```

- [ ] **Step 2: Give the empty state an entrance**

In `src/components/ui/EmptyState.tsx`, add `animate-fade-in` to the wrapper and `animate-scale-in` to the icon tile:

```tsx
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center',
        className,
      )}
    >
      <span className={cn('grid h-14 w-14 animate-scale-in place-items-center rounded-2xl', tileClass)}>
```

- [ ] **Step 3: Add press feedback to buttons**

In `src/components/ui/Button.tsx`, in the `cva` base string, replace `transition-colors` with:

```
transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98]
```

- [ ] **Step 4: Verify nothing regressed**

Run: `npm run build && npm test 2>&1 | tail -8 && npm run lint`

Expected: all clean. `Button` is used on every page, so the build is the real check here.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Skeleton.tsx src/components/ui/EmptyState.tsx src/components/ui/Button.tsx
git commit -m "feat(ui): add the shared motion layer to skeleton, empty state and button"
```

---

### Task 10: Full verification and spec reconciliation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-04-clankeep-motion-icon-foundation-design.md` (status line and the two corrections)

**Interfaces:**
- Consumes: everything.
- Produces: a verified, shippable change.

- [ ] **Step 1: Run every gate**

Run each and record the actual output — do not summarise from memory:

```bash
npm test
npm run lint
npm run typecheck
npm run build
node scripts/check-migration-manifest.mjs
```

Expected: all five exit 0. If any fail, fix before continuing; do not report completion with a failing gate.

- [ ] **Step 2: Confirm the unit suite still needs no database**

Run: `npm test 2>&1 | grep -iE "database|DATABASE_URL|ECONNREFUSED|prisma:" || echo "no database contact"`

Expected: `no database contact`. This is the constraint commits `077322b` and `4a6f157` were fixing; the two new test files must not undo it.

- [ ] **Step 3: Reconcile the spec with what was actually built**

In the spec, change `Status: approved, not yet implemented` to `Status: implemented 2026-08-04`, and correct the two places where implementation found the spec wrong:

- In "Unit 1 — Motion vocabulary", replace the `src/hooks/useReducedMotion.ts` bullet with a note that `usePrefersReducedMotion()` already existed in `src/hooks/useMediaQuery.ts` and was reused.
- In "Shared primitives that gain the CSS layer", note that `tabs.tsx` needed no change because `TabsTrigger` already carries `transition-all`.

- [ ] **Step 4: Verify the migration applies cleanly against a real database**

This is the only step that needs the live stack. Take a backup first, as the README requires:

```bash
./scripts/backup-houseflow-db.sh
docker compose --env-file .env.deploy run --rm migrate
```

Expected: `1 migration applied` for `20260804090000_chore_icon`, then `No pending migrations to apply.` on a second run.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-04-clankeep-motion-icon-foundation-design.md
git commit -m "docs: mark the motion and icon foundation spec implemented"
```

---

## Self-review record

**Spec coverage.** Every spec section maps to a task: motion vocabulary and keyframes → 1; icon registry, ids, inference, substitutes, validation, groups → 2; grouping, the day rule, reduced-motion class guarantee → 3; schema, migration, serialization, `buildTodayView`, API validation → 4; `ChoreIcon`, rows, completion motion, compact undo → 5; grouped list, progress summary, optimistic completion and its race → 6; picker and form → 7; log undo and dashboard undo → 8; shared primitives → 9; verification and spec reconciliation → 10.

**Two spec corrections found while planning**, both recorded in Global Constraints and reconciled in Task 10 Step 3:
1. The spec called for a new `src/hooks/useReducedMotion.ts`. `usePrefersReducedMotion()` already exists in `src/hooks/useMediaQuery.ts`; creating a second one would be duplication.
2. The spec listed `tabs.tsx` as needing a moving indicator. `TabsTrigger` already has `transition-all`, and the chores page draws its own per-trigger underline, so there is no separate indicator to move. Dropped rather than invented.

**One design detail the spec left implicit**, now explicit in Tasks 1 and 3: because `globals.css:355-364` clamps every animation with `!important`, the overdue amber ring must live on a base class with the keyframe only modulating it. `tests/chore-view.test.ts` asserts both halves, so a future refactor cannot quietly delete the reduced-motion signal.

**Type consistency.** `TodayChoreItem` is defined once, in `chore-view.ts`, and re-exported from both `chores.ts` and `ChoreTodayList.tsx` so existing importers keep working — the codebase previously had two independent definitions. `todayItemKey` likewise moves to `chore-view.ts` and is re-exported. The `busyKey: string | null` → `busyKeys: ReadonlySet<string>` prop change is introduced in Task 5 and both call sites are updated in Tasks 6 and 8; `npm run typecheck` is expected to fail on `dashboard.tsx` between those tasks, and each task says so.

**Known coverage limit.** No automated test drives the animations themselves — timing and feel were validated in the browser mockup during brainstorming, and asserting CSS durations in a unit test would test the config rather than the behaviour. What *is* tested is everything meaning depends on: the grouping rules, the day rule, icon resolution, the registry-to-lucide mapping, and the reduced-motion class guarantee. Steps 3–4 of Task 7 and Step 4 of Task 8 are manual checks, and are written as explicit numbered click-throughs rather than "verify it works".
