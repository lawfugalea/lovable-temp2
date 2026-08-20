import type {
  MobileGenerateMealShoppingResponse,
  MobileMealPlanEntry,
  MobileMealRecipeSummary,
  MobileMealWeekResponse,
  MobileRecipe,
  MobileRecipesResponse,
  MobileSaveRecipeResponse,
  MobileShoppingList,
  MobileShoppingListsResponse,
  MobileUpdateMealPlanResponse,
} from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthProvider'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import { AppButton, Card, Chip, EmptyState, ErrorBanner, Field, IconButton, InfoBanner, LoadingState, PageHeader, Screen, SectionHeader, SheetHeader, StatusPill, useResponsive } from '@/ui'

function dateOnly(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}
function fromDateOnly(value: string) { return new Date(value + 'T12:00:00') }
function addDays(value: string, amount: number) { const date = fromDateOnly(value); date.setDate(date.getDate() + amount); return dateOnly(date) }
function mondayOfToday() { const date = new Date(); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return dateOnly(date) }
function dayLabel(value: string) { return fromDateOnly(value).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) }
type RecipeFormIngredient = { id?: string; name: string; quantity: string; unit: string }

export default function MealsScreen() {
  const { colors } = useAppTheme()
  const { compact } = useResponsive()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [weekStart, setWeekStart] = useState(mondayOfToday)
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const weekEnd = addDays(weekStart, 6)
  const [entries, setEntries] = useState<MobileMealPlanEntry[]>([])
  const [recipes, setRecipes] = useState<MobileMealRecipeSummary[]>([])
  const [recipeDetails, setRecipeDetails] = useState<MobileRecipe[]>([])
  const [lists, setLists] = useState<MobileShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingRecipe, setEditingRecipe] = useState<MobileRecipe | 'new' | null>(null)
  const [recipeForm, setRecipeForm] = useState<{ name: string; servings: string; notes: string; ingredients: RecipeFormIngredient[] }>({ name: '', servings: '4', notes: '', ingredients: [{ name: '', quantity: '1', unit: '' }] })

  const load = useCallback(async () => {
    if (!householdId) return
    const [week, shopping, recipeData] = await Promise.all([
      request<MobileMealWeekResponse>('/api/mobile/v1/meals/week?householdId=' + encodeURIComponent(householdId) + '&from=' + weekStart + '&to=' + weekEnd),
      request<MobileShoppingListsResponse>('/api/mobile/v1/shopping/lists?householdId=' + encodeURIComponent(householdId)),
      request<MobileRecipesResponse>('/api/mobile/v1/meals/recipes?householdId=' + encodeURIComponent(householdId)),
    ])
    setEntries(week.entries)
    setRecipes(week.recipes)
    setRecipeDetails(recipeData.recipes)
    setLists(shopping.lists)
    setSelectedListId(current => current && shopping.lists.some(list => list.id === current) ? current : shopping.lists[0]?.id ?? null)
  }, [householdId, request, weekEnd, weekStart])

  useEffect(() => {
    setLoading(true)
    setError('')
    void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load meals.')).finally(() => setLoading(false))
  }, [load])

  const openDay = (date: string) => {
    const entry = entries.find(item => item.date === date)
    setEditingDate(date)
    setSelectedRecipeId(entry?.recipe?.id ?? null)
    setFreeText(entry?.freeText ?? '')
  }

  const saveDay = async (clear = false) => {
    if (!householdId || !editingDate) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await request<MobileUpdateMealPlanResponse>('/api/mobile/v1/meals/week', {
        method: 'PUT',
        body: JSON.stringify({ householdId, date: editingDate, recipeId: clear ? null : selectedRecipeId, freeText: clear || selectedRecipeId ? null : freeText }),
      })
      setEntries(current => [...current.filter(item => item.date !== editingDate), ...(response.entry ? [response.entry] : [])])
      setEditingDate(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save dinner.') }
    finally { setBusy(false) }
  }

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    setNotice('')
    try { await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh meals.') }
    finally { setRefreshing(false) }
  }

  const generate = () => {
    const list = lists.find(item => item.id === selectedListId)
    if (!householdId || !list) return
    Alert.alert('Add this week’s ingredients?', 'Recipe ingredients will be added or merged into “' + list.name + '”.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add ingredients', onPress: () => {
        setBusy(true)
        setError('')
        setNotice('')
        void request<MobileGenerateMealShoppingResponse>('/api/mobile/v1/meals/generate-shopping', { method: 'POST', body: JSON.stringify({ householdId, from: weekStart, to: weekEnd, listId: list.id }) })
          .then(result => setNotice(result.created + ' new and ' + result.merged + ' existing shopping items updated.'))
          .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not add ingredients.'))
          .finally(() => setBusy(false))
      } },
    ])
  }

  const openRecipe = (recipe?: MobileRecipe) => {
    setRecipeForm(recipe ? {
      name: recipe.name, servings: String(recipe.servings), notes: recipe.notes || '',
      ingredients: recipe.ingredients.map(item => ({ id: item.id, name: item.name, quantity: String(item.quantity), unit: item.unit || '' })),
    } : { name: '', servings: '4', notes: '', ingredients: [{ name: '', quantity: '1', unit: '' }] })
    setEditingRecipe(recipe || 'new')
  }

  const saveRecipe = async () => {
    if (!householdId || !editingRecipe || !recipeForm.name.trim()) return
    setBusy(true)
    setError('')
    const payload = {
      householdId, name: recipeForm.name, servings: Number(recipeForm.servings), notes: recipeForm.notes,
      ingredients: recipeForm.ingredients.map(item => ({ id: item.id, name: item.name, quantity: Number(item.quantity), unit: item.unit || null })),
    }
    try {
      const path = editingRecipe === 'new' ? '/api/mobile/v1/meals/recipes' : '/api/mobile/v1/meals/recipes/' + encodeURIComponent(editingRecipe.id)
      await request<MobileSaveRecipeResponse>(path, { method: editingRecipe === 'new' ? 'POST' : 'PATCH', body: JSON.stringify(payload) })
      setEditingRecipe(null)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the recipe.') }
    finally { setBusy(false) }
  }

  const deleteRecipe = (recipe: MobileRecipe) => Alert.alert('Delete recipe?', 'Delete “' + recipe.name + '”? Days using it will also be cleared.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => {
      if (!householdId) return
      setBusy(true)
      void request<{ ok: true }>('/api/mobile/v1/meals/recipes/' + encodeURIComponent(recipe.id), { method: 'DELETE', body: JSON.stringify({ householdId }) })
        .then(load)
        .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not delete the recipe.'))
        .finally(() => setBusy(false))
    } },
  ])

  if (!householdId) return <Screen safeTop={false}><EmptyState icon="restaurant-outline" title="Choose a household" message="Meal plans belong to a household." /></Screen>
  if (loading) return <LoadingState label="Loading meal plan…" />

  return (
    <>
      <Screen safeTop={false} refreshing={refreshing} onRefresh={() => void refresh()}>
        <PageHeader eyebrow="MEAL PLANNER" title="Dinner this week" subtitle="Keep seven evenings calm and ingredients ready." action={<IconButton filled icon="add" label="New recipe" onPress={() => openRecipe()} />} />
        <View style={styles.weekNav}>
          <IconButton icon="chevron-back" label="Previous week" onPress={() => setWeekStart(current => addDays(current, -7))} />
          <Pressable accessibilityRole="button" onPress={() => setWeekStart(mondayOfToday())} style={styles.weekCenter}><Text style={[styles.weekLabel, { color: colors.text }]}>{dayLabel(weekStart)} – {dayLabel(weekEnd)}</Text><Text style={[styles.weekHint, { color: colors.muted }]}>Tap to return to this week</Text></Pressable>
          <IconButton icon="chevron-forward" label="Next week" onPress={() => setWeekStart(current => addDays(current, 7))} />
        </View>
        <ErrorBanner message={error} />
        {notice ? <InfoBanner tone="success" title="Shopping list updated" message={notice} /> : null}

        <View style={styles.days}>{weekDates.map(date => {
          const entry = entries.find(item => item.date === date)
          const isToday = date === dateOnly(new Date())
          return (
            <Card key={date} tone={isToday ? 'warning' : 'default'} style={styles.dayCard}>
              <Pressable accessibilityRole="button" onPress={() => openDay(date)} style={styles.day}>
                <View style={styles.dayDate}><Text style={[styles.dayName, { color: isToday ? colors.meals : colors.text }]}>{fromDateOnly(date).toLocaleDateString(undefined, { weekday: 'short' })}</Text><Text style={[styles.dayNumber, { color: colors.text }]}>{fromDateOnly(date).getDate()}</Text></View>
                <View style={styles.flex}><Text numberOfLines={2} style={[entry ? styles.mealName : styles.emptyMeal, { color: entry ? colors.text : colors.muted }]}>{entry?.recipe?.name || entry?.freeText || 'Nothing planned'}</Text>{entry?.recipe ? <Text style={[styles.meta, { color: colors.muted }]}>Serves {entry.recipe.servings}</Text> : null}</View>
                {isToday ? <StatusPill tone="warning" label="Today" /> : <Ionicons name="chevron-forward" size={19} color={colors.subtle} />}
              </Pressable>
            </Card>
          )
        })}</View>

        <Card tone="success" style={styles.shoppingCard}>
          <SectionHeader title="Shop this week’s recipes" detail="Only saved recipe ingredients are included." />
          {lists.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{lists.map(list => <Chip key={list.id} label={list.name} selected={selectedListId === list.id} onPress={() => setSelectedListId(list.id)} tone={colors.meals} />)}</ScrollView> : <Text style={[styles.help, { color: colors.muted }]}>Create a shopping list first.</Text>}
          <AppButton fullWidth label="Add ingredients to list" icon="cart-outline" busy={busy} disabled={!selectedListId} onPress={generate} />
        </Card>

        <SectionHeader title="Recipes" detail={recipeDetails.length + ' saved'} action={<AppButton compact variant="secondary" label="New recipe" icon="add" onPress={() => openRecipe()} />} />
        <View style={styles.recipeList}>{recipeDetails.map(recipe => <Card key={recipe.id} style={styles.recipeCard}><Pressable onPress={() => openRecipe(recipe)} style={styles.recipeRow}><View style={[styles.recipeIcon, { backgroundColor: colors.warningSoft }]}><Ionicons name="restaurant-outline" size={20} color={colors.meals} /></View><View style={styles.flex}><Text style={[styles.recipeName, { color: colors.text }]}>{recipe.name}</Text><Text style={[styles.meta, { color: colors.muted }]}>Serves {recipe.servings} · {recipe.ingredients.length} ingredients</Text></View><IconButton danger icon="trash-outline" label={'Delete ' + recipe.name} disabled={busy} onPress={() => deleteRecipe(recipe)} /></Pressable></Card>)}</View>
        {!recipeDetails.length ? <EmptyState icon="restaurant-outline" title="No saved recipes" message="Create a favourite once and plan it any week." /> : null}
      </Screen>

      <Modal visible={Boolean(editingDate)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingDate(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader title={editingDate ? dayLabel(editingDate) : 'Dinner'} onClose={() => setEditingDate(null)} action={<AppButton compact label="Save" busy={busy} disabled={!selectedRecipeId && !freeText.trim()} onPress={() => void saveDay()} />} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalPage}>
            <SectionHeader title="Choose dinner" />
            <Pressable onPress={() => setSelectedRecipeId(null)} style={[styles.option, { backgroundColor: colors.card, borderColor: !selectedRecipeId ? colors.meals : colors.border }]}><Text style={[styles.recipeName, { color: colors.text }]}>Custom meal</Text><Text style={[styles.meta, { color: colors.muted }]}>Type a dinner below</Text></Pressable>
            {recipes.map(recipe => <Pressable key={recipe.id} onPress={() => { setSelectedRecipeId(recipe.id); setFreeText('') }} style={[styles.option, { backgroundColor: colors.card, borderColor: selectedRecipeId === recipe.id ? colors.meals : colors.border }]}><Text style={[styles.recipeName, { color: colors.text }]}>{recipe.name}</Text><Text style={[styles.meta, { color: colors.muted }]}>Serves {recipe.servings} · {recipe.ingredientCount} ingredients</Text></Pressable>)}
            {!selectedRecipeId ? <Field autoFocus label="Dinner" maxLength={200} onChangeText={setFreeText} placeholder="Pizza night, leftovers…" value={freeText} /> : null}
            <AppButton fullWidth variant="danger" label="Clear this day" icon="close-circle-outline" disabled={busy} onPress={() => void saveDay(true)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(editingRecipe)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingRecipe(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader title={editingRecipe === 'new' ? 'New recipe' : 'Edit recipe'} onClose={() => setEditingRecipe(null)} action={<AppButton compact label="Save" busy={busy} disabled={!recipeForm.name.trim()} onPress={() => void saveRecipe()} />} />
          <ScrollView keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalPage}>
            <Field label="Recipe name" leadingIcon="restaurant-outline" maxLength={120} onChangeText={name => setRecipeForm(current => ({ ...current, name }))} value={recipeForm.name} />
            <Field label="Servings" keyboardType="number-pad" onChangeText={servings => setRecipeForm(current => ({ ...current, servings }))} value={recipeForm.servings} />
            <Field label="Notes" maxLength={2000} multiline onChangeText={notes => setRecipeForm(current => ({ ...current, notes }))} value={recipeForm.notes} />
            <SectionHeader title="Ingredients" detail={recipeForm.ingredients.length + ' rows'} />
            {recipeForm.ingredients.map((ingredient, index) => <Card key={ingredient.id || index} style={styles.ingredientCard}><Field label={'Ingredient ' + (index + 1)} maxLength={200} onChangeText={name => setRecipeForm(current => ({ ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item) }))} placeholder="Ingredient name" value={ingredient.name} /><View style={[styles.ingredientNumbers, compact && styles.stack]}><View style={styles.flex}><Field label="Quantity" keyboardType="decimal-pad" onChangeText={quantity => setRecipeForm(current => ({ ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, quantity } : item) }))} value={ingredient.quantity} /></View><View style={styles.flex}><Field label="Unit" maxLength={20} onChangeText={unit => setRecipeForm(current => ({ ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, unit } : item) }))} value={ingredient.unit} /></View><IconButton danger icon="trash-outline" label={'Remove ingredient ' + (index + 1)} disabled={recipeForm.ingredients.length === 1} onPress={() => setRecipeForm(current => ({ ...current, ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index) }))} /></View></Card>)}
            <AppButton fullWidth variant="secondary" label="Add ingredient" icon="add" disabled={recipeForm.ingredients.length >= 50} onPress={() => setRecipeForm(current => ({ ...current, ingredients: [...current.ingredients, { name: '', quantity: '1', unit: '' }] }))} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekCenter: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { textAlign: 'center', fontFamily: fontFamilies.bodyBold, fontSize: 13 },
  weekHint: { textAlign: 'center', fontFamily: fontFamilies.body, fontSize: 10, marginTop: 2 },
  days: { gap: 8 },
  dayCard: { padding: 8 },
  day: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  dayDate: { width: 45, alignItems: 'center' },
  dayName: { fontFamily: fontFamilies.bodySemiBold, fontSize: 11 },
  dayNumber: { fontFamily: fontFamilies.displayBold, fontSize: 21, marginTop: 1 },
  mealName: { fontFamily: fontFamilies.bodySemiBold, fontSize: 15, lineHeight: 19 },
  emptyMeal: { fontFamily: fontFamilies.body, fontSize: 14 },
  meta: { fontFamily: fontFamilies.body, fontSize: 11, lineHeight: 16, marginTop: 3 },
  shoppingCard: { gap: 13 },
  chips: { gap: 8, paddingRight: spacing.md },
  help: { fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18 },
  recipeList: { gap: 8 },
  recipeCard: { padding: 7 },
  recipeRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 5 },
  recipeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recipeName: { fontFamily: fontFamilies.bodySemiBold, fontSize: 15, lineHeight: 20 },
  modal: { flex: 1 },
  modalPage: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: spacing.md, paddingBottom: 70, gap: spacing.md },
  option: { minHeight: 64, borderWidth: 1, borderRadius: radii.medium, padding: 13, justifyContent: 'center' },
  ingredientCard: { gap: 12 },
  ingredientNumbers: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
})

