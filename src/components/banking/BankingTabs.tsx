/**
 * Banking section navigation.
 *
 * Real links rather than Radix `Tabs`: the sections now span two routes, and
 * `aria-selected` on a control that navigates away is a lie. Links also bring
 * middle-click, browser back and keyboard semantics for free — all of which the
 * previous hand-rolled `<button>` nav lacked, along with any role at all.
 */
import Link from 'next/link'
import { BarChart3, LayoutDashboard, ReceiptText, Repeat2, WalletCards } from 'lucide-react'
import type { BankingTab } from './types'

const TABS: Array<{ id: BankingTab; label: string; href: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Dashboard', href: '/banking', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', href: '/banking/analytics', icon: BarChart3 },
  { id: 'transactions', label: 'Transactions', href: '/banking?tab=transactions', icon: ReceiptText },
  { id: 'subscriptions', label: 'Subscriptions', href: '/banking?tab=subscriptions', icon: Repeat2 },
  { id: 'coach', label: 'Bank coach', href: '/banking?tab=coach', icon: WalletCards },
]

export function BankingTabs({ active }: { active: BankingTab }) {
  return (
    <nav
      aria-label="Banking sections"
      className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-2 sm:flex sm:w-fit"
    >
      {TABS.map(tab => {
        const current = tab.id === active
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={current ? 'page' : undefined}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              current ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
