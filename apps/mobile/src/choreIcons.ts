import type { Ionicons } from '@expo/vector-icons'

type IconName = keyof typeof Ionicons.glyphMap

/**
 * The chore-icon ids, mirroring the web registry in src/lib/chore-icons.ts.
 *
 * Deliberately defined here rather than imported from @clankeep/contracts:
 * that package is types-only, so a value imported from it typechecks but fails
 * to bundle. A parity test keeps this list and the web registry in step.
 */
export type ChoreIconId = keyof typeof ICONS

/**
 * The web registry maps chore icon ids to lucide-react components, which cannot
 * run in React Native. The id is the shared contract; this is the phone's own
 * mapping onto Ionicons. Some ids have no exact Ionicons equivalent, so the
 * nearest recognisable shape is used rather than falling back to a generic tick
 * — a wrong-but-plausible icon reads better than forty identical ones.
 */
const ICONS = {
  // Cleaning
  clean: 'sparkles-outline',
  sweep: 'brush-outline',
  hoover: 'cloud-outline',
  windows: 'browsers-outline',
  bin: 'trash-outline',
  recycling: 'refresh-circle-outline',
  tidy: 'sparkles-outline',

  // Kitchen
  dishes: 'restaurant-outline',
  cooking: 'flame-outline',
  fridge: 'snow-outline',
  microwave: 'tv-outline',
  'meal-prep': 'restaurant-outline',
  veg: 'leaf-outline',
  coffee: 'cafe-outline',

  // Laundry
  laundry: 'shirt-outline',
  clothes: 'shirt-outline',
  towels: 'layers-outline',

  // Bathroom
  bathroom: 'water-outline',
  shower: 'rainy-outline',

  // Home
  lightbulb: 'bulb-outline',
  repair: 'construct-outline',
  diy: 'hammer-outline',
  drill: 'build-outline',
  paint: 'color-palette-outline',
  plugs: 'flash-outline',
  heating: 'thermometer-outline',
  blinds: 'reorder-four-outline',
  doors: 'exit-outline',
  keys: 'key-outline',
  bed: 'bed-outline',
  furniture: 'cube-outline',
  lamp: 'bulb-outline',

  // Outdoor
  plants: 'leaf-outline',
  leaves: 'leaf-outline',
  garden: 'flower-outline',
  flowers: 'flower-outline',
  digging: 'earth-outline',
  car: 'car-outline',
  bike: 'bicycle-outline',
  fuel: 'speedometer-outline',

  // Pets
  pets: 'paw-outline',
  dog: 'paw-outline',
  cat: 'paw-outline',
  fish: 'fish-outline',
  'pet-food': 'nutrition-outline',

  // Family
  baby: 'happy-outline',
  family: 'people-outline',
  homework: 'pencil-outline',
  school: 'school-outline',
  medicine: 'medkit-outline',
  health: 'heart-outline',

  // Admin
  post: 'mail-outline',
  bills: 'receipt-outline',
  budget: 'wallet-outline',
  paperwork: 'document-text-outline',
  calendar: 'calendar-outline',
  calls: 'call-outline',
  shopping: 'cart-outline',
  parcels: 'cube-outline',

  general: 'checkmark-circle-outline',
} satisfies Record<string, IconName>

/** Picker layout, mirroring the web groups. The fallback is deliberately absent. */
export const CHORE_ICON_GROUPS: readonly { name: string; ids: readonly ChoreIconId[] }[] = [
  { name: 'Cleaning', ids: ['clean', 'sweep', 'hoover', 'windows', 'bin', 'recycling', 'tidy'] },
  { name: 'Kitchen', ids: ['dishes', 'cooking', 'fridge', 'microwave', 'meal-prep', 'veg', 'coffee'] },
  { name: 'Laundry', ids: ['laundry', 'clothes', 'towels'] },
  { name: 'Bathroom', ids: ['bathroom', 'shower'] },
  { name: 'Home', ids: ['lightbulb', 'repair', 'diy', 'drill', 'paint', 'plugs', 'heating', 'blinds', 'doors', 'keys', 'bed', 'furniture', 'lamp'] },
  { name: 'Outdoor', ids: ['plants', 'leaves', 'garden', 'flowers', 'digging', 'car', 'bike', 'fuel'] },
  { name: 'Pets', ids: ['pets', 'dog', 'cat', 'fish', 'pet-food'] },
  { name: 'Family', ids: ['baby', 'family', 'homework', 'school', 'medicine', 'health'] },
  { name: 'Admin', ids: ['post', 'bills', 'budget', 'paperwork', 'calendar', 'calls', 'shopping', 'parcels'] },
]

export function choreIconName(id: string | null | undefined): IconName {
  if (!id) return ICONS.general
  return ICONS[id as ChoreIconId] ?? ICONS.general
}
