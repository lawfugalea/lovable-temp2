import {
  CircleDollarSign,
  FileText,
  HeartPulse,
  Home,
  ShoppingBasket,
  type LucideIcon,
} from 'lucide-react'

export type ModuleKey = 'home' | 'shopping' | 'finances' | 'medicine' | 'notes'

export interface ModuleEntry {
  key: ModuleKey
  name: string
  href: string
  icon: LucideIcon
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
    href: '/dashboard',
    icon: Home,
    tileClass: 'bg-primary/10 text-primary',
    activeClass: 'bg-primary/10 text-primary',
    barClass: 'bg-primary',
    textClass: 'text-primary',
  },
  {
    key: 'shopping',
    name: 'Shopping',
    href: '/shopping',
    icon: ShoppingBasket,
    tileClass: 'bg-module-shopping/10 text-module-shopping',
    activeClass: 'bg-module-shopping/10 text-module-shopping',
    barClass: 'bg-module-shopping',
    textClass: 'text-module-shopping',
  },
  {
    key: 'finances',
    name: 'Finances',
    href: '/finances',
    icon: CircleDollarSign,
    tileClass: 'bg-module-finances/10 text-module-finances',
    activeClass: 'bg-module-finances/10 text-module-finances',
    barClass: 'bg-module-finances',
    textClass: 'text-module-finances',
  },
  {
    key: 'medicine',
    name: 'Medicine',
    href: '/medicine',
    icon: HeartPulse,
    tileClass: 'bg-module-medicine/10 text-module-medicine',
    activeClass: 'bg-module-medicine/10 text-module-medicine',
    barClass: 'bg-module-medicine',
    textClass: 'text-module-medicine',
  },
  {
    key: 'notes',
    name: 'Notes',
    href: '/notes',
    icon: FileText,
    tileClass: 'bg-module-notes/10 text-module-notes',
    activeClass: 'bg-module-notes/10 text-module-notes',
    barClass: 'bg-module-notes',
    textClass: 'text-module-notes',
  },
]

export const moduleByKey = Object.fromEntries(modules.map((m) => [m.key, m])) as Record<
  ModuleKey,
  ModuleEntry
>

export function moduleForPath(pathname: string): ModuleEntry | undefined {
  return modules.find((m) => m.href === pathname)
}
