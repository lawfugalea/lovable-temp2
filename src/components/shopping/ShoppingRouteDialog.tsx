import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { SHOPPING_CATEGORIES, normalizeShoppingCategoryOrder, shoppingCategoryLabel, type ShoppingCategoryKey } from '@/lib/shopping-categories'

export function ShoppingRouteDialog({ listId, open, onOpenChange, order, onOrderChange }: {
  listId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ShoppingCategoryKey[]
  onOrderChange: (order: ShoppingCategoryKey[]) => void
}) {
  const [draft, setDraft] = useState(order)
  const [dragged, setDragged] = useState<ShoppingCategoryKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setDraft(normalizeShoppingCategoryOrder(order)); setError('') } }, [open, order])

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= draft.length) return
    setDraft(current => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const dropBefore = (key: ShoppingCategoryKey) => {
    if (!dragged || dragged === key) return
    setDraft(current => {
      const next = current.filter(item => item !== dragged)
      next.splice(next.indexOf(key), 0, dragged)
      return next
    })
    setDragged(null)
  }

  const save = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/shopping/category-order', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listId, order: draft }) })
      const data = await response.json().catch(() => ({})) as { order?: ShoppingCategoryKey[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not save the shopping route')
      onOrderChange(normalizeShoppingCategoryOrder(data.order))
      onOpenChange(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the shopping route') }
    finally { setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Arrange your shopping route</DialogTitle>
        <DialogDescription>Put departments in the order you normally walk through the shop. This route is shared with your household and is not linked to a retailer.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2" aria-label="Shopping category order">
        {draft.map((key, index) => <div
          key={key}
          draggable
          onDragStart={() => setDragged(key)}
          onDragEnd={() => setDragged(null)}
          onDragOver={event => event.preventDefault()}
          onDrop={() => dropBefore(key)}
          className="flex min-h-12 items-center gap-2 rounded-lg border bg-background px-2"
        >
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm font-medium">{shoppingCategoryLabel(key)}</span>
          <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${shoppingCategoryLabel(key)} up`}><ChevronUp /></Button>
          <Button type="button" size="icon" variant="ghost" disabled={index === SHOPPING_CATEGORIES.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${shoppingCategoryLabel(key)} down`}><ChevronDown /></Button>
        </div>)}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />}Save route</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
