/**
 * Legend chips. Toggleable ones are real buttons carrying `aria-pressed`, so a
 * hidden series is discoverable rather than just absent.
 */
export type LegendItem = {
  key: string
  label: string
  color: string
  hidden?: boolean
}

export type ChartLegendProps = {
  items: LegendItem[]
  onToggle?: (key: string) => void
}

export function ChartLegend({ items, onToggle }: ChartLegendProps) {
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {items.map(item => {
        const swatch = (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.hidden ? 'hsl(var(--muted-foreground))' : item.color }}
              aria-hidden="true"
            />
            {item.label}
          </>
        )
        return (
          <li key={item.key}>
            {onToggle ? (
              <button
                type="button"
                onClick={() => onToggle(item.key)}
                aria-pressed={!item.hidden}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  item.hidden ? 'border-border text-muted-foreground' : 'border-border bg-card text-foreground'
                }`}
              >
                {swatch}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {swatch}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
