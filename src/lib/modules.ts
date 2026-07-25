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
  },
]

export const mobileTabModules = modules.filter((m) => m.mobileTab)

export const moduleByKey = Object.fromEntries(modules.map((m) => [m.key, m])) as Record<
  ModuleKey,
  ModuleEntry
>

export function moduleForPath(pathname: string): ModuleEntry | undefined {
  return modules.find((m) => m.href === pathname)
}
