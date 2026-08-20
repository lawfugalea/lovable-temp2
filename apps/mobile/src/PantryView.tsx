import type { MobilePantryItem, MobilePantryResponse, MobileSavePantryItemResponse } from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthProvider'
import { fontFamilies, spacing, useAppTheme } from '@/theme'
import {
  AppButton,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  ListRow,
  LoadingState,
  Screen,
  SectionHeader,
  SheetHeader,
} from '@/ui'

/**
 * The household pantry — what is already in the cupboard, so the same thing is
 * not bought twice. Deliberately vague about amounts, matching the web: the
 * quantity is free text because precision is not the point.
 */
export default function PantryView() {
  const { colors } = useAppTheme()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [items, setItems] = useState<MobilePantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<MobilePantryItem | 'new' | null>(null)
  const [form, setForm] = useState({ name: '', quantity: '' })

  const load = useCallback(async () => {
    if (!householdId) return
    const next = await request<MobilePantryResponse>(`/api/mobile/v1/pantry?householdId=${encodeURIComponent(householdId)}`)
    setItems(next.items)
  }, [householdId, request])

  useEffect(() => {
    setLoading(true)
    void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load the pantry.')).finally(() => setLoading(false))
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try { await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh the pantry.') } finally { setRefreshing(false) }
  }

  const openForm = (item?: MobilePantryItem) => {
    setForm({ name: item?.name || '', quantity: item?.quantity || '' })
    setEditing(item || 'new')
  }

  const save = async () => {
    if (!householdId || !editing || !form.name.trim()) return
    setBusy('save')
    setError('')
    try {
      if (editing === 'new') {
        await request<MobileSavePantryItemResponse>('/api/mobile/v1/pantry', {
          method: 'POST',
          body: JSON.stringify({ householdId, name: form.name, quantity: form.quantity }),
        })
      } else {
        await request<MobileSavePantryItemResponse>(`/api/mobile/v1/pantry/${encodeURIComponent(editing.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ householdId, name: form.name, quantity: form.quantity }),
        })
      }
      await load()
      setEditing(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this item.')
    } finally {
      setBusy('')
    }
  }

  const remove = (item: MobilePantryItem) => Alert.alert(
    'Remove from the pantry?',
    `${item.name} will no longer be listed as something you have in.`,
    [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (!householdId) return
          setBusy(item.id)
          void request<{ ok: true }>(`/api/mobile/v1/pantry/${encodeURIComponent(item.id)}`, { method: 'DELETE', body: JSON.stringify({ householdId }) })
            .then(() => setItems(current => current.filter(row => row.id !== item.id)))
            .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not remove this item.'))
            .finally(() => setBusy(''))
        },
      },
    ],
  )

  if (!householdId) {
    return <Screen safeTop={false}><EmptyState icon="file-tray-full-outline" title="Choose a household" message="The pantry belongs to a household." /></Screen>
  }
  if (loading) return <LoadingState label="Checking the cupboards…" />

  return (
    <>
      <Screen safeTop={false} refreshing={refreshing} onRefresh={() => void refresh()}>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        <SectionHeader
          title="Your pantry"
          detail={items.length ? `${items.length} thing${items.length === 1 ? '' : 's'} in` : 'What you already have in'}
          action={<AppButton compact variant="secondary" label="Add" icon="add" onPress={() => openForm()} />}
        />
        {items.length ? (
          <View style={styles.list}>
            {items.map(item => (
              <Card key={item.id} style={styles.row}>
                <ListRow
                  icon="file-tray-full-outline"
                  iconColor={colors.meals}
                  title={item.name}
                  subtitle={item.quantity || 'No amount noted'}
                  onPress={() => openForm(item)}
                  trailing={<IconButton danger icon="trash-outline" label={`Remove ${item.name}`} disabled={busy === item.id} onPress={() => remove(item)} />}
                />
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState icon="file-tray-full-outline" title="Nothing noted yet" message="Add what you already have in, so it does not get bought twice." />
        )}
      </Screen>

      <Modal visible={Boolean(editing)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader
            title={editing === 'new' ? 'Add to the pantry' : 'Edit pantry item'}
            subtitle="Amounts are free text — “2 packs” is as useful as “500g”."
            onClose={() => setEditing(null)}
            action={<AppButton compact label="Save" busy={busy === 'save'} disabled={!form.name.trim()} onPress={() => void save()} />}
          />
          <View style={styles.form}>
            <Field label="What is it?" leadingIcon="file-tray-full-outline" maxLength={120} placeholder="Olive oil" value={form.name} onChangeText={name => setForm(current => ({ ...current, name }))} />
            <Field label="How much? (optional)" leadingIcon="cube-outline" maxLength={60} placeholder="2 bottles" value={form.quantity} onChangeText={quantity => setForm(current => ({ ...current, quantity }))} />
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
              <Text style={[styles.hint, { color: colors.muted }]}>
                Adding something you already have listed updates it rather than adding a second copy.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: { paddingHorizontal: 14, paddingVertical: 2 },
  modal: { flex: 1 },
  form: { padding: spacing.md, gap: spacing.sm },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  hint: { flex: 1, fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18 },
})
