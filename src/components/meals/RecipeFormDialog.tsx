import { useEffect, useRef, useState } from 'react'
import { Link2, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

export interface RecipeIngredientDto {
  id?: string
  name: string
  quantity: number
  unit: string | null
  canonicalProductId: string | null
}

export interface RecipeDto {
  id: string
  name: string
  servings: number
  notes: string | null
  ingredients: RecipeIngredientDto[]
}

interface RecipeFormDialogProps {
  open: boolean
  recipe: RecipeDto | null
  onClose: () => void
  onSaved: (recipe: RecipeDto, created: boolean) => void
}

interface IngredientRow {
  key: number
  name: string
  quantity: string
  unit: string
  canonicalProductId: string | null
  linkedTitle: string | null
}

interface SearchSuggestion {
  canonicalProductId: string
  title: string
  price: string | null
  store: string | null
}

let rowKey = 0
function newRow(): IngredientRow {
  return { key: ++rowKey, name: '', quantity: '1', unit: '', canonicalProductId: null, linkedTitle: null }
}

export default function RecipeFormDialog({ open, recipe, onClose, onSaved }: RecipeFormDialogProps) {
  const [name, setName] = useState('')
  const [servings, setServings] = useState('4')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<IngredientRow[]>([newRow()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [searchRowKey, setSearchRowKey] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRequest = useRef(0)

  useEffect(() => {
    if (!open) return
    setError('')
    setSearchRowKey(null)
    setSuggestions([])
    setName(recipe?.name || '')
    setServings(String(recipe?.servings || 4))
    setNotes(recipe?.notes || '')
    setRows(recipe?.ingredients.length
      ? recipe.ingredients.map(ingredient => ({
          key: ++rowKey,
          name: ingredient.name,
          quantity: String(ingredient.quantity),
          unit: ingredient.unit || '',
          canonicalProductId: ingredient.canonicalProductId,
          linkedTitle: ingredient.canonicalProductId ? ingredient.name : null,
        }))
      : [newRow()])
  }, [open, recipe])

  // Catalogue autocomplete for the focused ingredient row.
  useEffect(() => {
    const row = rows.find(r => r.key === searchRowKey)
    const query = row?.name.trim() || ''
    if (!row || row.canonicalProductId || query.length < 2) {
      setSuggestions([])
      setSearchLoading(false)
      return
    }
    const requestId = ++searchRequest.current
    setSearchLoading(true)
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/prices/search?q=${encodeURIComponent(query)}`)
        const data = await response.json().catch(() => ({}))
        if (requestId !== searchRequest.current) return
        const items = Array.isArray(data.items) ? data.items : []
        setSuggestions(items.slice(0, 5).map((item: { canonicalProductId: string; title: string; price: string | null; store: string | null }) => ({
          canonicalProductId: item.canonicalProductId,
          title: item.title,
          price: item.price,
          store: item.store,
        })))
      } catch {
        if (requestId === searchRequest.current) setSuggestions([])
      } finally {
        if (requestId === searchRequest.current) setSearchLoading(false)
      }
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [rows, searchRowKey])

  const updateRow = (key: number, patch: Partial<IngredientRow>) => {
    setRows(current => current.map(row => (row.key === key ? { ...row, ...patch } : row)))
  }

  const linkSuggestion = (key: number, suggestion: SearchSuggestion) => {
    updateRow(key, { name: suggestion.title, canonicalProductId: suggestion.canonicalProductId, linkedTitle: suggestion.title })
    setSuggestions([])
    setSearchRowKey(null)
  }

  const submit = async () => {
    const ingredients = rows
      .filter(row => row.name.trim())
      .map(row => ({
        name: row.name.trim(),
        quantity: Number(row.quantity) || 1,
        unit: row.unit.trim() || null,
        canonicalProductId: row.canonicalProductId,
      }))
    if (!name.trim()) { setError('Give this recipe a name'); return }
    if (!ingredients.length) { setError('Add at least one ingredient'); return }
    setBusy(true)
    setError('')
    try {
      const response = await fetch(recipe ? `/api/meals/recipes/${encodeURIComponent(recipe.id)}` : '/api/meals/recipes', {
        method: recipe ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          servings: Math.max(1, Math.min(50, Number(servings) || 4)),
          notes: notes.trim(),
          ingredients,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not save this recipe')
      onSaved(data.recipe as RecipeDto, !recipe)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this recipe')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edit recipe' : 'New recipe'}</DialogTitle>
          <DialogDescription>
            Link ingredients to catalogue products and Clankeep can price the whole week and build the shopping list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <label htmlFor="recipe-name" className="text-sm font-medium">Recipe</label>
              <Input id="recipe-name" autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Spaghetti bolognese" maxLength={120} className="mt-1 h-11" />
            </div>
            <div>
              <label htmlFor="recipe-servings" className="text-sm font-medium">Serves</label>
              <Input id="recipe-servings" type="number" min={1} max={50} value={servings} onChange={event => setServings(event.target.value)} className="mt-1 h-11" />
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">Ingredients</span>
            <div className="mt-1 space-y-2">
              {rows.map(row => (
                <div key={row.key}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={row.name}
                        onChange={event => updateRow(row.key, { name: event.target.value, canonicalProductId: null, linkedTitle: null })}
                        onFocus={() => setSearchRowKey(row.key)}
                        placeholder="Minced beef"
                        maxLength={200}
                        aria-label="Ingredient name"
                        className="h-11"
                      />
                      {row.canonicalProductId && (
                        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-module-meals/10 px-2.5 py-0.5 text-xs font-semibold text-module-meals">
                          <Link2 className="h-3 w-3" aria-hidden="true" />
                          Priced from the catalogue
                          <button type="button" aria-label="Unlink catalogue product" onClick={() => updateRow(row.key, { canonicalProductId: null, linkedTitle: null })}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      {searchRowKey === row.key && !row.canonicalProductId && (suggestions.length > 0 || searchLoading) && (
                        <div className="mt-1 overflow-hidden rounded-lg border bg-popover shadow-soft">
                          {searchLoading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching the catalogue…</div>}
                          {suggestions.map(suggestion => (
                            <button
                              key={suggestion.canonicalProductId}
                              type="button"
                              onClick={() => linkSuggestion(row.key, suggestion)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                              <span className="min-w-0 flex-1 truncate">{suggestion.title}</span>
                              {suggestion.price && <span className="shrink-0 text-xs font-semibold text-module-meals">{suggestion.price}{suggestion.store ? ` · ${suggestion.store}` : ''}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={row.quantity}
                      onChange={event => updateRow(row.key, { quantity: event.target.value })}
                      aria-label="Quantity"
                      className="h-11 w-20"
                    />
                    <Input
                      value={row.unit}
                      onChange={event => updateRow(row.key, { unit: event.target.value })}
                      placeholder="unit"
                      maxLength={20}
                      aria-label="Unit"
                      className="h-11 w-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove ingredient"
                      disabled={rows.length === 1}
                      onClick={() => setRows(current => current.filter(other => other.key !== row.key))}
                      className={cn('mt-0.5 shrink-0 text-muted-foreground', rows.length === 1 && 'invisible')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setRows(current => [...current, newRow()])} className="mt-2 min-h-10">
              <Plus />Add ingredient
            </Button>
          </div>

          <div>
            <label htmlFor="recipe-notes" className="text-sm font-medium">Notes (optional)</label>
            <Textarea id="recipe-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={2} maxLength={2000} placeholder="Nanna's version uses fresh basil" className="mt-1" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="min-h-11">Cancel</Button>
          <Button type="button" onClick={() => void submit()} disabled={busy} className="min-h-11">
            {busy && <Loader2 className="animate-spin" />}
            {recipe ? 'Save recipe' : 'Create recipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
