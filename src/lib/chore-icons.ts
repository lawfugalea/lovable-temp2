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
 * them. Order in this array does not affect matching: generic-verb keywords
 * sort after every other keyword, then longest keyword wins, then ties are
 * broken alphabetically by keyword — see ORDERED below. Table order is purely
 * for readability.
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
 *
 * A handful of individual keywords are deliberately excluded from pure length
 * ranking — see GENERIC_KEYWORDS below — because each is a genuinely generic
 * verb that applies to virtually any object ("clean the X", "fix the X", "tidy
 * the X", "pay for the X" all parse for any X), so by raw length alone one can
 * outrank a shorter but more specific noun it happens to share a title with:
 *   - "Clean the loo": 'clean' (5) vs 'loo' (3) — wrongly picks the spray
 *     bottle over the bathroom.
 *   - "Fix the car"/"Fix the dog"/"Fix the cat": 'fix' (3) ties every one of
 *     those nouns (3) — table order, not a rule, decided the old winner.
 *   - "Tidy the bins": 'tidy' (4) ties 'bins' (4) — same accident.
 *   - "Pay for the car"/"Pay the pet insurance": 'pay' (3) ties/beats 'car'
 *     and 'pet' (3) — alphabetical order, not a rule, decided the old winner
 *     ('pay' < 'pet' but 'pay' > 'car', so it won one and lost the other for
 *     no reason connected to which title is more specific).
 * Generic keywords are sorted after every other keyword, and only by length
 * (then alphabetically) among themselves, so a more specific match anywhere
 * in the title always wins; the generic verb still matches (and should) when
 * nothing more specific is present.
 *
 * This set is keyed by the keyword string, not the id, because genericness is
 * a property of the individual word, not of the chore category: 'bills' the
 * id has both a generic verb ('pay') and concrete nouns ('bill', 'bills') that
 * must NOT be demoted with it — "Sort the admin and pay the bills" must still
 * resolve to 'bills' (the mentioned topic), not lose to 'admin' just because
 * 'pay' shares an id with 'bills'. Marking ids wholesale would also have wrongly
 * demoted 'clean'/'repair'/'tidy' themselves, but every keyword under those
 * three ids happens to be equally generic (there's no concrete-noun sense of
 * "a repair" or "a tidy" the way there's a concrete "bill"), so listing them by
 * keyword rather than id changes nothing for those three.
 *
 * `cook` and `pay`'s own noun-shaped siblings ('bill'/'bills') look similar but
 * are not generic: "Cook the fish" is genuinely a cooking chore, not the
 * pet-fish icon, because the verb names the correct category rather than
 * standing in for "do something to X". See the audit in the Task 2 report for
 * the full reasoning, including why 'mop' and 'mow' were checked and excluded.
 *
 * Equal-length, non-generic keywords are broken alphabetically by the keyword
 * itself, so which line happens to be listed first in KEYWORDS never affects
 * the result.
 */
const GENERIC_KEYWORDS: ReadonlySet<string> = new Set([
  'scrub', 'clean', 'cleaning', // clean
  'repair', 'fix', // repair
  'tidy', 'declutter', // tidy
  'pay', // bills — 'bill'/'bills' are concrete nouns and are NOT in this set
])

const ORDERED: ReadonlyArray<readonly [RegExp, ChoreIconId]> = [...KEYWORDS]
  .sort((a, b) => {
    const genericA = GENERIC_KEYWORDS.has(a[0])
    const genericB = GENERIC_KEYWORDS.has(b[0])
    if (genericA !== genericB) return genericA ? 1 : -1
    if (a[0].length !== b[0].length) return b[0].length - a[0].length
    // Equal length: compare the keyword itself, so match order never depends on
    // where a line was inserted in KEYWORDS.
    return a[0].localeCompare(b[0])
  })
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
