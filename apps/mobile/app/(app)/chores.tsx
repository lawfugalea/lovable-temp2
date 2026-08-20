import type { MobileChore, MobileChoreMember, MobileChoresResponse, MobileSaveChoreResponse, MobileTodayChore, MobileTodayChoresResponse } from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthProvider'
import { CHORE_ICON_GROUPS, choreIconName } from '@/choreIcons'
import { DateTimeField } from '@/DateTimeField'
import { fontFamilies, spacing, useAppTheme } from '@/theme'
import { AppButton, Card, Chip, EmptyState, ErrorBanner, Field, IconButton, LoadingState, PageHeader, Screen, SectionHeader, SheetHeader, StatusPill, useResponsive } from '@/ui'

function localDateOnly(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

export default function ChoresScreen() {
  const { colors } = useAppTheme()
  const { compact } = useResponsive()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [items, setItems] = useState<MobileTodayChore[]>([])
  const [chores, setChores] = useState<MobileChore[]>([])
  const [members, setMembers] = useState<MobileChoreMember[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<MobileChore | 'new' | null>(null)
  const [form, setForm] = useState({
    title: '', notes: '', active: true, assigneeId: '', icon: '' as string,
    recurrenceType: 'WEEKLY' as 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY',
    daysOfWeek: [1] as number[], intervalDays: '7', anchorDate: localDateOnly(), dayOfMonth: '1',
  })
  const date = localDateOnly()

  const load = useCallback(async () => {
    if (!householdId) return
    const [today, management] = await Promise.all([
      request<MobileTodayChoresResponse>('/api/mobile/v1/chores/today?householdId=' + encodeURIComponent(householdId) + '&date=' + date),
      request<MobileChoresResponse>('/api/mobile/v1/chores?householdId=' + encodeURIComponent(householdId)),
    ])
    setItems(today.items)
    setChores(management.chores)
    setMembers(management.members)
  }, [date, householdId, request])

  useEffect(() => {
    setLoading(true)
    setError('')
    void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load chores.')).finally(() => setLoading(false))
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try { await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh chores.') } finally { setRefreshing(false) }
  }

  const toggle = async (item: MobileTodayChore) => {
    if (!householdId) return
    setBusyId(item.id)
    setError('')
    try {
      await request<{ ok: true }>('/api/mobile/v1/chores/complete', {
        method: item.status === 'PENDING' ? 'POST' : 'DELETE',
        body: JSON.stringify({ householdId, choreId: item.id, dueDate: item.dueDate, status: 'DONE' }),
      })
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the chore.') }
    finally { setBusyId(null) }
  }

  const openForm = (chore?: MobileChore) => {
    setForm(chore ? {
      title: chore.title, notes: chore.notes || '', active: chore.active, assigneeId: chore.assignee?.id || '', icon: chore.icon || '',
      recurrenceType: chore.recurrenceType, daysOfWeek: chore.daysOfWeek, intervalDays: String(chore.intervalDays || 7),
      anchorDate: chore.anchorDate || date, dayOfMonth: String(chore.dayOfMonth || 1),
    } : {
      title: '', notes: '', active: true, assigneeId: '', icon: '', recurrenceType: 'WEEKLY',
      daysOfWeek: [new Date().getDay() || 7], intervalDays: '7', anchorDate: date, dayOfMonth: '1',
    })
    setEditing(chore || 'new')
  }

  const saveChore = async () => {
    if (!householdId || !editing || !form.title.trim()) return
    setBusyId('save')
    setError('')
    const payload = {
      householdId, title: form.title, notes: form.notes, active: form.active, assigneeId: form.assigneeId || null,
      icon: form.icon || null,
      recurrenceType: form.recurrenceType, daysOfWeek: form.daysOfWeek, intervalDays: Number(form.intervalDays),
      anchorDate: form.anchorDate, dayOfMonth: Number(form.dayOfMonth),
    }
    try {
      const path = editing === 'new' ? '/api/mobile/v1/chores' : '/api/mobile/v1/chores/' + encodeURIComponent(editing.id)
      await request<MobileSaveChoreResponse>(path, { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify(payload) })
      setEditing(null)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the chore.') }
    finally { setBusyId(null) }
  }

  const deleteChore = (chore: MobileChore) => Alert.alert('Delete chore?', 'Delete “' + chore.title + '” and its completion history?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => {
      if (!householdId) return
      setBusyId(chore.id)
      void request<{ ok: true }>('/api/mobile/v1/chores/' + encodeURIComponent(chore.id), { method: 'DELETE', body: JSON.stringify({ householdId }) })
        .then(load)
        .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not delete the chore.'))
        .finally(() => setBusyId(null))
    } },
  ])

  if (!householdId) return <Screen safeTop={false}><EmptyState icon="checkmark-circle-outline" title="Choose a household" message="Chores belong to a household." /></Screen>
  if (loading) return <LoadingState label="Loading chores…" />
  const pending = items.filter(item => item.status === 'PENDING').length

  return (
    <>
      <Screen safeTop={false} refreshing={refreshing} onRefresh={() => void refresh()}>
        <PageHeader eyebrow="TODAY" title="Chores" subtitle={pending ? pending + ' still to do' : 'Everything is handled'} action={<IconButton filled icon="add" label="New chore" onPress={() => openForm()} />} />
        <ErrorBanner message={error} />
        <View style={styles.list}>
          {items.map(item => {
            const resolved = item.status !== 'PENDING'
            return (
              <Card key={item.id + ':' + item.dueDate} style={resolved && styles.doneCard}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: resolved, disabled: busyId === item.id }} disabled={busyId === item.id} onPress={() => void toggle(item)} style={styles.chore}>
                  <View style={[styles.check, { borderColor: colors.chores }, resolved && { backgroundColor: colors.chores }]}>
                    {busyId === item.id ? <ActivityIndicator color={resolved ? '#FFFFFF' : colors.chores} /> : resolved ? <Ionicons name="checkmark" size={19} color="#FFFFFF" /> : null}
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.titleRow}><Ionicons name={choreIconName(item.icon)} size={17} color={colors.chores} /><Text style={[styles.choreTitle, { color: colors.text }, resolved && styles.doneText]}>{item.title}</Text>{item.overdue ? <StatusPill tone="danger" label="Overdue" /> : null}</View>
                    <Text style={[styles.meta, { color: colors.muted }]}>{item.schedule}{item.assigneeName ? ' · ' + item.assigneeName : ''}</Text>
                    {item.notes ? <Text numberOfLines={2} style={[styles.notes, { color: colors.text }]}>{item.notes}</Text> : null}
                    {resolved ? <Text style={[styles.completed, { color: colors.success }]}>Completed{item.completedByName ? ' by ' + item.completedByName : ''} · tap to reopen</Text> : null}
                  </View>
                </Pressable>
              </Card>
            )
          })}
          {!items.length ? <EmptyState icon="sparkles-outline" title="No chores due" message="Enjoy the clear list, or create a recurring chore." /> : null}
        </View>

        <SectionHeader title="Recurring chores" detail={chores.length + ' configured'} action={<AppButton compact variant="secondary" label="New chore" icon="add" onPress={() => openForm()} />} />
        <View style={styles.list}>{chores.map(chore => (
          <Card key={chore.id} style={[styles.manageCard, !chore.active && styles.doneCard]}>
            <Pressable onPress={() => openForm(chore)} style={styles.manageRow}>
              <View style={[styles.manageIcon, { backgroundColor: colors.successSoft }]}><Ionicons name={choreIconName(chore.icon)} size={20} color={colors.chores} /></View>
              <View style={styles.flex}><Text style={[styles.choreTitle, { color: colors.text }]}>{chore.title}</Text><Text style={[styles.meta, { color: colors.muted }]}>{chore.schedule}{chore.assignee?.name ? ' · ' + chore.assignee.name : ''}</Text></View>
              {!chore.active ? <StatusPill label="Paused" /> : null}
              <IconButton danger icon="trash-outline" label={'Delete ' + chore.title} disabled={busyId === chore.id} onPress={() => deleteChore(chore)} />
            </Pressable>
          </Card>
        ))}</View>
      </Screen>

      <Modal visible={Boolean(editing)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader title={editing === 'new' ? 'New chore' : 'Edit chore'} onClose={() => setEditing(null)} action={<AppButton compact label="Save" busy={busyId === 'save'} disabled={!form.title.trim()} onPress={() => void saveChore()} />} />
          <ScrollView keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formPage}>
            <Field label="Chore" leadingIcon="checkmark-circle-outline" maxLength={200} onChangeText={title => setForm(current => ({ ...current, title }))} placeholder="What needs doing?" value={form.title} />
            <Field label="Notes" maxLength={2000} multiline onChangeText={notes => setForm(current => ({ ...current, notes }))} placeholder="Helpful details (optional)" value={form.notes} />

            <Text style={[styles.label, { color: colors.text }]}>Icon</Text>
            <View style={styles.choices}>
              <Chip label="Auto" selected={!form.icon} onPress={() => setForm(current => ({ ...current, icon: '' }))} tone={colors.chores} />
            </View>
            {CHORE_ICON_GROUPS.map(group => (
              <View key={group.name}>
                <Text style={[styles.meta, { color: colors.muted }]}>{group.name}</Text>
                <View style={styles.choices}>
                  {group.ids.map(id => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={id}
                      accessibilityState={{ selected: form.icon === id }}
                      onPress={() => setForm(current => ({ ...current, icon: id }))}
                      style={[styles.iconChoice, { borderColor: form.icon === id ? colors.chores : colors.border, backgroundColor: form.icon === id ? colors.successSoft : colors.card }]}
                    >
                      <Ionicons name={choreIconName(id)} size={21} color={form.icon === id ? colors.chores : colors.muted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            <Text style={[styles.label, { color: colors.text }]}>Repeats</Text>
            <View style={styles.choices}>{(['WEEKLY', 'EVERY_N_DAYS', 'MONTHLY'] as const).map(type => <Chip key={type} label={type === 'WEEKLY' ? 'Weekly' : type === 'EVERY_N_DAYS' ? 'Every N days' : 'Monthly'} selected={form.recurrenceType === type} onPress={() => setForm(current => ({ ...current, recurrenceType: type }))} tone={colors.chores} />)}</View>

            {form.recurrenceType === 'WEEKLY' ? <><Text style={[styles.label, { color: colors.text }]}>Weekdays</Text><View style={styles.choices}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => {
              const day = index + 1
              const selected = form.daysOfWeek.includes(day)
              return <Chip key={day} label={label} selected={selected} onPress={() => setForm(current => ({ ...current, daysOfWeek: selected ? current.daysOfWeek.filter(value => value !== day) : [...current.daysOfWeek, day].sort() }))} tone={colors.chores} />
            })}</View></> : null}

            {form.recurrenceType === 'EVERY_N_DAYS' ? <View style={[styles.two, compact && styles.stack]}><View style={styles.flex}><Field label="Repeat every (days)" keyboardType="number-pad" onChangeText={intervalDays => setForm(current => ({ ...current, intervalDays }))} value={form.intervalDays} /></View><View style={styles.flex}><DateTimeField label="Starting date" mode="date" value={form.anchorDate} onChange={anchorDate => setForm(current => ({ ...current, anchorDate }))} /></View></View> : null}
            {form.recurrenceType === 'MONTHLY' ? <Field label="Day of month" keyboardType="number-pad" onChangeText={dayOfMonth => setForm(current => ({ ...current, dayOfMonth }))} value={form.dayOfMonth} /> : null}

            <Text style={[styles.label, { color: colors.text }]}>Assign to</Text>
            <View style={styles.choices}><Chip label="Anyone" selected={!form.assigneeId} onPress={() => setForm(current => ({ ...current, assigneeId: '' }))} tone={colors.chores} />{members.map(member => <Chip key={member.id} label={member.name} selected={form.assigneeId === member.id} onPress={() => setForm(current => ({ ...current, assigneeId: member.id }))} tone={colors.chores} />)}</View>
            {editing !== 'new' ? <AppButton fullWidth variant="secondary" label={form.active ? 'Pause chore' : 'Resume chore'} icon={form.active ? 'pause-outline' : 'play-outline'} onPress={() => setForm(current => ({ ...current, active: !current.active }))} /> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  list: { gap: 9 },
  chore: { minHeight: Platform.OS === 'ios' ? 70 : 76, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  doneCard: { opacity: 0.68 },
  check: { width: 36, height: 36, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  choreTitle: { flexShrink: 1, fontFamily: fontFamilies.bodySemiBold, fontSize: 15, lineHeight: 20 },
  doneText: { textDecorationLine: 'line-through' },
  meta: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  notes: { fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18, marginTop: 6 },
  completed: { fontFamily: fontFamilies.bodySemiBold, fontSize: 11, marginTop: 6 },
  manageCard: { padding: 8 },
  manageRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 5 },
  manageIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  modal: { flex: 1 },
  formPage: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: spacing.md, paddingBottom: 70, gap: spacing.md },
  label: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // 44pt keeps every icon a comfortable tap target, per the app's touch rules.
  iconChoice: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  two: { flexDirection: 'row', gap: 12 },
})
