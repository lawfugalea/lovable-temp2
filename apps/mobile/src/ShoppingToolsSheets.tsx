import type {
  MobileShoppingAiPreviewResponse,
  MobileShoppingAiProposalResponse,
  MobileShoppingCategoryKey,
  MobileShoppingCategoryOrderResponse,
  MobileShoppingAiOperation,
} from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useMemo, useState } from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DateTimeField } from '@/DateTimeField'
import { MOBILE_DEFAULT_SHOPPING_CATEGORY_ORDER, MOBILE_SHOPPING_CATEGORIES } from '@/shoppingCategories'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import { AppButton, Card, ErrorBanner, InfoBanner, SheetHeader } from '@/ui'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>

export function categoryLabel(key: MobileShoppingCategoryKey | null | undefined) {
  return MOBILE_SHOPPING_CATEGORIES.find(item => item.key === key)?.label || 'Other'
}

export function normalizeCategoryOrder(value: unknown): MobileShoppingCategoryKey[] {
  const keys = new Set(MOBILE_DEFAULT_SHOPPING_CATEGORY_ORDER)
  const supplied = Array.isArray(value) ? value.filter((key): key is MobileShoppingCategoryKey => typeof key === 'string' && keys.has(key as MobileShoppingCategoryKey)) : []
  const unique = supplied.filter((key, index) => supplied.indexOf(key) === index)
  return [...unique, ...MOBILE_DEFAULT_SHOPPING_CATEGORY_ORDER.filter(key => !unique.includes(key))]
}

