import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import ModernAppShell from '@/components/ModernAppShell'
import SupermarketComparisonPanel from '@/components/shopping/SupermarketComparisonPanel'
import UpgradeGate from '@/components/UpgradeGate'
import OffersPanel, { type SupermarketOffer } from '@/components/shopping/OffersPanel'
import { ShoppingAiDialog } from '@/components/shopping/ShoppingAiDialog'
import { ShoppingRouteDialog } from '@/components/shopping/ShoppingRouteDialog'
import TemplateScheduleDialog from '@/components/shopping/TemplateScheduleDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Input } from '@/components/ui/Input'
import type { BasketComparison, ComparedItem } from '@/lib/shopping-price-comparison'
import { DEFAULT_SHOPPING_CATEGORY_ORDER, normalizeShoppingItemCategory, shoppingCategoryLabel, type ShoppingCategoryKey } from '@/lib/shopping-categories'
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  FileDown,
  FilePlus2,
  ListChecks,
  Loader2,
  MapPinned,
  Minus,
  MoreHorizontal,
  Package,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShoppingBasket,
  Sparkles,
  Scale,
  CalendarClock,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import ModuleFirstRun from '@/components/onboarding/ModuleFirstRun'
import { useListSync } from '@/hooks/useListSync'
import { pendingCount, queueOperation, replayOutbox } from '@/lib/shopping-outbox'

interface CatalogueOffer {
  storeId: string
  storeName: string
  priceCents: number
  regularPriceCents?: number | null
  loyaltyPriceCents?: number | null
  imageUrl?: string | null
  sourceUrl: string | null
  freshness: 'FRESH' | 'STALE' | 'EXPIRED'
  available: boolean
}

interface CatalogueSearchItem {
  id: string
  canonicalProductId: string
  title: string
  brand?: string | null
  packageValue?: string | null
  packageUnit?: string | null
  packCount?: number | null
  imageUrl?: string | null
  offers: CatalogueOffer[]
}

interface ShoppingItem {
  id: string
  title: string
  qty?: string | null
  notes?: string | null
  status: 'ACTIVE' | 'DONE'
  quantityCount: number
  category?: string | null
  canonicalProductId?: string | null
  createdBy: { id: string; name: string; email: string }
  doneBy?: { id: string; name: string; email: string } | null
}

interface ShoppingList {
  id: string
  name: string
  householdId: string
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
}

interface ShoppingTemplateItem {
  id: string
  name: string
  quantity: number
  note?: string | null
  productId?: string | null
}

interface ShoppingTemplate {
  id: string
  name: string
  createdAt: string
  items: ShoppingTemplateItem[]
  /** Null when the template is imported by hand only. */
  recurrenceType?: 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY' | null
  daysOfWeek?: number[]
  intervalDays?: number | null
  anchorDate?: string | null
  dayOfMonth?: number | null
  autoListId?: string | null
}

type ListDialogMode = 'create' | 'rename' | 'archive' | 'delete' | null
type ShoppingTab = 'list' | 'compare' | 'offers'

function errorMessage(value: unknown, fallback: string) {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') return value.error
  return fallback
}

async function responseJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>
}

function money(cents: number) {
  return `${(cents / 100).toFixed(2)}€`
}

function packLabel(item: CatalogueSearchItem) {
  const size = item.packageValue && item.packageUnit ? `${item.packageValue}${item.packageUnit}` : ''
  const count = item.packCount && item.packCount > 1 ? `${item.packCount} pack` : ''
  return [item.brand, count, size].filter(Boolean).join(' · ') || 'Pack size not listed'
}

function bestFreshOffer(item: CatalogueSearchItem) {
  return item.offers.find(offer => offer.available && offer.freshness === 'FRESH')
}

function ProductThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
      {showImage
        ? <Image src={src!} alt={alt} width={64} height={64} className="h-full w-full object-contain p-1" onError={() => setFailed(true)} />
        : <Package className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />}
    </div>
  )
}

function matchLabel(item: ComparedItem | undefined, canonicalProductId?: string | null) {
  if (!item) return canonicalProductId ? 'Matched · price unavailable' : 'Not matched'
  if (item.matchStatus === 'UNMATCHED') return 'Not matched'
  if (item.matchStatus === 'NO_CURRENT_OFFERS') return 'No current offer'
  return 'Matched'
}

