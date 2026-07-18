import { useEffect, useState } from 'react'
import { Loader2, ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

interface ShoppingListOption {
  id: string
  name: string
  archivedAt: string | null
}

interface GenerateListDialogProps {
  open: boolean
  from: string
  to: string
  plannedCount: number
  onClose: () => void
  onGenerated: () => void
}

export default function GenerateListDialog({ open, from, to, plannedCount, onClose, onGenerated }: GenerateListDialogProps) {
  const [lists, setLists] = useState<ShoppingListOption[]>([])
  const [listId, setListId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    void (async () => {
      try {
        const response = await fetch('/api/shopping/lists')
        const data = await response.json().catch(() => ({}))
        const active = (Array.isArray(data.lists) ? data.lists : []).filter((list: ShoppingListOption) => !list.archivedAt)
        setLists(active)
        setListId(current => current || active[0]?.id || '')
      } catch {
        setLists([])
      }
    })()
  }, [open])

  const generate = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/meals/generate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, listId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not update the shopping list')
      const created = Number(data.created) || 0
      const merged = Number(data.merged) || 0
      toast.success(`${data.listName}: ${created} item${created === 1 ? '' : 's'} added${merged ? `, ${merged} topped up` : ''}`)
      onGenerated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the shopping list')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingBasket className="h-5 w-5 text-module-meals" />Add the week to a shopping list</DialogTitle>
          <DialogDescription>
            Ingredients from {plannedCount} planned {plannedCount === 1 ? 'recipe' : 'recipes'} are combined — duplicates merge and quantities on the list top up.
          </DialogDescription>
        </DialogHeader>

        {lists.length ? (
          <div>
            <label htmlFor="generate-list-target" className="text-sm font-medium">Shopping list</label>
            <select
              id="generate-list-target"
              value={listId}
              onChange={event => setListId(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No active shopping lists — create one in Shopping first.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="min-h-11">Cancel</Button>
          <Button type="button" onClick={() => void generate()} disabled={busy || !listId || !plannedCount} className="min-h-11">
            {busy && <Loader2 className="animate-spin" />}Add ingredients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