export function ShoppingRouteSheet({ visible, listId, order, request, onClose, onSaved }: {
  visible: boolean
  listId: string
  order: MobileShoppingCategoryKey[]
  request: Request
  onClose: () => void
  onSaved: (order: MobileShoppingCategoryKey[]) => void
}) {
  const { colors } = useAppTheme()
  const [draft, setDraft] = useState(order)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (visible) { setDraft(normalizeCategoryOrder(order)); setError('') } }, [visible, order])
  const move = (index: number, offset: -1 | 1) => setDraft(current => {
    const target = index + offset
    if (target < 0 || target >= current.length) return current
    const from = current[index]
    const to = current[target]
    if (!from || !to) return current
    const next = [...current]
    next[index] = to
    next[target] = from
    return next
  })
  const save = async () => {
    setBusy(true); setError('')
    try {
      const data = await request<MobileShoppingCategoryOrderResponse>('/api/mobile/v1/shopping/category-order', { method: 'PATCH', body: JSON.stringify({ listId, order: draft }) })
      onSaved(normalizeCategoryOrder(data.order)); onClose()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the aisle route.') }
    finally { setBusy(false) }
  }
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
      <SheetHeader title="Arrange aisle route" onClose={onClose} action={<AppButton compact label="Save" busy={busy} onPress={() => void save()} />} />
      <ScrollView contentContainerStyle={styles.body}>
        <InfoBanner title="Shared shopping route" message="Arrange departments in the order your household normally walks through the shop. It is not linked to a retailer." />
        <ErrorBanner message={error} />
        {draft.map((key, index) => <Card key={key} style={styles.routeRow}>
          <Ionicons name="reorder-three-outline" size={22} color={colors.muted} />
          <Text style={[styles.routeText, { color: colors.text }]}>{categoryLabel(key)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={'Move ' + categoryLabel(key) + ' up'} disabled={index === 0} onPress={() => move(index, -1)} style={[styles.square, index === 0 && styles.disabled]}><Ionicons name="chevron-up" size={20} color={colors.primary} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={'Move ' + categoryLabel(key) + ' down'} disabled={index === draft.length - 1} onPress={() => move(index, 1)} style={[styles.square, index === draft.length - 1 && styles.disabled]}><Ionicons name="chevron-down" size={20} color={colors.primary} /></Pressable>
        </Card>)}
      </ScrollView>
    </SafeAreaView>
  </Modal>
}

function mondayToday() { const date = new Date(); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function addDays(value: string, days: number) { const date = new Date(value + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10) }
function operationTitle(operation: MobileShoppingAiOperation) {
  if (operation.kind === 'add') return 'Add ' + operation.after.title
  if (operation.kind === 'merge') return 'Merge ' + operation.before.map(item => item.title).join(' + ')
  if (operation.before.title !== operation.after.title) return 'Rename ' + operation.before.title + ' to ' + operation.after.title
  return 'Move ' + operation.after.title + ' to ' + categoryLabel(operation.after.category)
}

export function ShoppingAiSheet({ visible, listId, listName, request, onClose, onApplied }: {
  visible: boolean
  listId: string
  listName: string
  request: Request
  onClose: () => void
  onApplied: () => Promise<void>
}) {
  const { colors } = useAppTheme()
  const [stage, setStage] = useState<'context' | 'preview' | 'proposal'>('context')
  const [includeMeals, setIncludeMeals] = useState(false)
  const [weekStart, setWeekStart] = useState(mondayToday())
  const [preview, setPreview] = useState<MobileShoppingAiPreviewResponse | null>(null)
  const [proposal, setProposal] = useState<MobileShoppingAiProposalResponse | null>(null)
  const [consent, setConsent] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const context = useMemo(() => includeMeals ? { from: weekStart, to: addDays(weekStart, 6) } : {}, [includeMeals, weekStart])
  useEffect(() => { if (visible) { setStage('context'); setIncludeMeals(false); setWeekStart(mondayToday()); setPreview(null); setProposal(null); setConsent(false); setSelected([]); setError('') } }, [visible, listId])
  const loadPreview = async () => { setBusy(true); setError(''); try { const data = await request<MobileShoppingAiPreviewResponse>('/api/mobile/v1/shopping/ai/preview', { method: 'POST', body: JSON.stringify({ listId, ...context }) }); setPreview(data); setStage('preview') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not prepare the AI privacy preview.') } finally { setBusy(false) } }
  const generate = async () => { if (!preview || !consent) return; setBusy(true); setError(''); try { const data = await request<MobileShoppingAiProposalResponse>('/api/mobile/v1/shopping/ai/suggest', { method: 'POST', body: JSON.stringify({ listId, ...context, inputHash: preview.inputHash, consent: true }) }); setProposal(data); setSelected(data.operations.filter(operation => operation.kind !== 'add').map(operation => operation.id)); setStage('proposal') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not tidy this list.') } finally { setBusy(false) } }
  const apply = async () => { if (!proposal || !selected.length) return; setBusy(true); setError(''); try { await request('/api/mobile/v1/shopping/ai/apply', { method: 'POST', body: JSON.stringify({ proposalToken: proposal.proposalToken, operationIds: selected }) }); await onApplied(); onClose() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not apply the selected changes.') } finally { setBusy(false) } }
  const actionLabel = stage === 'context' ? 'Review data' : stage === 'preview' ? 'Generate' : proposal?.operations.length ? 'Apply ' + selected.length : 'Close'
  const action = () => stage === 'context' ? void loadPreview() : stage === 'preview' ? void generate() : proposal?.operations.length ? void apply() : onClose()
  const disabled = busy || (stage === 'preview' && (!consent || !preview?.configured)) || (stage === 'proposal' && Boolean(proposal?.operations.length) && !selected.length)
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
      <SheetHeader title={'Tidy ' + listName} onClose={onClose} action={<AppButton compact label={actionLabel} busy={busy} disabled={disabled} icon="sparkles-outline" onPress={action} />} />
      <ScrollView contentContainerStyle={styles.body}>
        <InfoBanner title="You stay in control" message="AI only proposes changes. Nothing is applied until you review and select it." />
        <ErrorBanner message={error} />
        {stage === 'context' ? <>
          <Card><Text style={[styles.heading, { color: colors.text }]}>Current active list</Text><Text style={[styles.copy, { color: colors.muted }]}>Item names, quantities, counts and existing categories will be included.</Text></Card>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: includeMeals }} onPress={() => setIncludeMeals(value => !value)} style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.flex}><Text style={[styles.heading, { color: colors.text }]}>Check a meal-plan week</Text><Text style={[styles.copy, { color: colors.muted }]}>Only selected recipe ingredients may be proposed as missing.</Text></View><Switch value={includeMeals} onValueChange={setIncludeMeals} /></Pressable>
          {includeMeals ? <DateTimeField label="Week starting" mode="date" value={weekStart} onChange={setWeekStart} /> : null}
        </> : null}
        {stage === 'preview' && preview ? <>
          {!preview.configured ? <InfoBanner tone="warning" title="AI is not configured" message="Your shopping list still works normally without AI." /> : null}
          <InfoBanner title="Exact outgoing data" message="No people, completed history, retailers, catalogue links or prices are included." />
          <Card><Text selectable style={[styles.json, { color: colors.text }]}>{JSON.stringify(preview.payload, null, 2)}</Text></Card>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(value => !value)} style={[styles.checkRow, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.checkBox, { borderColor: colors.primary }, consent && { backgroundColor: colors.primary }]}>{consent ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}</View><Text style={[styles.checkText, { color: colors.text }]}>I consent to sending this exact payload to DeepSeek for this request.</Text></Pressable>
        </> : null}
        {stage === 'proposal' && proposal ? <>
          <InfoBanner title="AI proposal" message={proposal.summary} />
          {!proposal.operations.length ? <Card><Text style={[styles.copy, { color: colors.text }]}>This list already looks tidy. No changes were proposed.</Text></Card> : proposal.operations.map(operation => { const checked = selected.includes(operation.id); return <Pressable key={operation.id} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setSelected(current => checked ? current.filter(id => id !== operation.id) : [...current, operation.id])} style={[styles.checkRow, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.checkBox, { borderColor: colors.primary }, checked && { backgroundColor: colors.primary }]}>{checked ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}</View><View style={styles.flex}><Text style={[styles.heading, { color: colors.text }]}>{operationTitle(operation)}</Text><Text style={[styles.copy, { color: colors.muted }]}>{operation.reason + ' · ' + categoryLabel(operation.after.category)}</Text></View></Pressable> })}
        </> : null}
        {stage !== 'context' ? <AppButton fullWidth variant="secondary" label="Back" disabled={busy} onPress={() => { setError(''); setStage(stage === 'proposal' ? 'preview' : 'context') }} /> : null}
      </ScrollView>
    </SafeAreaView>
  </Modal>
}

const styles = StyleSheet.create({
  modal: { flex: 1 }, body: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: spacing.lg, gap: spacing.md, paddingBottom: 48 }, flex: { flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }, routeText: { flex: 1, fontFamily: fontFamilies.bodySemiBold, fontSize: 15 }, square: { width: 42, height: 42, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.3 },
  heading: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14 }, copy: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 18, marginTop: 4 }, switchRow: { minHeight: 74, borderWidth: 1, borderRadius: radii.large, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkRow: { minHeight: 64, borderWidth: 1, borderRadius: radii.large, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, checkBox: { width: 24, height: 24, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, checkText: { flex: 1, fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 19 },
  json: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 10, lineHeight: 15 },
})
