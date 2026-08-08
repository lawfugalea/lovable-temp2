import {
  CircleDollarSign,
  FileText,
  HeartPulse,
  Home,
  Landmark,
  ListChecks,
  ShoppingBasket,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

export type ModuleKey = 'home' | 'shopping' | 'meals' | 'chores' | 'finances' | 'banking' | 'medicine' | 'notes'

export interface ModuleEntry {
  key: ModuleKey
  name: string
  /** Short label for the mobile tab bar. */
  shortName: string
  href: string
  icon: LucideIcon
  /** Shown as a first-class tab in the phone bottom bar; others live behind "More". */
  mobileTab: boolean
  /** Icon tile in sidebars/cards: soft tinted background + module-coloured icon. */
  tileClass: string
  /** Active nav item: tinted background + module-coloured text. */
  activeClass: string
  /** Solid module colour (indicator bars, dots). */
  barClass: string
  /** Module-coloured text on its own. */
  textClass: string
  /** Summary-card icon tile: soft tinted background, module-coloured icon, and a ring. */
  cardTileClass: string
  /** Summary-card "Open X" ghost-button hover state. */
  cardLinkClass: string
  /** Summary-card's whole-card border tint on hover. */
  cardHoverBorderClass: string
}

export const modules: ModuleEntry[] = [
  {
    key: 'home',
    name: 'Overview',
    shortName: 'Home',
    href: '/dashboard',
    icon: Home,
    mobileTab: true,
    tileClass: 'bg-primary/10 text-primary',
    activeClass: 'bg-primary/10 text-primary',
    barClass: 'bg-primary',
    textClass: 'text-primary',
    cardTileClass: 'bg-primary/10 text-primary ring-primary/15',
    cardLinkClass: 'text-primary hover:bg-primary/10 hover:text-primary',
    cardHoverBorderClass: 'hover:border-primary/30',
  },
  {
    key: 'shopping',
    name: 'Shopping',
    shortName: 'Shopping',
    href: '/shopping',
    icon: ShoppingBasket,
    mobileTab: true,
    tileClass: 'bg-module-shopping/10 text-module-shopping',
    activeClass: 'bg-module-shopping/10 text-module-shopping',
    barClass: 'bg-module-shopping',
    textClass: 'text-module-shopping',
    cardTileClass: 'bg-module-shopping/10 text-module-shopping ring-module-shopping/15',
    cardLinkClass: 'text-module-shopping hover:bg-module-shopping/10 hover:text-module-shopping',
    cardHoverBorderClass: 'hover:border-module-shopping/30',
  },
  {
    key: 'meals',
    name: 'Meals',
    shortName: 'Meals',
    href: '/meals',
    icon: UtensilsCrossed,
    mobileTab: true,
    tileClass: 'bg-module-meals/10 text-module-meals',
    activeClass: 'bg-module-meals/10 text-module-meals',
    barClass: 'bg-module-meals',
    textClass: 'text-module-meals',
    cardTileClass: 'bg-module-meals/10 text-module-meals ring-module-meals/15',
    cardLinkClass: 'text-module-meals hover:bg-module-meals/10 hover:text-module-meals',
    cardHoverBorderClass: 'hover:border-module-meals/30',
  },
  {
    key: 'chores',
    name: 'Chores',
    shortName: 'Chores',
    href: '/chores',
    icon: ListChecks,
    mobileTab: true,
    tileClass: 'bg-module-chores/10 text-module-chores',
    activeClass: 'bg-module-chores/10 text-module-chores',
    barClass: 'bg-module-chores',
    textClass: 'text-module-chores',
    cardTileClass: 'bg-module-chores/10 text-module-chores ring-module-chores/15',
    cardLinkClass: 'text-module-chores hover:bg-module-chores/10 hover:text-module-chores',
    cardHoverBorderClass: 'hover:border-module-chores/30',
  },
  {
    key: 'finances',
    name: 'Finance',
    shortName: 'Finance',
    href: '/finances',
    icon: CircleDollarSign,
    mobileTab: false,
    tileClass: 'bg-module-finances/10 text-module-finances',
    activeClass: 'bg-module-finances/10 text-module-finances',
    barClass: 'bg-module-finances',
    textClass: 'text-module-finances',
    cardTileClass: 'bg-module-finances/10 text-module-finances ring-module-finances/15',
    cardLinkClass: 'text-module-finances hover:bg-module-finances/10 hover:text-module-finances',
    cardHoverBorderClass: 'hover:border-module-finances/30',
  },
  {
    key: 'banking',
    name: 'Banking',
    shortName: 'Banking',
    href: '/banking',
    icon: Landmark,
    mobileTab: false,
    tileClass: 'bg-module-finances/10 text-module-finances',
    activeClass: 'bg-module-finances/10 text-module-finances',
    barClass: 'bg-module-finances',
    textClass: 'text-module-finances',
    cardTileClass: 'bg-module-finances/10 text-module-finances ring-module-finances/15',
    cardLinkClass: 'text-module-finances hover:bg-module-finances/10 hover:text-module-finances',
    cardHoverBorderClass: 'hover:border-module-finances/30',
  },
  {
    key: 'medicine',
    name: 'Medicine',
    shortName: 'Medicine',
    href: '/medicine',
    icon: HeartPulse,
    mobileTab: false,
    tileClass: 'bg-module-medicine/10 text-module-medicine',
    activeClass: 'bg-module-medicine/10 text-module-medicine',
    barClass: 'bg-module-medicine',
    textClass: 'text-module-medicine',
    cardTileClass: 'bg-module-medicine/10 text-module-medicine ring-module-medicine/15',
    cardLinkClass: 'text-module-medicine hover:bg-module-medicine/10 hover:text-module-medicine',
    cardHoverBorderClass: 'hover:border-module-medicine/30',
  },
  {
    key: 'notes',
    name: 'Notes',
    shortName: 'Notes',
    href: '/notes',
    icon: FileText,
    mobileTab: false,
    tileClass: 'bg-module-notes/10 text-module-notes',
    activeClass: 'bg-module-notes/10 text-module-notes',
    barClass: 'bg-module-notes',
    textClass: 'text-module-notes',
    cardTileClass: 'bg-module-notes/10 text-module-notes ring-module-notes/15',
    cardLinkClass: 'text-module-notes hover:bg-module-notes/10 hover:text-module-notes',
    cardHoverBorderClass: 'hover:border-module-notes/30',
  },
]

export const mobileTabModules = modules.filter((m) => m.mobileTab)

export const moduleByKey = Object.fromEntries(modules.map((m) => [m.key, m])) as Record<
  ModuleKey,
  ModuleEntry
>

/**
 * Longest matching prefix, so a sub-route such as `/banking/analytics` keeps its
 * module colour, its highlighted nav item and its `aria-current="page"`. An exact
 * match would silently drop all three the moment a module grew a second page.
 */
export function moduleForPath(pathname: string): ModuleEntry | undefined {
  return modules
    .filter(m => pathname === m.href || pathname.startsWith(`${m.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0]
}
