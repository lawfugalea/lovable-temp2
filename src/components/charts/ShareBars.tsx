/**
 * Proportions as labelled bars rather than a donut: easier to read on a phone,
 * sortable, and every row is already a valid progress element for assistive
 * technology.
 *
 * Shares are taken from the server exactly as given. The previous drilldown
 * divided a merchant's all-category total by a single category's total and
 * rendered 240% with a bar overflowing its track, so no arithmetic happens here.
 */
import type { ReactNode } from 'react'
import { money, percent } from '../../lib/finance/format'

export type ShareRow = {
  key: string
  label: string
  cents: number
  sharePercent: number
  count?: number
  color: string
  selected?: boolean
  onSelect?: () => void
  meta?: ReactNode
}

export type ShareBarsProps = {
  rows: ShareRow[]
  currency: string
  emptyMessage?: string
}

export function ShareBars({ rows, currency, emptyMessage = 'Nothing to show yet.' }: ShareBarsProps) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((row, index) => {
        const label = `${row.label}, ${money(row.cents, { currency })}, ${percent(row.sharePercent, { decimals: 1 })} of spending`
        const content = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                <span className="truncate font-medium">{row.label}</span>
                {row.count !== undefined && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.count} {row.count === 1 ? 'payment' : 'payments'}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums font-semibold">{money(row.cents, { currency })}</span>
            </span>
            <span
              className="mt-1.5 block h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={Math.round(row.sharePercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={label}
            >
              <span
                className="block h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(1, row.sharePercent))}%`,
                  backgroundColor: row.color,
                  transitionDelay: `${Math.min(index * 40, 320)}ms`,
                }}
              />
            </span>
            {row.meta}
          </>
        )

        return (
          <li key={row.key}>
            {row.onSelect ? (
              <button
                type="button"
                onClick={row.onSelect}
                aria-pressed={row.selected}
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${row.selected ? 'bg-secondary' : ''}`}
              >
                {content}
              </button>
            ) : (
              <div className="px-3 py-2 text-sm">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
