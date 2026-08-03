import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChefHat, Loader2, Package, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

type PantryItem = {
  id: string
  name: string
  quantity: string | null
  updatedAt: string
  updatedBy: { id: string; name: string | null } | null
}

type Suggestion = {
  recipeId: string
  name: string
  servings: number
  matched: number
  total: number
  missing: string[]
}

/**
 * The household pantry: what is already at home. Ingredients listed here are
 * skipped when a meal plan generates its shopping list, and the suggestion
 * strip ranks recipes by how much of them the pantry already covers.
 */
export default function PantryPanel() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [adding, setAdding] = useState(false)

  const refresh = useCallback(async () => {
    const [itemsResponse, suggestionsResponse] = await Promise.all([
      fetch('/api/pantry'),
      fetch('/api/pantry/suggestions'),
    ])
    if (itemsResponse.ok) {
      const payload = await itemsResponse.json()
      setItems(Array.isArray(payload.items) ? payload.items : [])
    }
    if (suggestionsResponse.ok) {
      const payload = await suggestionsResponse.json()
      setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : [])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void refresh()
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refresh])

  const addItem = async () => {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      const response = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity: newQuantity.trim() || undefined }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Could not add to the pantry')
      setNewName('')
      setNewQuantity('')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add to the pantry')
    } finally {
      setAdding(false)
    }
  }

  const removeItem = async (item: PantryItem) => {
    setBusyId(item.id)
    try {
      const response = await fetch(`/api/pantry/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not remove this item')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove this item')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div className="space-y-2">{[0, 1, 2].map(index => <Skeleton key={index} className="h-14 rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row"
        onSubmit={event => { event.preventDefault(); void addItem() }}
      >
        <Input
          value={newName}
          onChange={event => setNewName(event.target.value)}
          placeholder="What's at home? e.g. Rice"
          aria-label="Pantry item name"
          className="min-h-11 flex-1"
          maxLength={120}
        />
        <Input
          value={newQuantity}
          onChange={event => setNewQuantity(event.target.value)}
          placeholder="Amount (optional)"
          aria-label="Amount"
          className="min-h-11 sm:w-40"
          maxLength={60}
        />
        <Button type="submit" disabled={adding || !newName.trim()} className="min-h-11">
          {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
          Add
        </Button>
      </form>

      {suggestions.length > 0 && (
        <section aria-labelledby="pantry-suggestions" className="rounded-xl border bg-card p-4">
          <h2 id="pantry-suggestions" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
            <ChefHat className="h-4 w-4 text-module-meals" aria-hidden="true" /> Cook from your pantry
          </h2>
          <ul className="mt-3 space-y-2">
            {suggestions.map(suggestion => (
              <li key={suggestion.recipeId} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{suggestion.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {suggestion.matched}/{suggestion.total} ingredients at home
                  {suggestion.missing.length > 0 && ` · missing ${suggestion.missing.slice(0, 3).join(', ')}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          module="meals"
          title="Nothing in the pantry yet"
          description="Add the staples you already have — planned meals will skip them when building the shopping list."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map(item => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {item.quantity && <p className="text-xs text-muted-foreground">{item.quantity}</p>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-red-600 hover:text-red-700"
                aria-label={`Remove ${item.name} from the pantry`}
                disabled={busyId === item.id}
                onClick={() => void removeItem(item)}
              >
                {busyId === item.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
