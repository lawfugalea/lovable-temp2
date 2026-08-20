import { useEffect, useState } from 'react'
import { Loader2, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export interface RecipeOption {
  id: string
  name: string
  servings: number
}

export interface PlanEntryDto {
  id: string
  date: string
  slot: 'DINNER'
  recipe: RecipeOption | null
  freeText: string | null
}

interface MealSlotPickerProps {
  open: boolean
  date: string | null
  entry: PlanEntryDto | null
  recipes: RecipeOption[]
  onClose: () => void
  onSaved: (date: string, entry: PlanEntryDto | null) => void
}

function prettyDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function MealSlotPicker({ open, date, entry, recipes, onClose, onSaved }: MealSlotPickerProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [freeText, setFreeText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setSelectedRecipeId(entry?.recipe?.id || '')
    setFreeText(entry?.freeText || '')
  }, [open, entry])

  const save = async (clear = false) => {
    if (!date) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/meals/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clear
          ? { date }
          : selectedRecipeId
            ? { date, recipeId: selectedRecipeId }
            : { date, freeText: freeText.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not save the plan')
      onSaved(date, (data.entry ?? null) as PlanEntryDto | null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the plan')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{date ? `Dinner on ${prettyDate(date)}` : 'Plan dinner'}</DialogTitle>
          <DialogDescription>Pick one of your recipes or jot down a plan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {recipes.length > 0 ? (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1.5" role="radiogroup" aria-label="Recipes">
              {recipes.map(recipe => (
                <button
                  key={recipe.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedRecipeId === recipe.id}
                  onClick={() => { setSelectedRecipeId(current => (current === recipe.id ? '' : recipe.id)); setFreeText('') }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                    selectedRecipeId === recipe.id
                      ? 'bg-module-meals/10 font-semibold text-module-meals'
                      : 'hover:bg-accent',
                  )}
                >
                  <UtensilsCrossed className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{recipe.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">serves {recipe.servings}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No recipes yet — add one from the Recipes tab, or just type a plan below.
            </p>
          )}

          <div>
            <label htmlFor="meal-free-text" className="text-sm font-medium">Or something else</label>
            <Input
              id="meal-free-text"
              value={freeText}
              onChange={event => { setFreeText(event.target.value); setSelectedRecipeId('') }}
              placeholder="Pizza night out, leftovers…"
              maxLength={200}
              className="mt-1 h-11"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {entry ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void save(true)} className="min-h-11 text-muted-foreground">
              Clear day
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="min-h-11">Cancel</Button>
            <Button type="button" onClick={() => void save()} disabled={busy || (!selectedRecipeId && !freeText.trim())} className="min-h-11">
              {busy && <Loader2 className="animate-spin" />}Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
