import type {
  MobileCreateShoppingItemResponse,
  MobileCreateShoppingListResponse,
  MobileShoppingItem,
  MobileShoppingItemsResponse,
  MobileShoppingList,
  MobileShoppingListsResponse,
  MobileUpdateShoppingItemResponse,
  MobileUpdateShoppingListResponse,
  MobileShoppingCategoryKey,
  MobileShoppingCategoryOrderResponse,
} from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthProvider'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import { categoryLabel, normalizeCategoryOrder, ShoppingAiSheet, ShoppingRouteSheet } from '@/ShoppingToolsSheets'
import { MOBILE_DEFAULT_SHOPPING_CATEGORY_ORDER, MOBILE_SHOPPING_CATEGORIES } from '@/shoppingCategories'
import {
  AppButton,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  SheetHeader,
  StatusPill,
  useResponsive,
} from '@/ui'

function ItemRow({ item, busy, onUpdate, onEdit }: {
  item: MobileShoppingItem
  busy: boolean
  onUpdate: (id: string, patch: { status?: 'ACTIVE' | 'DONE'; quantityCount?: number }) => Promise<void>
  onEdit: (item: MobileShoppingItem) => void
}) {
  const { colors } = useAppTheme()
  const done = item.status === 'DONE'
  return (
    <Card style={[styles.item, done && styles.itemDone]}>
      <Pressable
        accessibilityLabel={done ? 'Mark ' + item.title + ' active' : 'Mark ' + item.title + ' done'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: busy }}
        disabled={busy}
        onPress={() => void onUpdate(item.id, { status: done ? 'ACTIVE' : 'DONE' })}
        style={[styles.check, { borderColor: colors.shopping }, done && { backgroundColor: colors.shopping }]}
      >
        {done ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
      </Pressable>
      <Pressable accessibilityLabel={'Edit ' + item.title} onPress={() => onEdit(item)} style={styles.itemText}>
        <Text numberOfLines={2} style={[styles.itemTitle, { color: colors.text }, done && styles.doneText]}>{item.title}</Text>
        <Text numberOfLines={1} style={[styles.itemMeta, { color: colors.muted }]}>{categoryLabel(item.category)} · {item.qty || 'No unit or note'}</Text>
      </Pressable>
      <View style={[styles.stepper, { backgroundColor: colors.backgroundRaised }]}>
        <Pressable accessibilityLabel={'Decrease ' + item.title + ' quantity'} disabled={busy || item.quantityCount <= 1} onPress={() => void onUpdate(item.id, { quantityCount: item.quantityCount - 1 })} style={[styles.step, item.quantityCount <= 1 && styles.disabled]}><Ionicons name="remove" size={17} color={colors.text} /></Pressable>
        <Text style={[styles.count, { color: colors.text }]}>{item.quantityCount}</Text>
        <Pressable accessibilityLabel={'Increase ' + item.title + ' quantity'} disabled={busy || item.quantityCount >= 999} onPress={() => void onUpdate(item.id, { quantityCount: item.quantityCount + 1 })} style={[styles.step, item.quantityCount >= 999 && styles.disabled]}><Ionicons name="add" size={17} color={colors.text} /></Pressable>
      </View>
      <IconButton icon="ellipsis-horizontal" label={'Edit ' + item.title} disabled={busy} onPress={() => onEdit(item)} />
    </Card>
  )
}