export default function ShoppingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [templates, setTemplates] = useState<ShoppingTemplate[]>([])
  const [tab, setTab] = useState<ShoppingTab>('list')
  const [listsLoading, setListsLoading] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const [comparison, setComparison] = useState<BasketComparison | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonError, setComparisonError] = useState('')
  const comparisonRequestId = useRef(0)

  const [offers, setOffers] = useState<SupermarketOffer[]>([])
  const [offersLoading, setOffersLoading] = useState(false)
  const [offersError, setOffersError] = useState('')
  const [addingOfferId, setAddingOfferId] = useState<string | null>(null)
  const [pricesLocked, setPricesLocked] = useState(false)
  // Catalogue features are deny-by-default until the server confirms consented retailers.
  const [comparisonAvailable, setComparisonAvailable] = useState(false)
  const [regionSupported, setRegionSupported] = useState(true)
  const offersLoadedRef = useRef(false)

  const [query, setQuery] = useState('')
  const [packNote, setPackNote] = useState('')
  const [quantityCount, setQuantityCount] = useState(1)
  const [searchResults, setSearchResults] = useState<CatalogueSearchItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [highlightedResult, setHighlightedResult] = useState(-1)
  const [composerBusy, setComposerBusy] = useState(false)
  const [matchingItem, setMatchingItem] = useState<{ id: string; title: string } | null>(null)
  const searchRequestId = useRef(0)
  const composerInputRef = useRef<HTMLInputElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const [filter, setFilter] = useState('')
  const [completedOpen, setCompletedOpen] = useState(false)
  const [updatingCounts, setUpdatingCounts] = useState<Set<string>>(new Set())
  const [categoryOrder, setCategoryOrder] = useState<ShoppingCategoryKey[]>(DEFAULT_SHOPPING_CATEGORY_ORDER)
  const [routeDialogOpen, setRouteDialogOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  /** Ticks made while offline that have not reached the server yet. */
  const [pendingWrites, setPendingWrites] = useState(0)
  const [online, setOnline] = useState(true)

  const [listDialog, setListDialog] = useState<ListDialogMode>(null)
  const [listName, setListName] = useState('')
  const [listDialogError, setListDialogError] = useState('')
  const [listDialogBusy, setListDialogBusy] = useState(false)

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateBusy, setTemplateBusy] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ShoppingTemplate | null>(null)
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<string[]>([])
  const [schedulingTemplate, setSchedulingTemplate] = useState<ShoppingTemplate | null>(null)

  const selectedList = lists.find(list => list.id === selectedListId)
  const archived = Boolean(selectedList?.archivedAt)

  const loadLists = useCallback(async () => {
    setListsLoading(true)
    try {
      const response = await fetch('/api/shopping/lists')
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not load shopping lists'))
      const nextLists = (data.lists || []) as ShoppingList[]
      setLists(nextLists)
      setSelectedListId(current => {
        if (current && nextLists.some(list => list.id === current)) return current
        return nextLists.find(list => !list.archivedAt)?.id || nextLists[0]?.id || ''
      })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load shopping lists')
    } finally {
      setListsLoading(false)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/shopping/templates')
      const data = await responseJson(response)
      if (response.ok) setTemplates((data.templates || []) as ShoppingTemplate[])
    } catch (error) {
      console.error('Failed to load shopping templates:', error)
    }
  }, [])

  const loadItems = useCallback(async (listId: string) => {
    if (!listId) {
      setItems([])
      return
    }
    setItemsLoading(true)
    try {
      const response = await fetch(`/api/shopping/items?listId=${encodeURIComponent(listId)}`)
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not load list items'))
      setItems((data.items || []) as ShoppingItem[])
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load list items')
    } finally {
      setItemsLoading(false)
    }
  }, [])

  const loadComparison = useCallback(async (listId: string) => {
    if (!listId) {
      setComparison(null)
      setComparisonError('')
      return
    }
    const requestId = ++comparisonRequestId.current
    setComparisonLoading(true)
    setComparisonError('')
    try {
      const response = await fetch(`/api/shopping/compare?listId=${encodeURIComponent(listId)}`)
      if (!response.ok) {
        const data = await responseJson(response)
        if (response.status === 503 && data.code === 'feature_unavailable') {
          if (requestId === comparisonRequestId.current) {
            setComparisonAvailable(false)
            setComparison(null)
          }
          return
        }
        if (response.status === 403 && (data.code === 'upgrade_required' || data.code === 'unavailable_region')) {
          if (requestId === comparisonRequestId.current) {
            if (data.code === 'unavailable_region') setRegionSupported(false)
            else setPricesLocked(true)
            setComparison(null)
          }
          return
        }
        throw new Error(errorMessage(data, 'Could not compare this list right now'))
      }
      const data = await response.json() as BasketComparison
      if (requestId === comparisonRequestId.current) setComparison(data)
    } catch (error) {
      if (requestId !== comparisonRequestId.current) return
      console.error('Failed to compare supermarket prices:', error)
      setComparisonError(error instanceof Error ? error.message : 'Could not compare this list right now')
    } finally {
      if (requestId === comparisonRequestId.current) setComparisonLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    void loadLists()
    void loadTemplates()
    void (async () => {
      try {
        const response = await fetch('/api/household/active')
        const data = await responseJson(response)
        if (response.ok) {
          setComparisonAvailable(data.priceComparisonAvailable === true)
          if (data.priceComparisonRegionSupported === false) setRegionSupported(false)
        }
      } catch {
        // Keep catalogue features hidden when availability cannot be confirmed.
      }
    })()
  }, [loadLists, loadTemplates, status])

  // Deep link target for the meal planner's "add the week and shop here" hand-off,
  // so arriving from Meals opens the list that was just filled, already on the
  // tab that answers "where do I buy this?".
  useEffect(() => {
    if (!router.isReady || listsLoading) return
    const requestedList = typeof router.query.list === 'string' ? router.query.list : ''
    const requestedTab = typeof router.query.tab === 'string' ? router.query.tab : ''
    if (!requestedList && !requestedTab) return

    if (requestedList && lists.some(list => list.id === requestedList)) setSelectedListId(requestedList)
    if (requestedTab === 'compare' || requestedTab === 'offers' || requestedTab === 'list') {
      setTab(requestedTab)
    }
    // Consume the params so a later refresh or back navigation does not snap the
    // user back to this list after they have moved on.
    void router.replace('/shopping', undefined, { shallow: true })
  }, [lists, listsLoading, router])

  useEffect(() => {
    if ((!comparisonAvailable || !regionSupported) && tab !== 'list') setTab('list')
  }, [comparisonAvailable, regionSupported, tab])

  useEffect(() => {
    setItems([])
    setComparison(null)
    setComparisonError('')
    setFilter('')
    setCompletedOpen(false)
    void loadItems(selectedListId)
    if (selectedListId) void (async () => {
      try {
        const response = await fetch(`/api/shopping/category-order?listId=${encodeURIComponent(selectedListId)}`)
        const data = await responseJson(response)
        if (response.ok) setCategoryOrder((data.order || DEFAULT_SHOPPING_CATEGORY_ORDER) as ShoppingCategoryKey[])
      } catch { /* The default route remains usable offline from this preference. */ }
    })()
  }, [loadItems, selectedListId])

  useEffect(() => {
    if (comparisonAvailable && regionSupported) void loadComparison(selectedListId)
  }, [comparisonAvailable, loadComparison, regionSupported, selectedListId])

  useEffect(() => {
    const cleanQuery = query.trim()
    if (pricesLocked || !comparisonAvailable || !regionSupported) {
      searchRequestId.current += 1
      setSearchResults([])
      setSearchError('')
      setSearchLoading(false)
      setHighlightedResult(-1)
      return
    }
    if (cleanQuery.length < 2) {
      searchRequestId.current += 1
      setSearchResults([])
      setSearchError('')
      setSearchLoading(false)
      setHighlightedResult(-1)
      return
    }
    const requestId = ++searchRequestId.current
    setSearchLoading(true)
    setSearchError('')
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/prices/search?q=${encodeURIComponent(cleanQuery)}`)
        const data = await responseJson(response)
        if (response.status === 503 && data.code === 'feature_unavailable') {
          if (requestId === searchRequestId.current) {
            setComparisonAvailable(false)
            setSearchResults([])
            setSearchLoading(false)
          }
          return
        }
        if (response.status === 403 && (data.code === 'upgrade_required' || data.code === 'unavailable_region')) {
          if (requestId === searchRequestId.current) {
            if (data.code === 'unavailable_region') setRegionSupported(false)
            else setPricesLocked(true)
            setSearchResults([])
            setSearchLoading(false)
          }
          return
        }
        if (!response.ok) throw new Error(errorMessage(data, 'Catalogue search is unavailable'))
        if (requestId !== searchRequestId.current) return
        setSearchResults((data.items || []) as CatalogueSearchItem[])
        setHighlightedResult(-1)
      } catch (error) {
        if (requestId !== searchRequestId.current) return
        setSearchResults([])
        setSearchError(error instanceof Error ? error.message : 'Catalogue search is unavailable')
      } finally {
        if (requestId === searchRequestId.current) setSearchLoading(false)
      }
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [comparisonAvailable, query, pricesLocked, regionSupported])

  const refreshComparison = useCallback(() => {
    if (comparisonAvailable) void loadComparison(selectedListId)
  }, [comparisonAvailable, loadComparison, selectedListId])

  // Pull in edits made by whoever else is shopping from this list. Archived
  // lists are read-only, so nobody can be changing them underneath us.
  const handleRemoteChange = useCallback(() => {
    void loadItems(selectedListId)
    refreshComparison()
  }, [loadItems, refreshComparison, selectedListId])

  useListSync(selectedListId, handleRemoteChange, status === 'authenticated' && !archived)

  // Flush anything queued while offline, then reload so the list reflects what
  // the server actually accepted rather than the optimistic local copy.
  useEffect(() => {
    setOnline(navigator.onLine)
    setPendingWrites(pendingCount())

    const flush = async () => {
      setOnline(true)
      if (pendingCount() === 0) return
      const result = await replayOutbox()
      setPendingWrites(result.remaining)
      if (result.dropped > 0) {
        setNotice(
          `${result.dropped} offline ${result.dropped === 1 ? 'change' : 'changes'} could not be applied — those items were changed or removed by someone else.`,
        )
      }
      if (result.applied > 0 || result.dropped > 0) void loadItems(selectedListId)
    }

    const handleOnline = () => void flush()
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (navigator.onLine) void flush()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadItems, selectedListId])

  const loadOffers = useCallback(async () => {
    setOffersLoading(true)
    setOffersError('')
    try {
      const response = await fetch('/api/prices/offers')
      const data = await responseJson(response)
      if (response.status === 503 && data.code === 'feature_unavailable') {
        setComparisonAvailable(false)
        offersLoadedRef.current = true
        return
      }
      if (response.status === 403 && (data.code === 'upgrade_required' || data.code === 'unavailable_region')) {
        if (data.code === 'unavailable_region') setRegionSupported(false)
        else setPricesLocked(true)
        offersLoadedRef.current = true
        return
      }
      if (!response.ok) throw new Error(errorMessage(data, 'Could not load supermarket offers'))
      setOffers((data.offers || []) as SupermarketOffer[])
      offersLoadedRef.current = true
    } catch (error) {
      setOffersError(error instanceof Error ? error.message : 'Could not load supermarket offers')
    } finally {
      setOffersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'offers' && !offersLoadedRef.current && !offersLoading) void loadOffers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadOffers])

  const addOfferToList = useCallback(async (offer: SupermarketOffer) => {
    if (!selectedListId || archived) return
    setAddingOfferId(offer.productId)
    setNotice('')
    try {
      const response = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedListId,
          title: offer.title,
          quantityCount: 1,
          canonicalProductId: offer.canonicalProductId || undefined,
          imageUrl: offer.imageUrl || undefined,
          productUrl: offer.sourceUrl || undefined,
          store: offer.storeName,
        }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not add this offer'))
      setItems(current => [data.item as unknown as ShoppingItem, ...current])
      toast.success(`Added ${offer.title} to ${selectedList?.name || 'the list'}`)
      refreshComparison()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add this offer')
    } finally {
      setAddingOfferId(null)
    }
  }, [archived, refreshComparison, selectedList, selectedListId])

  const finishComposer = useCallback(() => {
    setQuery('')
    setPackNote('')
    setQuantityCount(1)
    setSearchResults([])
    setSearchError('')
    setHighlightedResult(-1)
    setMatchingItem(null)
    window.setTimeout(() => {
      if (restoreFocusRef.current) restoreFocusRef.current.focus()
      else composerInputRef.current?.focus()
      restoreFocusRef.current = null
    }, 0)
  }, [])

  const addManualItem = useCallback(async () => {
    const title = query.trim()
    if (!title || !selectedListId || archived || matchingItem) return
    setComposerBusy(true)
    setNotice('')
    try {
      const response = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedListId, title, qty: packNote.trim() || undefined, quantityCount }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not add this item'))
      setItems(current => [data.item as unknown as ShoppingItem, ...current])
      finishComposer()
      refreshComparison()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add this item')
    } finally {
      setComposerBusy(false)
    }
  }, [archived, finishComposer, matchingItem, packNote, quantityCount, query, refreshComparison, selectedListId])

  const selectCatalogueItem = useCallback(async (catalogueItem: CatalogueSearchItem) => {
    if (!selectedListId || archived) return
    setComposerBusy(true)
    setNotice('')
    try {
      let response: Response
      if (matchingItem) {
        response = await fetch(`/api/shopping/items/${encodeURIComponent(matchingItem.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canonicalProductId: catalogueItem.canonicalProductId }),
        })
      } else {
        const offer = bestFreshOffer(catalogueItem)
        response = await fetch('/api/shopping/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listId: selectedListId,
            title: catalogueItem.title,
            qty: packNote.trim() || undefined,
            quantityCount,
            canonicalProductId: catalogueItem.canonicalProductId,
            imageUrl: catalogueItem.imageUrl || offer?.imageUrl,
            productUrl: offer?.sourceUrl,
            store: offer?.storeName,
          }),
        })
      }
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, matchingItem ? 'Could not match this item' : 'Could not add this product'))
      const updatedItem = data.item as unknown as ShoppingItem
      setItems(current => matchingItem
        ? current.map(item => item.id === matchingItem.id ? updatedItem : item)
        : [updatedItem, ...current])
      finishComposer()
      refreshComparison()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update this item')
    } finally {
      setComposerBusy(false)
    }
  }, [archived, finishComposer, matchingItem, packNote, quantityCount, refreshComparison, selectedListId])

  const cancelMatch = useCallback(() => {
    finishComposer()
  }, [finishComposer])

  const openMatch = useCallback((itemId: string, title: string) => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setTab('list')
    setMatchingItem({ id: itemId, title })
    setQuery(title)
    setPackNote('')
    setQuantityCount(1)
    window.setTimeout(() => composerInputRef.current?.focus(), 0)
  }, [])

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && searchResults.length > 0) {
      event.preventDefault()
      setHighlightedResult(current => Math.min(Math.min(searchResults.length, 12) - 1, current + 1))
    } else if (event.key === 'ArrowUp' && searchResults.length > 0) {
      event.preventDefault()
      setHighlightedResult(current => Math.max(-1, current - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightedResult >= 0 && searchResults[highlightedResult]) void selectCatalogueItem(searchResults[highlightedResult])
      else if (!matchingItem) void addManualItem()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (matchingItem) cancelMatch()
      else {
        setSearchResults([])
        setHighlightedResult(-1)
        composerInputRef.current?.focus()
      }
    }
  }

  // Ticking an item is the one thing people do standing in a shop, usually on a
  // weak connection. Waiting for the round trip before the checkbox moved made
  // the app feel broken and produced double taps, so the tick lands immediately
  // and rolls back only if the server rejects it.
  const toggleItem = async (item: ShoppingItem) => {
    if (archived) return
    const nextStatus = item.status === 'ACTIVE' ? 'DONE' : 'ACTIVE'
    const previous = items
    setItems(current => current.map(existing => (
      existing.id === item.id ? { ...existing, status: nextStatus } as ShoppingItem : existing
    )))
    try {
      const response = await fetch(`/api/shopping/items/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not update this item'))
      // Replace with the server's row so doneBy/doneAt and any server-side
      // normalisation are reflected rather than the optimistic guess.
      setItems(current => current.map(existing => existing.id === item.id ? data.item as unknown as ShoppingItem : existing))
      refreshComparison()
    } catch (error) {
      // A failed *request* (offline in an aisle) is different from a rejected
      // one: keep the tick on screen and queue it, rather than snapping the
      // checkbox back and losing what the shopper just did.
      if (!navigator.onLine) {
        queueOperation({ kind: 'set-status', itemId: item.id, status: nextStatus, queuedAt: Date.now() })
        setPendingWrites(pendingCount())
        return
      }
      setItems(previous)
      setNotice(error instanceof Error ? error.message : 'Could not update this item')
    }
  }

  const deleteItem = async (itemId: string) => {
    if (archived) return
    const previous = items
    setItems(current => current.filter(item => item.id !== itemId))
    try {
      const response = await fetch(`/api/shopping/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not delete this item'))
      refreshComparison()
    } catch (error) {
      setItems(previous)
      setNotice(error instanceof Error ? error.message : 'Could not delete this item')
    }
  }

  const updateItemCount = async (item: ShoppingItem, nextCount: number) => {
    const normalizedCount = Math.max(1, Math.min(999, nextCount))
    if (archived || normalizedCount === item.quantityCount || updatingCounts.has(item.id)) return
    const previous = items
    setItems(current => current.map(existing => (
      existing.id === item.id ? { ...existing, quantityCount: normalizedCount } : existing
    )))
    setUpdatingCounts(current => new Set(current).add(item.id))
    try {
      const response = await fetch(`/api/shopping/items/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityCount: normalizedCount }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not change the quantity'))
      setItems(current => current.map(existing => existing.id === item.id ? data.item as unknown as ShoppingItem : existing))
      refreshComparison()
    } catch (error) {
      setItems(previous)
      setNotice(error instanceof Error ? error.message : 'Could not change the quantity')
    } finally {
      setUpdatingCounts(current => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    }
  }

  const updateItemCategory = async (item: ShoppingItem, category: ShoppingCategoryKey) => {
    if (archived || normalizeShoppingItemCategory(item.category) === category) return
    const previous = items
    setItems(current => current.map(existing => (
      existing.id === item.id ? { ...existing, category } as ShoppingItem : existing
    )))
    try {
      const response = await fetch(`/api/shopping/items/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category }) })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not change the category'))
      setItems(current => current.map(existing => existing.id === item.id ? data.item as unknown as ShoppingItem : existing))
    } catch (error) {
      setItems(previous)
      setNotice(error instanceof Error ? error.message : 'Could not change the category')
    }
  }

  const openListDialog = (mode: Exclude<ListDialogMode, null>) => {
    setListDialogError('')
    setListName(mode === 'rename' ? selectedList?.name || '' : '')
    setListDialog(mode)
  }

  const submitListDialog = async () => {
    if (!listDialog) return
    if ((listDialog === 'create' || listDialog === 'rename') && !listName.trim()) {
      setListDialogError('Enter a list name.')
      return
    }
    setListDialogBusy(true)
    setListDialogError('')
    try {
      const isCreate = listDialog === 'create'
      const response = await fetch(isCreate
        ? '/api/shopping/lists'
        : `/api/shopping/lists/${encodeURIComponent(selectedListId)}${listDialog === 'delete' ? '?force=true' : ''}`, {
        method: isCreate ? 'POST' : listDialog === 'delete' ? 'DELETE' : 'PATCH',
        headers: listDialog === 'delete' ? undefined : { 'Content-Type': 'application/json' },
        body: isCreate
          ? JSON.stringify({ name: listName.trim() })
          : listDialog === 'rename'
            ? JSON.stringify({ name: listName.trim() })
            : listDialog === 'archive'
              ? JSON.stringify({ archive: true })
              : undefined,
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not update this list'))
      if (isCreate) {
        const created = data.list as unknown as ShoppingList
        setLists(current => [created, ...current])
        setSelectedListId(created.id)
      } else if (listDialog === 'delete') {
        const remaining = lists.filter(list => list.id !== selectedListId)
        setLists(remaining)
        setSelectedListId(remaining.find(list => !list.archivedAt)?.id || remaining[0]?.id || '')
      } else {
        const updated = data.list as unknown as ShoppingList
        setLists(current => current.map(list => list.id === updated.id ? updated : list))
      }
      setListDialog(null)
    } catch (error) {
      setListDialogError(error instanceof Error ? error.message : 'Could not update this list')
    } finally {
      setListDialogBusy(false)
    }
  }

  const restoreList = async () => {
    if (!selectedListId) return
    try {
      const response = await fetch(`/api/shopping/lists/${encodeURIComponent(selectedListId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unarchive: true }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not restore this list'))
      const updated = data.list as unknown as ShoppingList
      setLists(current => current.map(list => list.id === updated.id ? updated : list))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not restore this list')
    }
  }

  const createTemplate = async () => {
    const activeItems = items.filter(item => item.status === 'ACTIVE')
    if (!templateName.trim() || activeItems.length === 0) return
    setTemplateBusy(true)
    try {
      const response = await fetch('/api/shopping/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          items: activeItems.map(item => ({
            name: item.title,
            quantity: item.quantityCount,
            productId: item.canonicalProductId || undefined,
            note: item.qty || undefined,
          })),
        }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not save this template'))
      setTemplates(current => [data.template as unknown as ShoppingTemplate, ...current])
      setTemplateName('')
      setTemplateDialogOpen(false)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save this template')
    } finally {
      setTemplateBusy(false)
    }
  }

  const openTemplateImport = (template: ShoppingTemplate) => {
    setSelectedTemplate(template)
    setSelectedTemplateItems(template.items.map(item => item.id))
  }

  const importTemplate = async () => {
    if (!selectedTemplate || !selectedListId || archived) return
    setTemplateBusy(true)
    try {
      const response = await fetch('/api/shopping/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedListId, templateId: selectedTemplate.id, selectedItems: selectedTemplateItems }),
      })
      const data = await responseJson(response)
      if (!response.ok) throw new Error(errorMessage(data, 'Could not import this template'))
      setItems(current => [...(data.items as unknown as ShoppingItem[]), ...current])
      setSelectedTemplate(null)
      setSelectedTemplateItems([])
      refreshComparison()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not import this template')
    } finally {
      setTemplateBusy(false)
    }
  }

  const filteredItems = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase()
    return normalizedFilter ? items.filter(item => item.title.toLowerCase().includes(normalizedFilter)) : items
  }, [filter, items])
  const activeItems = filteredItems.filter(item => item.status === 'ACTIVE')
  const doneItems = filteredItems.filter(item => item.status === 'DONE')
  const totalActive = items.filter(item => item.status === 'ACTIVE').length
  const totalDone = items.filter(item => item.status === 'DONE').length
  const totalItems = totalActive + totalDone
  const progress = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0
  const comparisonItems = useMemo(() => new Map((comparison?.items || []).map(item => [item.id, item])), [comparison])
  const activeGroups = useMemo(() => categoryOrder
    .map(category => ({ category, items: activeItems.filter(item => normalizeShoppingItemCategory(item.category) === category) }))
    .filter(group => group.items.length > 0), [activeItems, categoryOrder])

  if (status === 'loading') {
    return <ModernAppShell title="Shopping"><div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading shopping lists…</div></ModernAppShell>
  }

  if (status === 'unauthenticated') {
    return <ModernAppShell title="Shopping"><div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Sign in to access your shopping lists.</div></ModernAppShell>
  }

  return (
    <ModernAppShell title="Shopping">
      <div className="mx-auto max-w-6xl space-y-4 pb-12">
        <header data-tour="page-shopping" className="space-y-3 rounded-xl border bg-card p-3 shadow-soft-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <label htmlFor="shopping-list-select" className="sr-only">Current shopping list</label>
              <select
                id="shopping-list-select"
                value={selectedListId}
                onChange={event => setSelectedListId(event.target.value)}
                disabled={listsLoading || lists.length === 0}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-w-xs"
              >
                {lists.filter(list => !list.archivedAt).length > 0 && <optgroup label="Active lists">{lists.filter(list => !list.archivedAt).map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</optgroup>}
                {lists.filter(list => list.archivedAt).length > 0 && <optgroup label="Archived lists">{lists.filter(list => list.archivedAt).map(list => <option key={list.id} value={list.id}>{list.name} — archived</option>)}</optgroup>}
              </select>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-3" aria-label={`${totalDone} of ${totalItems} items completed`}>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex justify-between gap-3 text-xs text-muted-foreground"><span>{totalActive} to buy</span><span>{totalDone} done</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
              </div>
              <span className="w-10 text-right text-sm font-semibold">{progress}%</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={!selectedListId || archived} onClick={() => setAiDialogOpen(true)}><Sparkles />Tidy with AI</Button>
              <Button type="button" variant="outline" className="min-h-11" disabled={!selectedListId} onClick={() => setRouteDialogOpen(true)}><MapPinned />Aisle route</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="min-h-11"><ListChecks />List<ChevronDown /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openListDialog('create')}><Plus />New list</DropdownMenuItem>
                  <DropdownMenuItem disabled={!selectedListId || archived} onSelect={() => openListDialog('rename')}><Pencil />Rename</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {archived ? (
                    <DropdownMenuItem onSelect={() => void restoreList()}><ArchiveRestore />Restore list</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled={!selectedListId} onSelect={() => openListDialog('archive')}><Archive />Archive</DropdownMenuItem>
                  )}
                  <DropdownMenuItem disabled={!selectedListId} onSelect={() => openListDialog('delete')} className="text-destructive focus:text-destructive"><Trash2 />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="min-h-11"><FileDown />Templates<ChevronDown /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem disabled={archived || totalActive === 0} onSelect={() => setTemplateDialogOpen(true)}><FilePlus2 />Save current list</DropdownMenuItem>
                  {templates.length > 0 && <DropdownMenuSeparator />}
                  {templates.length > 0 && <DropdownMenuLabel>Import template</DropdownMenuLabel>}
                  {templates.map(template => <DropdownMenuItem key={template.id} disabled={archived || !selectedListId} onSelect={() => openTemplateImport(template)}><FileDown />{template.name}<span className="ml-auto text-xs text-muted-foreground">{template.recurrenceType ? 'auto' : template.items.length}</span></DropdownMenuItem>)}
                  {templates.length === 0 && <DropdownMenuItem disabled>No saved templates</DropdownMenuItem>}
                  {templates.length > 0 && <DropdownMenuSeparator />}
                  {templates.length > 0 && <DropdownMenuLabel>Repeat automatically</DropdownMenuLabel>}
                  {templates.map(template => (
                    <DropdownMenuItem key={`schedule-${template.id}`} onSelect={() => setSchedulingTemplate(template)}>
                      <CalendarClock />{template.name}
                      {template.recurrenceType && <span className="ml-auto text-xs text-module-shopping">on</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {comparisonAvailable && regionSupported && <div className="grid grid-cols-3 rounded-lg bg-muted p-1" role="tablist" aria-label="Shopping view">
            <button type="button" role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')} className={`min-h-11 rounded-md px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 ${tab === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><ListChecks className="mr-2 inline h-4 w-4" />List</button>
            <button type="button" role="tab" aria-selected={tab === 'compare'} onClick={() => setTab('compare')} className={`min-h-11 rounded-md px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 ${tab === 'compare' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Scale className="mr-2 inline h-4 w-4" />Compare{comparison && comparison.items.some(item => item.matchStatus !== 'MATCHED') && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-500" />}</button>
            <button type="button" role="tab" aria-selected={tab === 'offers'} onClick={() => setTab('offers')} className={`min-h-11 rounded-md px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 ${tab === 'offers' ? 'bg-background text-module-shopping shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Percent className="mr-2 inline h-4 w-4" />Offers</button>
          </div>}
        </header>

        {(!online || pendingWrites > 0) && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground"
          >
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {online
                ? `Reconnecting — ${pendingWrites} ${pendingWrites === 1 ? 'change' : 'changes'} still to send.`
                : pendingWrites > 0
                  ? `Offline — ${pendingWrites} ${pendingWrites === 1 ? 'change is' : 'changes are'} saved on this device and will sync when you get signal.`
                  : 'Offline — you can still tick items off. Changes sync when you get signal.'}
            </span>
          </div>
        )}
        {notice && <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="min-h-11 min-w-11 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Dismiss message"><X className="mx-auto h-4 w-4" /></button></div>}

        {archived && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>This list is archived and read-only.</span>
            <Button type="button" variant="outline" onClick={() => void restoreList()} className="min-h-11 bg-background"><ArchiveRestore />Restore to edit</Button>
          </div>
        )}

        {!selectedListId && !listsLoading ? (
          lists.length === 0 ? (
            <ModuleFirstRun
              module="shopping"
              title="Create your first shopping list"
              action={<Button type="button" onClick={() => openListDialog('create')} className="min-h-11"><Plus />New list</Button>}
            />
          ) : (
            // Lists exist, just none picked — not a first run, so no explainer.
            <EmptyState
              module="shopping"
              icon={ShoppingBasket}
              title="Pick a list"
              description="Choose one of your shopping lists above to see what is on it."
            />
          )
        ) : tab === 'list' ? (
          <div className="space-y-4" role="tabpanel" aria-label="Shopping list">
            {!archived && selectedListId && (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  {matchingItem && (
                    <div className="mb-3 flex flex-col gap-2 rounded-lg bg-secondary p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm"><span className="font-semibold">Match product:</span> {matchingItem.title}</div>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelMatch} className="min-h-11 self-start sm:self-auto"><X />Cancel</Button>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={composerInputRef}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder={matchingItem ? 'Search for the exact catalogue product' : comparisonAvailable && regionSupported ? 'Search products or type an item' : 'Type an item to add'}
                        aria-label={matchingItem ? `Search catalogue to match ${matchingItem.title}` : 'Add a shopping item'}
                        aria-controls="catalogue-results"
                        aria-activedescendant={highlightedResult >= 0 ? `catalogue-result-${highlightedResult}` : undefined}
                        autoComplete="off"
                        className="h-11 pl-10 pr-10"
                      />
                      {searchLoading && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" aria-label="Searching catalogue" />}
                    </div>
                    {!matchingItem && (
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                        <Input value={packNote} onChange={event => setPackNote(event.target.value)} placeholder="Pack note (optional)" aria-label="Optional pack note" className="h-11" />
                        <Input type="number" min={1} max={999} value={quantityCount} onChange={event => setQuantityCount(Math.max(1, Math.min(999, Number(event.target.value) || 1)))} aria-label="Quantity count" className="h-11" />
                        <Button type="button" onClick={() => void addManualItem()} disabled={!query.trim() || composerBusy} className="min-h-11"><Plus />Add as written</Button>
                      </div>
                    )}
                  </div>

                  {comparisonAvailable && regionSupported && (query.trim().length >= 2 || searchError) && (
                    <div id="catalogue-results" role="listbox" aria-label="Catalogue results" className="mt-4 overflow-hidden rounded-lg border">
                      {searchError && <div className="border-b bg-amber-50 p-3 text-sm text-amber-800">{searchError}. You can still add the item as written.</div>}
                      {!searchLoading && !searchError && searchResults.length === 0 && <div className="p-4 text-sm text-muted-foreground">No exact catalogue products found. Add the item as written instead.</div>}
                      {searchResults.slice(0, 12).map((result, index) => {
                        const offer = bestFreshOffer(result)
                        const storeOffers = result.offers
                          .filter(item => item.available && item.freshness === 'FRESH')
                          .filter((item, offerIndex, all) => all.findIndex(candidate => candidate.storeId === item.storeId) === offerIndex)
                        return (
                          <div id={`catalogue-result-${index}`} role="option" aria-selected={highlightedResult === index} key={result.canonicalProductId} className={`flex items-center gap-3 border-b p-3 last:border-b-0 ${highlightedResult === index ? 'bg-secondary' : 'bg-background'}`}>
                            <ProductThumbnail src={result.imageUrl} alt="" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{result.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{packLabel(result)}</div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {storeOffers.map(item => (
                                  <span key={item.storeId} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                                    {item.storeName} · {money(item.priceCents)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold text-primary">{offer ? money(offer.priceCents) : 'No fresh price'}</div>
                              {offer && <div className="text-xs text-muted-foreground">{offer.storeName}</div>}
                            </div>
                            <Button type="button" variant="outline" size="sm" disabled={composerBusy} onClick={() => void selectCatalogueItem(result)} className="min-h-11 shrink-0">{matchingItem ? 'Match' : 'Add'}</Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filter this list" aria-label="Filter shopping items" className="h-11 pl-10" />
            </div>

            <Card>
              <CardContent className="p-0">
                {itemsLoading ? (
                  <div className="flex items-center justify-center p-10 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading items…</div>
                ) : activeItems.length === 0 ? (
                  // Transient, not first-run: the list exists, it just has nothing
                  // active on it right now. No "what is shopping for" explainer.
                  <EmptyState
                    className="border-0 bg-transparent"
                    module="shopping"
                    icon={filter ? Search : Check}
                    title={filter ? 'No matching active items' : 'Nothing left to buy'}
                    description={filter ? 'Try a different filter.' : totalDone > 0 ? 'Everything on this list is complete.' : archived ? 'This archived list is empty.' : 'Add an item above to get started.'}
                  />
                ) : (
                  <div>
                    {activeGroups.map(group => <section key={group.category} aria-labelledby={`shopping-category-${group.category}`}>
                      <div id={`shopping-category-${group.category}`} className="border-b border-t bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground first:border-t-0 sm:px-5">{shoppingCategoryLabel(group.category)} <span className="ml-1 font-normal">{group.items.length}</span></div>
                      <div className="divide-y">{group.items.map(item => <ShoppingItemRow key={item.id} item={item} comparisonItem={comparisonItems.get(item.id)} archived={archived} updating={updatingCounts.has(item.id)} showPrices={comparisonAvailable && !pricesLocked && regionSupported} onToggle={toggleItem} onCount={updateItemCount} onCategory={updateItemCategory} onMatch={openMatch} onDelete={deleteItem} />)}</div>
                    </section>)}
                  </div>
                )}

                {doneItems.length > 0 && (
                  <div className="border-t">
                    <button type="button" onClick={() => setCompletedOpen(open => !open)} className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5" aria-expanded={completedOpen}>Completed <span className="flex items-center gap-2 text-muted-foreground">{doneItems.length}<ChevronDown className={`h-4 w-4 transition-transform ${completedOpen ? 'rotate-180' : ''}`} /></span></button>
                    {completedOpen && <div className="divide-y border-t">{doneItems.map(item => <ShoppingItemRow key={item.id} item={item} archived={archived} updating={false} showPrices={comparisonAvailable && !pricesLocked && regionSupported} onToggle={toggleItem} onCount={updateItemCount} onCategory={updateItemCategory} onMatch={openMatch} onDelete={deleteItem} />)}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : tab === 'compare' ? (
          <div role="tabpanel" aria-label="Supermarket comparison" className={pricesLocked ? '' : 'rounded-xl border bg-card p-4 shadow-soft-sm sm:p-6'}>
            {pricesLocked ? (
              <UpgradeGate
                icon={Scale}
                module="shopping"
                title="Know the cheapest supermarket before you leave home"
                description="The Family plan prices your whole list across Malta's supermarket catalogues — every item compared per store, the cheapest basket highlighted, refreshed daily."
                bullets={['Smart, Greens & Welbee’s compared', 'Cheapest full basket highlighted', 'Prices refreshed every day']}
              />
            ) : (
              <SupermarketComparisonPanel comparison={comparison} loading={comparisonLoading} error={comparisonError} onRetry={refreshComparison} onMatch={openMatch} />
            )}
          </div>
        ) : (
          <div role="tabpanel" aria-label="Supermarket offers">
            {pricesLocked ? (
              <UpgradeGate
                icon={Percent}
                module="shopping"
                title="Today’s best supermarket offers, curated"
                description="The Family plan surfaces genuine deals from the supermarket catalogues — sorted by discount or by euros saved, addable to your list in one tap."
              />
            ) : (
              <OffersPanel
                offers={offers}
                loading={offersLoading}
                error={offersError}
                canAdd={Boolean(selectedListId) && !archived}
                addingProductId={addingOfferId}
                onRetry={() => void loadOffers()}
                onAdd={offer => void addOfferToList(offer)}
              />
            )}
          </div>
        )}
      </div>

      <Dialog open={listDialog !== null} onOpenChange={open => !open && setListDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{listDialog === 'create' ? 'Create shopping list' : listDialog === 'rename' ? 'Rename shopping list' : listDialog === 'archive' ? 'Archive shopping list?' : 'Delete shopping list?'}</DialogTitle>
            <DialogDescription>{listDialog === 'create' ? 'Choose a short name everyone in the household will recognize.' : listDialog === 'rename' ? 'Update the name for everyone in this household.' : listDialog === 'archive' ? 'Archived lists stay available in read-only mode until restored.' : 'This permanently deletes the list and all of its items. This cannot be undone.'}</DialogDescription>
          </DialogHeader>
          {(listDialog === 'create' || listDialog === 'rename') && <Input autoFocus value={listName} onChange={event => setListName(event.target.value)} onKeyDown={event => event.key === 'Enter' && void submitListDialog()} maxLength={100} aria-label="List name" className="h-11" />}
          {listDialogError && <p className="text-sm text-destructive">{listDialogError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setListDialog(null)} className="min-h-11">Cancel</Button>
            <Button type="button" variant={listDialog === 'delete' ? 'destructive' : 'default'} onClick={() => void submitListDialog()} disabled={listDialogBusy} className="min-h-11">{listDialogBusy && <Loader2 className="animate-spin" />}{listDialog === 'create' ? 'Create' : listDialog === 'rename' ? 'Save' : listDialog === 'archive' ? 'Archive' : 'Delete permanently'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save as template</DialogTitle><DialogDescription>Save the {totalActive} active {totalActive === 1 ? 'item' : 'items'} in this list for quick reuse.</DialogDescription></DialogHeader>
          <Input autoFocus value={templateName} onChange={event => setTemplateName(event.target.value)} onKeyDown={event => event.key === 'Enter' && void createTemplate()} placeholder="Template name" aria-label="Template name" className="h-11" />
          <DialogFooter><Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)} className="min-h-11">Cancel</Button><Button type="button" onClick={() => void createTemplate()} disabled={!templateName.trim() || templateBusy} className="min-h-11">{templateBusy && <Loader2 className="animate-spin" />}Save template</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedTemplate !== null} onOpenChange={open => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import {selectedTemplate?.name}</DialogTitle><DialogDescription>Select the items to add to {selectedList?.name || 'this list'}.</DialogDescription></DialogHeader>
          <div className="space-y-1 rounded-lg border p-2">
            {selectedTemplate?.items.map(item => (
              <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-secondary">
                <input type="checkbox" checked={selectedTemplateItems.includes(item.id)} onChange={event => setSelectedTemplateItems(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} className="h-4 w-4 accent-primary" />
                <span className="min-w-0 flex-1 text-sm">{item.name}</span><span className="text-xs text-muted-foreground">×{item.quantity}</span>
              </label>
            ))}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setSelectedTemplate(null)} className="min-h-11">Cancel</Button><Button type="button" onClick={() => void importTemplate()} disabled={selectedTemplateItems.length === 0 || templateBusy} className="min-h-11">{templateBusy && <Loader2 className="animate-spin" />}Import {selectedTemplateItems.length}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <TemplateScheduleDialog
        template={schedulingTemplate}
        lists={lists}
        onClose={() => setSchedulingTemplate(null)}
        onSaved={() => void loadTemplates()}
      />
      <ShoppingRouteDialog listId={selectedListId} open={routeDialogOpen} onOpenChange={setRouteDialogOpen} order={categoryOrder} onOrderChange={setCategoryOrder} />
      <ShoppingAiDialog listId={selectedListId} listName={selectedList?.name || 'this list'} open={aiDialogOpen} onOpenChange={setAiDialogOpen} onApplied={() => loadItems(selectedListId)} />
    </ModernAppShell>
  )
}

function ShoppingItemRow({ item, comparisonItem, archived, updating, showPrices, onToggle, onCount, onCategory, onMatch, onDelete }: {
  item: ShoppingItem
  comparisonItem?: ComparedItem
  archived: boolean
  updating: boolean
  showPrices: boolean
  onToggle: (item: ShoppingItem) => Promise<void>
  onCount: (item: ShoppingItem, count: number) => Promise<void>
  onCategory: (item: ShoppingItem, category: ShoppingCategoryKey) => Promise<void>
  onMatch: (id: string, title: string) => void
  onDelete: (id: string) => Promise<void>
}) {
  const freshOffer = comparisonItem?.offers.find(offer => offer.available && offer.freshness === 'FRESH')
  const done = item.status === 'DONE'
  return (
    <div className="flex items-start gap-3 px-3 py-3 sm:px-5">
      <button type="button" onClick={() => void onToggle(item)} disabled={archived} className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${done ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:border-primary'}`} aria-label={done ? `Mark ${item.title} active` : `Mark ${item.title} complete`}>
        {done && <Check className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`font-medium ${done ? 'text-muted-foreground line-through' : ''}`}>{item.title}</span>
          {item.qty && <Badge variant="outline" className="font-normal">{item.qty}</Badge>}
        </div>
        {!done && showPrices && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className={comparisonItem?.matchStatus === 'MATCHED' ? 'text-green-700' : comparisonItem?.matchStatus === 'NO_CURRENT_OFFERS' ? 'text-amber-700' : ''}>{matchLabel(comparisonItem, item.canonicalProductId)}</span>
            {freshOffer && <><span aria-hidden="true">·</span><span className="font-medium text-foreground">{money(freshOffer.priceCents)}</span><span>at {freshOffer.storeName}</span></>}
          </div>
        )}
        {done && item.doneBy?.name && <div className="mt-1 text-xs text-muted-foreground">Completed by {item.doneBy.name}</div>}
        {!done && <select value={normalizeShoppingItemCategory(item.category)} onChange={event => void onCategory(item, event.target.value as ShoppingCategoryKey)} disabled={archived} aria-label={`Category for ${item.title}`} className="mt-2 h-8 max-w-44 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {DEFAULT_SHOPPING_CATEGORY_ORDER.map(category => <option key={category} value={category}>{shoppingCategoryLabel(category)}</option>)}
        </select>}
      </div>
      {!done && (
        <div className="flex h-11 shrink-0 items-center rounded-md border bg-background">
          <button type="button" onClick={() => void onCount(item, item.quantityCount - 1)} disabled={archived || updating || item.quantityCount <= 1} className="flex h-11 w-10 items-center justify-center rounded-l-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40" aria-label={`Decrease ${item.title} quantity`}><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center text-sm font-semibold" aria-label={`${item.quantityCount} of ${item.title}`}>{updating ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : item.quantityCount}</span>
          <button type="button" onClick={() => void onCount(item, item.quantityCount + 1)} disabled={archived || updating || item.quantityCount >= 999} className="flex h-11 w-10 items-center justify-center rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40" aria-label={`Increase ${item.title} quantity`}><Plus className="h-4 w-4" /></button>
        </div>
      )}
      {!archived && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Actions for ${item.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!done && showPrices && <DropdownMenuItem onSelect={() => onMatch(item.id, item.title)}><RefreshCw />{item.canonicalProductId ? 'Rematch product' : 'Match product'}</DropdownMenuItem>}
            <DropdownMenuItem onSelect={() => void onDelete(item.id)} className="text-destructive focus:text-destructive"><Trash2 />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
