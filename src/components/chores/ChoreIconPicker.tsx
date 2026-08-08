import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { CHORE_ICON_GROUPS, choreIconComponent, inferChoreIconId, type ChoreIconId } from '@/lib/chore-icons'
import { cn } from '@/lib/utils'

interface ChoreIconPickerProps {
  /** The current title, so Auto can preview what inference would choose. */
  title: string
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * Icon override for a chore. `null` is Auto, which keeps inferring from the
 * title — so renaming a chore keeps updating its icon until someone overrules
 * it here.
 *
 * Offers the ~60 curated ids from the registry, not lucide's ~4,500 exports.
 */
export default function ChoreIconPicker({ title, value, onChange }: ChoreIconPickerProps) {
  const [query, setQuery] = useState('')
  const inferred = useMemo(() => inferChoreIconId(title), [title])
  const AutoIcon = choreIconComponent(inferred)

  const needle = query.trim().toLowerCase()
  const groups = CHORE_ICON_GROUPS
    .map(group => ({
      name: group.name,
      ids: needle
        ? group.ids.filter(id => id.includes(needle) || group.name.toLowerCase().includes(needle))
        : group.ids,
    }))
    .filter(group => group.ids.length > 0)

  const cell = (id: ChoreIconId | null, Icon: typeof AutoIcon, label: string) => {
    const selected = value === id
    return (
      <button
        key={id ?? 'auto'}
        type="button"
        onClick={() => onChange(id)}
        aria-pressed={selected}
        aria-label={label}
        title={label}
        className={cn(
          'grid h-10 w-10 place-items-center rounded-lg border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected
            ? 'border-module-chores bg-module-chores/10 text-module-chores'
            : 'border-input text-muted-foreground hover:border-module-chores/50 hover:text-foreground',
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div>
      <span className="text-sm font-medium">Icon</span>
      <div className="mt-1 flex items-center gap-2">
        {cell(null, AutoIcon, `Auto — currently ${inferred}`)}
        <div className="min-w-0 flex-1">
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search icons…"
            aria-label="Search icons"
            className="h-10"
          />
        </div>
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {value === null ? 'Chosen from the name as you type' : 'Pick the first tile to go back to automatic'}
      </p>

      <div className="mt-2 max-h-48 space-y-3 overflow-y-auto rounded-lg border p-2">
        {groups.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No icons match that.</p>}
        {groups.map(group => (
          <div key={group.name}>
            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {group.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.ids.map(id => cell(id, choreIconComponent(id), id.replace(/-/g, ' ')))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
