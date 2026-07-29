/**
 * The figures behind a chart, written out. Always rendered, never hidden behind
 * a hover: the chart summarises the readout, not the other way round.
 */
export type ReadoutRow = {
  label: string
  value: string
  hint?: string
  color?: string
}

export type ChartReadoutProps = {
  title: string
  rows: ReadoutRow[]
  footnote?: string
}

export function ChartReadout({ title, rows, footnote }: ChartReadoutProps) {
  if (!rows.length) return null
  return (
    <div className="rounded-xl bg-muted/50 px-3.5 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map(row => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="flex min-w-0 items-center gap-2 text-muted-foreground">
              {row.color && (
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
              )}
              <span className="truncate">{row.label}</span>
            </dt>
            <dd className="shrink-0 font-medium tabular-nums">
              {row.value}
              {row.hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{row.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-2 text-xs text-muted-foreground">{footnote}</p>}
    </div>
  )
}
