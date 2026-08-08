import type { Ionicons } from '@expo/vector-icons'
import type { MobileChoreIconId } from '@clankeep/contracts'

type IconName = keyof typeof Ionicons.glyphMap

/**
 * The web registry maps chore icon ids to lucide-react components, which cannot
 * run in React Native. The id is the shared contract; this is the phone's own
 * mapping onto Ionicons. Some ids have no exact Ionicons equivalent, so the
 * nearest recognisable shape is used rather than falling back to a generic tick
 * — a wrong-but-plausible icon reads better than forty identical ones.
 */
const ICONS: Record<MobileChoreIconId, IconName> = {
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
}

export function choreIconName(id: string | null | undefined): IconName {
  if (!id) return ICONS.general
  return ICONS[id as MobileChoreIconId] ?? ICONS.general
}
