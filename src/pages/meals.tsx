import { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Scale, ShoppingBasket, Trash2, UtensilsCrossed } from 'lucide-react'
import ModernAppShell from '@/components/ModernAppShell'
import GenerateListDialog from '@/components/meals/GenerateListDialog'
import MealSlotPicker, { type PlanEntryDto, type RecipeOption } from '@/components/meals/MealSlotPicker'
import RecipeFormDialog, { type RecipeDto } from '@/components/meals/RecipeFormDialog'
import SupermarketComparisonPanel from '@/components/shopping/SupermarketComparisonPanel'
import UpgradeGate from '@/components/UpgradeGate'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BasketComparison } from '@/lib/shopping-price-comparison'
import { cn } from '@/lib/utils'

type MealsTab = 'week' | 'recipes'

function localDateOnly(date = new Date()) {
  return date.toLocaleDateString('en-CA')
}

/** Monday of the week containing `date` (ISO weeks, matching chores). */
function mondayOf(date: Date): Date {
  const copy = new Date(date)
  const day = copy.getDay() === 0 ? 7 : copy.getDay()
  copy.setDate(copy.getDate() - (day - 1))
  return copy
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function errorMessage(value: unknown, fallback: string) {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') return value.error
  return fallback
}

export default function MealsPage() {
  const { status } = useSession()
  const [tab, setTab] = useState<MealsTab>('week')
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [entries, setEntries] = useState<Map<string, PlanEntryDto>>(new Map())
  const [recipes, setRecipes] = useState<RecipeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [weekLoading, setWeekLoading] = useState(false)
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [recipeFormOpen, setRecipeFormOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<RecipeDto | null>(null)
  const [deletingRecipe, setDeletingRecipe] = useState<RecipeDto | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [priceComparison, setPriceComparison] = useState<BasketComparison | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [priceLocked, setPriceLocked] = useState(false)
  // Malta-only feature: optimistic until /api/household/active says otherwise.
  const [regionSupported, setRegionSupported] = useState(true)

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => localDateOnly(addDays(weekStart, index))),
    [weekStart],
  )
  const from = weekDates[0]
  const to = weekDates[6]
  const today = localDateOnly()
  const plannedCount = weekDates.filter(date => entries.get(date)?.recipe).length

  const loadWeek = useCallback(async (rangeFrom: string, rangeTo: string) => {
    setWeekLoading(true)
    try {
      const response = await fetch(`/api/meals/plan?from=${rangeFrom}&to=${rangeTo}`)
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const map = new Map<string, PlanEntryDto>()
        for (const entry of (data.entries || []) as PlanEntryDto[]) map.set(entry.date, entry)
        setEntries(map)
      }
    } finally {
      setWeekLoading(false)
    }
  }, [])

  const loadRecipes = useCallback(async () => {
    const response = await fetch('/api/meals/recipes')
    const data = await response.json().catch(() => ({}))
    if (response.ok) setRecipes((data.recipes || []) as RecipeDto[])
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setLoading(false)
      return
    }
    void (async () => {
      await Promise.all([loadWeek(from, to), loadRecipes()])
      setLoading(false)
    })()
    void (async () => {
      try {
        const response = await fetch('/api/household/active')
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.priceComparisonRegionSupported === false) setRegionSupported(false)
      } catch {
        // Stay optimistic; plan-price answers authoritatively via 403 codes.
      }
    })()
  }, [status, from, to, loadWeek, loadRecipes])

  const onSlotSaved = useCallback((date: string, entry: PlanEntryDto | null) => {
    setEntries(current => {
      const next = new Map(current)
      if (entry) next.set(date, entry)
      else next.delete(date)
      return next
    })
    setPriceComparison(null)
    setPriceOpen(false)
  }, [])

  const onRecipeSaved = useCallback((recipe: RecipeDto, created: boolean) => {
    setRecipes(current => (created
      ? [...current, recipe].sort((a, b) => a.name.localeCompare(b.name))
      : current.map(row => (row.id === recipe.id ? recipe : row))))
    setPriceComparison(null)
    void loadWeek(from, to)
    toast.success(created ? 'Recipe created' : 'Recipe updated')
  }, [from, to, loadWeek])

  const deleteRecipe = useCallback(async () => {
    if (!deletingRecipe) return
    setDeleteBusy(true)
    try {
      const response = await fetch(`/api/meals/recipes/${encodeURIComponent(deletingRecipe.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not delete this recipe')
      setRecipes(current => current.filter(row => row.id !== deletingRecipe.id))
      setDeletingRecipe(null)
      setPriceComparison(null)
      void loadWeek(from, to)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this recipe')
    } finally {
      setDeleteBusy(false)
    }
  }, [deletingRecipe, from, to, loadWeek])

  const priceWeek = useCallback(async () => {
    setPriceOpen(true)
    setPriceLoading(true)
    setPriceError('')
    try {
      const response = await fetch(`/api/meals/plan-price?from=${from}&to=${to}`)
      const data = await response.json().catch(() => ({}))
      if (response.status === 403 && (data.code === 'upgrade_required' || data.code === 'unavailable_region')) {
        if (data.code === 'unavailable_region') {
          setRegionSupported(false)
          setPriceOpen(false)
        } else {
          setPriceLocked(true)
        }
        setPriceComparison(null)
        return
      }
      if (!response.ok) throw new Error(errorMessage(data, 'Could not price this week'))
      setPriceComparison((data.comparison ?? null) as BasketComparison | null)
    } catch (error) {
      setPriceError(error instanceof Error ? error.message : 'Could not price this week')
      setPriceComparison(null)
    } finally {
      setPriceLoading(false)
    }
  }, [from, to])

  const recipeOptions: RecipeOption[] = recipes.map(recipe => ({ id: recipe.id, name: recipe.name, servings: recipe.servings }))
  const weekLabel = `${new Date(`${from}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${new Date(`${to}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`

  if (status === 'unauthenticated') {
    return <ModernAppShell title="Meals"><div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Sign in to plan meals.</div></ModernAppShell>
  }

  return (
    <ModernAppShell title="Meals">
      <Head><title>Meals – Clankeep</title></Head>
      <div className="mx-auto max-w-4xl space-y-4 pb-12">
        <header className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-soft-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Meal planner</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Plan the week&rsquo;s dinners, then shop and price the ingredients in one tap.
            </p>
          </div>
          <Button type="button" onClick={() => { setEditingRecipe(null); setRecipeFormOpen(true) }} className="min-h-11">
            <Plus />New recipe
          </Button>
        </header>

        <Tabs value={tab} onValueChange={value => setTab(value as MealsTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week" className="min-h-10">This week</TabsTrigger>
            <TabsTrigger value="recipes" className="min-h-10">Recipes ({recipes.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-14 rounded-xl" />)}</div>
        ) : tab === 'week' ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart(current => addDays(current, -7))} className="min-h-11 min-w-11">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setWeekStart(mondayOf(new Date()))}
                className="rounded-md px-3 py-1.5 font-display text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {weekLabel}
              </button>
              <Button type="button" variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart(current => addDays(current, 7))} className="min-h-11 min-w-11">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className={cn('divide-y rounded-xl border bg-card', weekLoading && 'opacity-60')}>
              {weekDates.map(date => {
                const entry = entries.get(date) || null
                const isToday = date === today
                const label = new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setPickerDate(date)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
                  >
                    <span className={cn(
                      'grid h-11 w-14 shrink-0 place-items-center rounded-lg text-xs font-bold',
                      isToday ? 'bg-module-meals/10 text-module-meals' : 'bg-muted text-muted-foreground',
                    )}>
                      {label}
                    </span>
                    <span className="min-w-0 flex-1">
                      {entry?.recipe ? (
                        <>
                          <span className="block truncate text-sm font-semibold">{entry.recipe.name}</span>
                          <span className="block text-xs text-muted-foreground">serves {entry.recipe.servings}</span>
                        </>
                      ) : entry?.freeText ? (
                        <span className="block truncate text-sm font-medium">{entry.freeText}</span>
                      ) : (
                        <span className="block text-sm text-muted-foreground">Nothing planned</span>
                      )}
                    </span>
                    <UtensilsCrossed className={cn('h-4 w-4 shrink-0', entry ? 'text-module-meals' : 'text-muted-foreground/40')} aria-hidden="true" />
                  </button>
                )
              })}
            </div>

            <div className="sticky bottom-24 z-30 flex flex-col gap-2 rounded-xl border bg-card/95 p-3 shadow-soft backdrop-blur sm:flex-row lg:bottom-4">
              <Button type="button" onClick={() => setGenerateOpen(true)} disabled={!plannedCount} className="min-h-11 flex-1">
                <ShoppingBasket />Add ingredients to shopping list
              </Button>
              {regionSupported && (
                <Button type="button" variant="outline" onClick={() => void priceWeek()} disabled={!plannedCount || priceLoading} className="min-h-11 flex-1">
                  {priceLoading ? <Loader2 className="animate-spin" /> : <Scale />}Price this week
                </Button>
              )}
            </div>

            {priceOpen && priceLocked && (
              <UpgradeGate
                icon={Scale}
                module="meals"
                title="Price the whole week before you shop"
                description="The Family plan prices every planned ingredient across Malta's supermarket catalogues, so you know what the week costs per store."
              />
            )}
            {priceOpen && !priceLocked && (
              <div className="rounded-xl border bg-card p-4 shadow-soft-sm sm:p-6">
                <SupermarketComparisonPanel
                  comparison={priceComparison}
                  loading={priceLoading}
                  error={priceError}
                  onRetry={() => void priceWeek()}
                  onMatch={() => toast.info('Link this ingredient to a catalogue product in the recipe editor to price it')}
                />
              </div>
            )}
          </>
        ) : recipes.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            module="meals"
            title="No recipes yet"
            description="Save the meals your family actually cooks. Link ingredients to catalogue products and the planner prices the whole week."
            action={<Button type="button" onClick={() => { setEditingRecipe(null); setRecipeFormOpen(true) }} className="min-h-11"><Plus />Create your first recipe</Button>}
          />
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {recipes.map(recipe => {
              const linked = recipe.ingredients.filter(ingredient => ingredient.canonicalProductId).length
              return (
                <div key={recipe.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-module-meals/10 text-module-meals">
                    <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{recipe.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Serves {recipe.servings} · {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'}
                      {linked > 0 && <> · {linked} priced</>}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${recipe.name}`} onClick={() => { setEditingRecipe(recipe); setRecipeFormOpen(true) }} className="shrink-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${recipe.name}`} onClick={() => setDeletingRecipe(recipe)} className="shrink-0 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <MealSlotPicker
        open={pickerDate !== null}
        date={pickerDate}
        entry={pickerDate ? entries.get(pickerDate) || null : null}
        recipes={recipeOptions}
        onClose={() => setPickerDate(null)}
        onSaved={onSlotSaved}
      />
      <RecipeFormDialog open={recipeFormOpen} recipe={editingRecipe} onClose={() => setRecipeFormOpen(false)} onSaved={onRecipeSaved} />
      <GenerateListDialog
        open={generateOpen}
        from={from}
        to={to}
        plannedCount={plannedCount}
        onClose={() => setGenerateOpen(false)}
        onGenerated={() => undefined}
      />

      <Dialog open={deletingRecipe !== null} onOpenChange={open => !open && setDeletingRecipe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this recipe?</DialogTitle>
            <DialogDescription>
              {deletingRecipe?.name} will be removed along with any days it is planned on.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingRecipe(null)} className="min-h-11">Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void deleteRecipe()} disabled={deleteBusy} className="min-h-11">
              {deleteBusy && <Loader2 className="animate-spin" />}Delete recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernAppShell>
  )
}