export default function ShoppingScreen() {
  const { colors } = useAppTheme()
  const { compact } = useResponsive()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [lists, setLists] = useState<MobileShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [items, setItems] = useState<MobileShoppingItem[]>([])
  const [newListName, setNewListName] = useState('')
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [listName, setListName] = useState('')
  const [editingItem, setEditingItem] = useState<MobileShoppingItem | null>(null)
  const [editItemTitle, setEditItemTitle] = useState('')
  const [editItemQty, setEditItemQty] = useState('')
  const [editItemCategory, setEditItemCategory] = useState<MobileShoppingCategoryKey>('other')
  const [showNewList, setShowNewList] = useState(false)
  const [showListSettings, setShowListSettings] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [categoryOrder, setCategoryOrder] = useState<MobileShoppingCategoryKey[]>(MOBILE_DEFAULT_SHOPPING_CATEGORY_ORDER)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadLists = useCallback(async () => {
    if (!householdId) return
    const data = await request<MobileShoppingListsResponse>('/api/mobile/v1/shopping/lists?householdId=' + encodeURIComponent(householdId))
    setLists(data.lists)
    setSelectedListId(current => current && data.lists.some(list => list.id === current) ? current : data.lists[0]?.id ?? null)
  }, [householdId, request])

  useEffect(() => {
    setLoading(true)
    setError('')
    void loadLists().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load shopping lists.')).finally(() => setLoading(false))
  }, [loadLists])

  const loadItems = useCallback(async () => {
    if (!selectedListId) {
      setItems([])
      return
    }
    const data = await request<MobileShoppingItemsResponse>('/api/mobile/v1/shopping/lists/' + encodeURIComponent(selectedListId) + '/items')
    setItems(data.items)
    const route = await request<MobileShoppingCategoryOrderResponse>('/api/mobile/v1/shopping/category-order?listId=' + encodeURIComponent(selectedListId))
    setCategoryOrder(normalizeCategoryOrder(route.order))
  }, [request, selectedListId])

  useFocusEffect(useCallback(() => {
    setError('')
    void Promise.all([loadLists(), loadItems()]).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not refresh shopping.'))
  }, [loadItems, loadLists]))

  useEffect(() => {
    setError('')
    void loadItems().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load list items.'))
  }, [loadItems])

  useEffect(() => {
    setListName(lists.find(list => list.id === selectedListId)?.name ?? '')
  }, [lists, selectedListId])

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try { await Promise.all([loadLists(), loadItems()]) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh shopping.') }
    finally { setRefreshing(false) }
  }

  const createList = async () => {
    if (!householdId || !newListName.trim()) return
    setBusyId('new-list')
    setError('')
    try {
      const response = await request<MobileCreateShoppingListResponse>('/api/mobile/v1/shopping/lists', { method: 'POST', body: JSON.stringify({ householdId, name: newListName }) })
      setNewListName('')
      setLists(current => [response.list, ...current])
      setSelectedListId(response.list.id)
      setShowNewList(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the list.') }
    finally { setBusyId(null) }
  }

  const addItem = async () => {
    if (!selectedListId || !newItemTitle.trim()) return
    setBusyId('new-item')
    setError('')
    try {
      const response = await request<MobileCreateShoppingItemResponse>('/api/mobile/v1/shopping/lists/' + encodeURIComponent(selectedListId) + '/items', { method: 'POST', body: JSON.stringify({ title: newItemTitle, qty: newItemQty }) })
      setNewItemTitle('')
      setNewItemQty('')
      setItems(current => [response.item, ...current])
      setLists(current => current.map(list => list.id === selectedListId ? { ...list, activeItemCount: list.activeItemCount + 1 } : list))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add the item.') }
    finally { setBusyId(null) }
  }

  const updateItem = async (id: string, patch: { status?: 'ACTIVE' | 'DONE'; quantityCount?: number }) => {
    setBusyId(id)
    setError('')
    try {
      const response = await request<MobileUpdateShoppingItemResponse>('/api/mobile/v1/shopping/items/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(patch) })
      setItems(current => current.map(item => item.id === id ? response.item : item))
      await loadLists()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the item.') }
    finally { setBusyId(null) }
  }

  const deleteItem = (item: MobileShoppingItem) => Alert.alert('Delete item?', 'Remove “' + item.title + '” from this list?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => {
      setBusyId(item.id)
      setError('')
      void request<{ ok: true }>('/api/mobile/v1/shopping/items/' + encodeURIComponent(item.id), { method: 'DELETE' })
        .then(() => { setEditingItem(null); setItems(current => current.filter(candidate => candidate.id !== item.id)); return loadLists() })
        .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not delete the item.'))
        .finally(() => setBusyId(null))
    } },
  ])

  const renameList = async () => {
    if (!selectedListId || !listName.trim()) return
    setBusyId('edit-list')
    setError('')
    try {
      const response = await request<MobileUpdateShoppingListResponse>('/api/mobile/v1/shopping/lists/' + encodeURIComponent(selectedListId), { method: 'PATCH', body: JSON.stringify({ name: listName }) })
      setLists(current => current.map(list => list.id === selectedListId ? { ...list, ...response.list } : list))
      setShowListSettings(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not rename the list.') }
    finally { setBusyId(null) }
  }

  const deleteList = () => {
    const list = lists.find(candidate => candidate.id === selectedListId)
    if (!list) return
    Alert.alert('Delete list?', 'Delete “' + list.name + '” and all of its items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setBusyId('edit-list')
        setError('')
        void request<{ ok: true }>('/api/mobile/v1/shopping/lists/' + encodeURIComponent(list.id), { method: 'DELETE' })
          .then(() => {
            const remaining = lists.filter(candidate => candidate.id !== list.id)
            setShowListSettings(false)
            setItems([])
            setLists(remaining)
            setSelectedListId(remaining[0]?.id ?? null)
          })
          .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not delete the list.'))
          .finally(() => setBusyId(null))
      } },
    ])
  }

  const openItemEdit = (item: MobileShoppingItem) => {
    setEditingItem(item)
    setEditItemTitle(item.title)
    setEditItemQty(item.qty || '')
    setEditItemCategory(item.category || 'other')
  }
  const saveItemEdit = async () => {
    if (!editingItem || !editItemTitle.trim()) return
    setBusyId(editingItem.id)
    setError('')
    try {
      const response = await request<MobileUpdateShoppingItemResponse>('/api/mobile/v1/shopping/items/' + encodeURIComponent(editingItem.id), { method: 'PATCH', body: JSON.stringify({ title: editItemTitle, qty: editItemQty || null, category: editItemCategory }) })
      setItems(current => current.map(item => item.id === editingItem.id ? response.item : item))
      setEditingItem(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not edit the item.') }
    finally { setBusyId(null) }
  }

  if (!householdId) return <Screen><EmptyState icon="cart-outline" title="Choose a household" message="Shopping lists belong to a household." /></Screen>
  if (loading) return <LoadingState label="Loading shopping lists…" />

  const activeItems = items.filter(item => item.status === 'ACTIVE')
  const doneItems = items.filter(item => item.status === 'DONE')
  const selected = lists.find(list => list.id === selectedListId)
  const activeGroups = categoryOrder.map(category => ({ category, items: activeItems.filter(item => (item.category || 'other') === category) })).filter(group => group.items.length)

  return (
    <>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
          <PageHeader eyebrow="SHOPPING" title="Ready for the next shop" subtitle="Shared lists stay in sync across the whole household." action={<IconButton filled icon="add" label="New list" onPress={() => setShowNewList(true)} />} />
          <ErrorBanner message={error} />
          {lists.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listPicker}>{lists.map(list => <Chip key={list.id} label={list.name + ' · ' + list.activeItemCount} selected={list.id === selectedListId} onPress={() => setSelectedListId(list.id)} tone={colors.shopping} />)}</ScrollView> : null}

          {!lists.length ? <EmptyState icon="basket-outline" title="Create your first list" message="Start with something familiar, such as Weekly shop." action={<AppButton label="Create a list" icon="add" onPress={() => setShowNewList(true)} />} /> : null}

          {selected ? <>
            <Card tone="primary" style={styles.listSummary}>
              <View style={styles.summaryRow}><View style={styles.flex}><Text style={[styles.listTitle, { color: colors.text }]}>{selected.name}</Text><Text style={[styles.listSubtitle, { color: colors.muted }]}>{activeItems.length} to buy · {doneItems.length} completed</Text></View><IconButton icon="settings-outline" label="List settings" onPress={() => setShowListSettings(true)} /></View>
              <View style={styles.toolRow}><AppButton compact variant="secondary" label="Tidy with AI" icon="sparkles-outline" onPress={() => setShowAi(true)} /><AppButton compact variant="secondary" label="Aisle route" icon="map-outline" onPress={() => setShowRoute(true)} /></View>
            </Card>

            <Card style={styles.composer}>
              <SectionHeader title="Add an item" />
              <Field label="Item" leadingIcon="basket-outline" maxLength={200} onChangeText={setNewItemTitle} placeholder="Milk, apples, toothpaste…" value={newItemTitle} />
              <View style={[styles.composerRow, compact && styles.stack]}>
                <View style={styles.flex}><Field label="Unit or note" maxLength={80} onChangeText={setNewItemQty} onSubmitEditing={() => void addItem()} placeholder="2 L, 500 g, any brand…" returnKeyType="done" value={newItemQty} /></View>
                <AppButton fullWidth={compact} label="Add" icon="add" busy={busyId === 'new-item'} disabled={!newItemTitle.trim()} onPress={() => void addItem()} />
              </View>
            </Card>

            <SectionHeader title="To buy" detail={activeItems.length + ' items · aisle order'} />
            {activeGroups.map(group => <View key={group.category} style={styles.categoryGroup}><View style={[styles.categoryHeader, { backgroundColor: colors.backgroundRaised }]}><Text style={[styles.categoryTitle, { color: colors.muted }]}>{categoryLabel(group.category).toUpperCase()}</Text><Text style={[styles.categoryCount, { color: colors.muted }]}>{group.items.length}</Text></View><View style={styles.items}>{group.items.map(item => <ItemRow key={item.id} item={item} busy={busyId === item.id} onUpdate={updateItem} onEdit={openItemEdit} />)}</View></View>)}
            {!activeItems.length ? <EmptyState icon="checkmark-circle-outline" title="Nothing left to buy" message="Everything on this list is complete." /> : null}

            {doneItems.length ? <><SectionHeader title="Completed" detail={doneItems.length + ' items'} /><View style={styles.items}>{doneItems.map(item => <ItemRow key={item.id} item={item} busy={busyId === item.id} onUpdate={updateItem} onEdit={openItemEdit} />)}</View></> : null}
          </> : null}
        </Screen>
      </KeyboardAvoidingView>

      <Modal visible={showNewList} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNewList(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader title="New shopping list" onClose={() => setShowNewList(false)} action={<AppButton compact label="Create" busy={busyId === 'new-list'} disabled={!newListName.trim()} onPress={() => void createList()} />} />
          <View style={styles.sheetBody}><Field autoFocus label="List name" leadingIcon="list-outline" maxLength={100} onChangeText={setNewListName} onSubmitEditing={() => void createList()} placeholder="Weekly shop" value={newListName} /></View>
        </SafeAreaView>
      </Modal>

      <Modal visible={showListSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowListSettings(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader title="List settings" onClose={() => setShowListSettings(false)} action={<AppButton compact label="Save" busy={busyId === 'edit-list'} disabled={!listName.trim()} onPress={() => void renameList()} />} />
          <View style={styles.sheetBody}><Field label="List name" leadingIcon="create-outline" maxLength={100} onChangeText={setListName} value={listName} /><AppButton fullWidth variant="danger" label="Delete this list" icon="trash-outline" onPress={deleteList} /></View>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(editingItem)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingItem(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader title="Edit item" onClose={() => setEditingItem(null)} action={<AppButton compact label="Save" busy={Boolean(editingItem && busyId === editingItem.id)} disabled={!editItemTitle.trim()} onPress={() => void saveItemEdit()} />} />
          <ScrollView contentContainerStyle={styles.sheetBody}><Field label="Item" maxLength={200} onChangeText={setEditItemTitle} value={editItemTitle} /><Field label="Unit or note" maxLength={80} onChangeText={setEditItemQty} value={editItemQty} /><View style={styles.categoryChoices}><Text style={[styles.choiceLabel, { color: colors.text }]}>Department</Text><View style={styles.chipWrap}>{MOBILE_SHOPPING_CATEGORIES.map(category => <Chip key={category.key} label={category.label} selected={editItemCategory === category.key} tone={colors.shopping} onPress={() => setEditItemCategory(category.key)} />)}</View></View>{editingItem ? <><StatusPill tone={editingItem.status === 'DONE' ? 'success' : 'primary'} label={editingItem.status === 'DONE' ? 'Completed' : 'To buy'} /><AppButton fullWidth variant="danger" label="Delete item" icon="trash-outline" onPress={() => deleteItem(editingItem)} /></> : null}</ScrollView>
        </SafeAreaView>
      </Modal>
      <ShoppingRouteSheet visible={showRoute} listId={selectedListId || ''} order={categoryOrder} request={request} onClose={() => setShowRoute(false)} onSaved={setCategoryOrder} />
      <ShoppingAiSheet visible={showAi} listId={selectedListId || ''} listName={selected?.name || 'shopping list'} request={request} onClose={() => setShowAi(false)} onApplied={async () => { await Promise.all([loadItems(), loadLists()]) }} />
    </>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  listPicker: { gap: 8, paddingRight: spacing.md },
  listSummary: { padding: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  listTitle: { fontFamily: fontFamilies.displayBold, fontSize: 21, lineHeight: 26 },
  listSubtitle: { fontFamily: fontFamilies.body, fontSize: 12, marginTop: 3 },
  composer: { gap: 12 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  items: { gap: 9 },
  categoryGroup: { gap: 8 },
  categoryHeader: { minHeight: 34, borderRadius: radii.medium, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  categoryTitle: { flex: 1, fontFamily: fontFamilies.bodyBold, fontSize: 11, letterSpacing: 0.8 },
  categoryCount: { fontFamily: fontFamilies.bodySemiBold, fontSize: 11 },
  item: { minHeight: Platform.OS === 'ios' ? 72 : 78, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 },
  itemDone: { opacity: 0.68 },
  check: { width: 36, height: 36, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, minWidth: 54 },
  itemTitle: { fontFamily: fontFamilies.bodySemiBold, fontSize: 15, lineHeight: 19 },
  itemMeta: { fontFamily: fontFamilies.body, fontSize: 11, marginTop: 3 },
  doneText: { textDecorationLine: 'line-through' },
  stepper: { height: 38, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center' },
  step: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 24, textAlign: 'center', fontFamily: fontFamilies.bodyBold, fontSize: 13 },
  disabled: { opacity: 0.35 },
  modal: { flex: 1 },
  sheetBody: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: spacing.lg, gap: spacing.lg },
  categoryChoices: { gap: 8 },
  choiceLabel: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
