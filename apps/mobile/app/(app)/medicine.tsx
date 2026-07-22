import type {
  MobileDoseWarning,
  MobileFeverReadingSummary,
  MobileHealthEpisodeSummary,
  MobileHealthMutationResponse,
  MobileMedicineChildSummary,
  MobileMedicineDoseSummary,
  MobileMedicineOverviewResponse,
  MobileMedicineSummary,
  MobileWeightMeasurementSummary,
} from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError } from '@/api'
import { useAuth } from '@/auth/AuthProvider'
import { DateTimeField } from '@/DateTimeField'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import {
  AppButton,
  Card,
  Chip,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  SectionHeader,
  SegmentedControl,
  SheetHeader,
  StatusPill,
  useResponsive,
} from '@/ui'

type HealthView = 'overview' | 'journal' | 'manage'
type FormKind = 'child' | 'episode' | 'fever' | 'weight' | 'medicine' | 'dose'
type Editor = { kind: FormKind; id?: string }

const nowIso = () => new Date().toISOString()
const today = () => nowIso().slice(0, 10)
const formDefaults = {
  child: { name: '', dateOfBirth: '', notes: '', isActive: true },
  episode: { childId: '', title: '', notes: '', startedAt: nowIso() },
  fever: { childId: '', episodeId: '', temperature: '', unit: 'C', method: 'forehead', notes: '', takenAt: nowIso() },
  weight: { childId: '', weightKg: '', notes: '', measuredAt: nowIso() },
  medicine: {
    childId: '', episodeId: '', name: '', description: '', dosage: '', frequency: 'every 6 hours', notes: '',
    startDate: today(), endDate: '', isActive: true, isPrn: false, activeIngredient: '', formulation: 'liquid',
    concentration: '', doseAmount: '', doseUnit: 'ml', minGapHours: '6', maxDosesPer24h: '4',
    scheduleSource: 'PACKAGING', scheduleSourceNotes: '',
  },
  dose: { childId: '', medicineId: '', episodeId: '', dosage: '', notes: '', takenAt: nowIso(), warningReason: '' },
}
type Forms = typeof formDefaults

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'None'
}

function Choice({ selected, label, onPress, tone }: { selected: boolean; label: string; onPress: () => void; tone?: string }) {
  return <Chip label={label} selected={selected} onPress={onPress} tone={tone} />
}

export default function HealthScreen() {
  const { colors } = useAppTheme()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [data, setData] = useState<MobileMedicineOverviewResponse | null>(null)
  const [view, setView] = useState<HealthView>('overview')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [forms, setForms] = useState<Forms>(formDefaults)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<MobileDoseWarning[]>([])

  const load = useCallback(async () => {
    if (!householdId) return
    setData(await request<MobileMedicineOverviewResponse>('/api/mobile/v1/medicine/overview?householdId=' + encodeURIComponent(householdId)))
  }, [householdId, request])

  useEffect(() => {
    setLoading(true)
    void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load Health.')).finally(() => setLoading(false))
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    setError('')
    try { await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh Health.') } finally { setRefreshing(false) }
  }
  const openEpisodes = useMemo(() => data?.recentEpisodes.filter(item => !item.endedAt) || [], [data])
  const openNew = (kind: FormKind, seed?: Partial<Forms[FormKind]>) => {
    setWarnings([])
    setForms(current => ({ ...current, [kind]: { ...formDefaults[kind], ...seed } }))
    setEditor({ kind })
  }
  const openChild = (item: MobileMedicineChildSummary) => {
    setForms(current => ({ ...current, child: { name: item.name, dateOfBirth: item.dateOfBirth.slice(0, 10), notes: item.notes || '', isActive: item.isActive } }))
    setEditor({ kind: 'child', id: item.id })
  }
  const openFever = (item: MobileFeverReadingSummary) => {
    setForms(current => ({ ...current, fever: { childId: item.childId, episodeId: item.episodeId, temperature: String(item.temperature), unit: item.unit, method: item.method, notes: item.notes || '', takenAt: item.takenAt } }))
    setEditor({ kind: 'fever', id: item.id })
  }
  const openWeight = (item: MobileWeightMeasurementSummary) => {
    setForms(current => ({ ...current, weight: { childId: item.childId, weightKg: String(item.weightKg), notes: item.notes || '', measuredAt: item.measuredAt } }))
    setEditor({ kind: 'weight', id: item.id })
  }
  const openMedicine = (item: MobileMedicineSummary) => {
    setForms(current => ({
      ...current,
      medicine: {
        childId: item.childId, episodeId: item.episodeId || '', name: item.name, description: item.description || '',
        dosage: item.dosage, frequency: item.frequency, notes: item.notes || '', startDate: item.startDate.slice(0, 10),
        endDate: item.endDate?.slice(0, 10) || '', isActive: true, isPrn: item.isPrn,
        activeIngredient: item.activeIngredient || '', formulation: item.formulation || '', concentration: item.concentration || '',
        doseAmount: item.doseAmount == null ? '' : String(item.doseAmount), doseUnit: item.doseUnit || '',
        minGapHours: item.minGapHours == null ? '' : String(item.minGapHours),
        maxDosesPer24h: item.maxDosesPer24h == null ? '' : String(item.maxDosesPer24h),
        scheduleSource: item.scheduleSource || 'PACKAGING', scheduleSourceNotes: item.scheduleSourceNotes || '',
      },
    }))
    setEditor({ kind: 'medicine', id: item.id })
  }
  const openDose = (item: MobileMedicineDoseSummary) => {
    setWarnings([])
    setForms(current => ({ ...current, dose: { childId: item.childId, medicineId: item.medicineId, episodeId: item.episodeId, dosage: item.dosage, notes: item.notes || '', takenAt: item.takenAt, warningReason: '' } }))
    setEditor({ kind: 'dose', id: item.id })
  }
  const doseForMedicine = (medicine: MobileMedicineSummary) => openNew('dose', {
    childId: medicine.childId,
    medicineId: medicine.id,
    episodeId: medicine.episodeId || openEpisodes.find(item => item.childId === medicine.childId)?.id || '',
    dosage: medicine.dosage,
  })
  const mutate = async (path: string, method: string, body: object) => request<MobileHealthMutationResponse>(path, { method, body: JSON.stringify({ householdId, ...body }) })

  const save = async (force = false) => {
    if (!editor || !householdId) return
    setBusy(true)
    setError('')
    try {
      const { kind, id } = editor
      if (kind === 'child') await mutate('/api/mobile/v1/medicine/children', id ? 'PATCH' : 'POST', { ...forms.child, id })
      if (kind === 'episode') await mutate('/api/mobile/v1/medicine/episodes', 'POST', forms.episode)
      if (kind === 'fever') await mutate('/api/mobile/v1/medicine/fever', id ? 'PUT' : 'POST', { ...forms.fever, id, temperature: Number(forms.fever.temperature) })
      if (kind === 'weight') await mutate('/api/mobile/v1/medicine/weights', id ? 'PUT' : 'POST', { ...forms.weight, id, weightKg: Number(forms.weight.weightKg) })
      if (kind === 'medicine') await mutate('/api/mobile/v1/medicine/medicines', id ? 'PUT' : 'POST', {
        ...forms.medicine, id, doseAmount: Number(forms.medicine.doseAmount), minGapHours: Number(forms.medicine.minGapHours),
        maxDosesPer24h: Number(forms.medicine.maxDosesPer24h), episodeId: forms.medicine.episodeId || null,
        endDate: forms.medicine.endDate || null,
      })
      if (kind === 'dose') await mutate('/api/mobile/v1/medicine/doses', id ? 'PUT' : 'POST', { ...forms.dose, id, force })
      setEditor(null)
      setWarnings([])
      await load()
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409 && editor.kind === 'dose') {
        const payload = reason.data as { warnings?: MobileDoseWarning[] }
        setWarnings(payload.warnings || [])
        setError('Safety check stopped this dose. Review the warning and add a reason only if you must record what actually happened.')
      } else {
        setError(reason instanceof Error ? reason.message : 'Could not save health record.')
      }
    } finally {
      setBusy(false)
    }
  }

  const remove = (kind: 'fever' | 'weight' | 'medicine' | 'dose', id: string, label: string) => Alert.alert(
    (kind === 'medicine' ? 'Stop ' : 'Delete ') + label + '?',
    kind === 'medicine' ? 'Medicines with history are safely stopped instead of erased.' : 'This removes the selected record.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: kind === 'medicine' ? 'Stop' : 'Delete',
        style: 'destructive',
        onPress: () => {
          setBusy(true)
          const resource = kind === 'medicine' ? 'medicines' : kind === 'weight' ? 'weights' : kind === 'fever' ? 'fever' : 'doses'
          void mutate('/api/mobile/v1/medicine/' + resource, 'DELETE', { id })
            .then(async () => { setEditor(null); await load() })
            .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not remove record.'))
            .finally(() => setBusy(false))
        },
      },
    ],
  )

  const episodeAction = async (item: MobileHealthEpisodeSummary, action: 'close' | 'continue') => {
    setBusy(true)
    try { await mutate('/api/mobile/v1/medicine/episodes', 'PATCH', { id: item.id, action }); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update episode.') }
    finally { setBusy(false) }
  }

  if (!householdId) return <Screen><EmptyState icon="heart-outline" title="Create a household first" message="Health profiles belong to a household." /></Screen>
  if (loading) return <LoadingState label="Loading family health…" />

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
        <PageHeader eyebrow="FAMILY HEALTH" title="Care, recorded clearly" subtitle="A calm journal for medicines and important health events." />
        <InfoBanner tone="warning" title="Follow verified medical instructions" message="Clankeep records care; it does not prescribe treatment. Check packaging or clinician guidance before every dose." />
        <ErrorBanner message={error} />
        <SegmentedControl value={view} onChange={setView} options={[
          { value: 'overview', label: 'Overview', icon: 'heart-outline' },
          { value: 'journal', label: 'Journal', icon: 'time-outline' },
          { value: 'manage', label: 'Manage', icon: 'settings-outline' },
        ]} />
        {view === 'overview' ? <Overview data={data} doseForMedicine={doseForMedicine} /> : view === 'journal' ? (
          <Journal data={data} busy={busy} openNew={openNew} openDose={openDose} openFever={openFever} openWeight={openWeight} episodeAction={episodeAction} remove={remove} />
        ) : <Manage data={data} openNew={openNew} openChild={openChild} openMedicine={openMedicine} remove={remove} />}
      </Screen>

      <Modal visible={Boolean(editor)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditor(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
          <SheetHeader title={editor ? (editor.id ? 'Edit ' : 'New ') + editor.kind : ''} onClose={() => setEditor(null)} action={<AppButton compact label="Save" busy={busy} onPress={() => void save()} />} />
          <ScrollView keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formPage}>
            {editor ? <HealthForm editor={editor} forms={forms} setForms={setForms} data={data} warnings={warnings} forceSave={() => void save(true)} busy={busy} remove={remove} /> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  )
}

function Overview({ data, doseForMedicine }: { data: MobileMedicineOverviewResponse | null; doseForMedicine: (item: MobileMedicineSummary) => void }) {
  const { colors } = useAppTheme()
  const { compact } = useResponsive()
  return (
    <>
      <SectionHeader title="Children" detail={(data?.children.length || 0) + ' profiles'} />
      {data?.children.map(child => {
        const medicines = data.medicines.filter(item => item.childId === child.id)
        return (
          <Card key={child.id}>
            <View style={styles.childHead}>
              <View style={[styles.childAvatar, { backgroundColor: colors.dangerSoft }]}><Text style={[styles.childInitial, { color: colors.medicine }]}>{child.name.slice(0, 1)}</Text></View>
              <View style={styles.flex}><Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text><Text style={[styles.meta, { color: colors.muted }]}>{medicines.length} active medicine{medicines.length === 1 ? '' : 's'}</Text></View>
              <StatusPill tone={medicines.length ? 'primary' : 'neutral'} label={medicines.length ? 'Active care' : 'All clear'} />
            </View>
            {medicines.map(item => {
              const statusTone = !item.scheduleVerified ? 'warning' : item.dailyLimitReached || item.isDue ? 'danger' : 'success'
              const statusLabel = !item.scheduleVerified ? 'Schedule not verified' : item.dailyLimitReached ? 'Daily limit reached' : item.isPrn ? item.canGiveNow ? 'PRN · eligible now' : 'Eligible ' + dateTime(item.canGiveAt) : item.isDue ? 'Due now' : 'Next ' + dateTime(item.nextDoseAt)
              return (
                <View key={item.id} style={[styles.medicineLine, compact && styles.stack, { borderTopColor: colors.border }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.recordTitle, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.meta, { color: colors.muted }]}>{item.dosage} · {item.frequency}</Text>
                    <View style={styles.statusTop}><StatusPill tone={statusTone} label={statusLabel} /></View>
                  </View>
                  <AppButton compact fullWidth={compact} label="Record dose" variant="secondary" disabled={!item.scheduleVerified || !item.episodeId} onPress={() => doseForMedicine(item)} />
                </View>
              )
            })}
            {!medicines.length ? <Text style={[styles.emptyText, { color: colors.muted }]}>No active medicines.</Text> : null}
          </Card>
        )
      })}
      {!data?.children.length ? <EmptyState icon="happy-outline" title="No child profiles" message="Open Manage to add the first child." /> : null}
    </>
  )
}

function Journal({ data, busy, openNew, openDose, openFever, openWeight, episodeAction, remove }: {
  data: MobileMedicineOverviewResponse | null
  busy: boolean
  openNew: (kind: FormKind, seed?: Partial<Forms[FormKind]>) => void
  openDose: (item: MobileMedicineDoseSummary) => void
  openFever: (item: MobileFeverReadingSummary) => void
  openWeight: (item: MobileWeightMeasurementSummary) => void
  episodeAction: (item: MobileHealthEpisodeSummary, action: 'close' | 'continue') => Promise<void>
  remove: (kind: 'fever' | 'weight' | 'medicine' | 'dose', id: string, label: string) => void
}) {
  const { colors } = useAppTheme()
  const { compact } = useResponsive()
  const firstChild = data?.children[0]?.id || ''
  const activeEpisode = data?.recentEpisodes.find(item => !item.endedAt)
  return (
    <>
      <SectionHeader title="Quick record" detail="Choose what happened." />
      <View style={[styles.quickGrid, compact && styles.stack]}>
        <AppButton fullWidth={compact} compact label="New episode" icon="add-circle-outline" onPress={() => openNew('episode', { childId: firstChild })} />
        <AppButton fullWidth={compact} compact variant="secondary" label="Temperature" icon="thermometer-outline" onPress={() => openNew('fever', { childId: activeEpisode?.childId || firstChild, episodeId: activeEpisode?.id || '' })} />
        <AppButton fullWidth={compact} compact variant="secondary" label="Weight" icon="scale-outline" onPress={() => openNew('weight', { childId: firstChild })} />
      </View>

      <SectionHeader title="Illness episodes" />
      {data?.recentEpisodes.map(item => <Card key={item.id}><View style={[styles.recordRow, compact && styles.stack]}><ListRow icon="medkit-outline" iconColor={colors.medicine} title={item.title || 'Illness episode'} subtitle={item.childName + ' · ' + dateTime(item.startedAt) + (item.endedAt ? ' — ' + dateTime(item.endedAt) : ' · Current')} meta={item.doseCount + ' doses · ' + item.feverReadingCount + ' temperatures'} /><AppButton compact fullWidth={compact} variant="ghost" label={item.endedAt ? 'Continue' : 'Close'} disabled={busy} onPress={() => void episodeAction(item, item.endedAt ? 'continue' : 'close')} /></View></Card>)}
      {!data?.recentEpisodes.length ? <EmptyState icon="medkit-outline" title="No illness episodes" message="Start one when you need to keep related health records together." /> : null}

      <SectionHeader title="Doses" />
      {data?.recentDoses.map(item => <RecordCard key={item.id} title={item.medicineName} detail={item.childName + ' · ' + item.dosage + ' · ' + dateTime(item.takenAt)} icon="medical-outline" color={colors.medicine} onOpen={() => openDose(item)} onDelete={() => remove('dose', item.id, 'dose')} />)}

      <SectionHeader title="Temperatures" />
      {data?.recentFeverReadings.map(item => <RecordCard key={item.id} title={item.temperature.toFixed(1) + '°' + item.unit} detail={item.childName + ' · ' + item.method + ' · ' + dateTime(item.takenAt)} icon="thermometer-outline" color={colors.medicine} onOpen={() => openFever(item)} onDelete={() => remove('fever', item.id, 'temperature')} />)}

      <SectionHeader title="Weights" />
      {data?.recentWeights.map(item => <RecordCard key={item.id} title={item.weightKg.toFixed(1) + ' kg'} detail={item.childName + ' · ' + dateTime(item.measuredAt)} icon="scale-outline" color={colors.teal} onOpen={() => openWeight(item)} onDelete={() => remove('weight', item.id, 'weight')} />)}
    </>
  )
}

function RecordCard({ title, detail, icon, color, onOpen, onDelete }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; color: string; onOpen: () => void; onDelete: () => void }) {
  return <Card style={styles.recordCard}><ListRow icon={icon} iconColor={color} title={title} subtitle={detail} onPress={onOpen} trailing={<IconButton danger icon="trash-outline" label={'Delete ' + title} onPress={onDelete} />} /></Card>
}

function Manage({ data, openNew, openChild, openMedicine, remove }: {
  data: MobileMedicineOverviewResponse | null
  openNew: (kind: FormKind, seed?: Partial<Forms[FormKind]>) => void
  openChild: (item: MobileMedicineChildSummary) => void
  openMedicine: (item: MobileMedicineSummary) => void
  remove: (kind: 'fever' | 'weight' | 'medicine' | 'dose', id: string, label: string) => void
}) {
  const { colors } = useAppTheme()
  return (
    <>
      <SectionHeader title="Child profiles" action={<AppButton compact label="Add child" icon="add" onPress={() => openNew('child')} />} />
      {data?.children.map(item => <Card key={item.id} style={styles.recordCard}><ListRow icon="person-outline" iconColor={colors.medicine} title={item.name} subtitle={'Born ' + new Date(item.dateOfBirth).toLocaleDateString()} meta={item.isActive ? 'Active profile' : 'Inactive profile'} onPress={() => openChild(item)} /></Card>)}
      {!data?.children.length ? <EmptyState icon="people-outline" title="No child profiles" message="Add a child to begin recording family health." /> : null}

      <SectionHeader title="Medicines" action={<AppButton compact label="Add medicine" icon="add" disabled={!data?.children.length} onPress={() => openNew('medicine', { childId: data?.children[0]?.id || '', episodeId: data?.recentEpisodes.find(item => !item.endedAt)?.id || '' })} />} />
      {data?.medicines.map(item => <Card key={item.id} style={styles.recordCard}><ListRow icon="medical-outline" iconColor={colors.medicine} title={item.name} subtitle={item.childName + ' · ' + item.dosage + ' · ' + item.frequency} meta={item.scheduleVerified ? 'Verified schedule' : 'Verification incomplete'} onPress={() => openMedicine(item)} trailing={<IconButton danger icon="stop-circle-outline" label={'Stop ' + item.name} onPress={() => remove('medicine', item.id, 'medicine')} />} /></Card>)}
    </>
  )
}

function HealthForm({ editor, forms, setForms, data, warnings, forceSave, busy, remove }: {
  editor: Editor
  forms: Forms
  setForms: React.Dispatch<React.SetStateAction<Forms>>
  data: MobileMedicineOverviewResponse | null
  warnings: MobileDoseWarning[]
  forceSave: () => void
  busy: boolean
  remove: (kind: 'fever' | 'weight' | 'medicine' | 'dose', id: string, label: string) => void
}) {
  const { colors } = useAppTheme()
  const { compact } = useResponsive()
  const update = <K extends FormKind>(kind: K, patch: Partial<Forms[K]>) => setForms(current => ({ ...current, [kind]: { ...current[kind], ...patch } }))
  const childChoices = (kind: 'episode' | 'fever' | 'weight' | 'medicine' | 'dose') => (
    <><Text style={[styles.label, { color: colors.text }]}>Child</Text><View style={styles.choices}>{data?.children.map(child => <Choice key={child.id} label={child.name} selected={forms[kind].childId === child.id} onPress={() => update(kind, { childId: child.id } as Partial<Forms[typeof kind]>)} tone={colors.medicine} />)}</View></>
  )
  const episodeChoices = (kind: 'fever' | 'medicine' | 'dose') => (
    <><Text style={[styles.label, { color: colors.text }]}>Illness episode</Text><View style={styles.choices}>{data?.recentEpisodes.filter(item => item.childId === forms[kind].childId).map(item => <Choice key={item.id} label={(item.title || 'Episode') + (item.endedAt ? ' · closed' : '')} selected={forms[kind].episodeId === item.id} onPress={() => update(kind, { episodeId: item.id } as Partial<Forms[typeof kind]>)} tone={colors.medicine} />)}</View></>
  )
  const columns = [styles.two, compact && styles.stack]

  if (editor.kind === 'child') {
    const form = forms.child
    return <><Field label="Name" value={form.name} onChangeText={name => update('child', { name })} /><DateTimeField label="Date of birth" mode="date" maximumDate={new Date()} value={form.dateOfBirth} onChange={dateOfBirth => update('child', { dateOfBirth })} /><Field label="Notes" multiline value={form.notes} onChangeText={notes => update('child', { notes })} />{editor.id ? <ToggleRow label="Active profile" value={form.isActive} onChange={isActive => update('child', { isActive })} /> : null}</>
  }
  if (editor.kind === 'episode') {
    const form = forms.episode
    return <>{childChoices('episode')}<Field label="Title" placeholder="Flu, stomach bug…" value={form.title} onChangeText={title => update('episode', { title })} /><DateTimeField label="Started at" value={form.startedAt} onChange={startedAt => update('episode', { startedAt })} /><Field label="Notes" multiline value={form.notes} onChangeText={notes => update('episode', { notes })} /></>
  }
  if (editor.kind === 'fever') {
    const form = forms.fever
    return <>{childChoices('fever')}{episodeChoices('fever')}<View style={columns}><View style={styles.flex}><Field label="Temperature" keyboardType="decimal-pad" value={form.temperature} onChangeText={temperature => update('fever', { temperature })} /></View><View style={styles.compactField}><Text style={[styles.label, { color: colors.text }]}>Unit</Text><View style={styles.choices}>{(['C', 'F'] as const).map(unit => <Choice key={unit} label={'°' + unit} selected={form.unit === unit} onPress={() => update('fever', { unit })} tone={colors.medicine} />)}</View></View></View><Text style={[styles.label, { color: colors.text }]}>Method</Text><View style={styles.choices}>{(['forehead', 'ear', 'oral', 'axillary', 'rectal'] as const).map(method => <Choice key={method} label={method} selected={form.method === method} onPress={() => update('fever', { method })} tone={colors.medicine} />)}</View><DateTimeField label="Taken at" value={form.takenAt} onChange={takenAt => update('fever', { takenAt })} /><Field label="Notes" multiline value={form.notes} onChangeText={notes => update('fever', { notes })} />{editor.id ? <AppButton fullWidth variant="danger" label="Delete temperature" onPress={() => remove('fever', editor.id!, 'temperature')} /> : null}</>
  }
  if (editor.kind === 'weight') {
    const form = forms.weight
    return <>{childChoices('weight')}<Field label="Weight (kg)" keyboardType="decimal-pad" value={form.weightKg} onChangeText={weightKg => update('weight', { weightKg })} /><DateTimeField label="Measured at" value={form.measuredAt} onChange={measuredAt => update('weight', { measuredAt })} /><Field label="Notes" multiline value={form.notes} onChangeText={notes => update('weight', { notes })} />{editor.id ? <AppButton fullWidth variant="danger" label="Delete weight" onPress={() => remove('weight', editor.id!, 'weight')} /> : null}</>
  }
  if (editor.kind === 'medicine') {
    const form = forms.medicine
    return <>{childChoices('medicine')}{episodeChoices('medicine')}<InfoBanner tone="warning" title="Copy from the label or clinician" message="A medicine cannot be activated until every safety field is complete." /><Field label="Medicine name" value={form.name} onChangeText={name => update('medicine', { name })} /><Field label="Active ingredient" value={form.activeIngredient} onChangeText={activeIngredient => update('medicine', { activeIngredient })} /><View style={columns}><View style={styles.flex}><Field label="Formulation" placeholder="Liquid, tablet…" value={form.formulation} onChangeText={formulation => update('medicine', { formulation })} /></View><View style={styles.flex}><Field label="Concentration" placeholder="100 mg / 5 ml" value={form.concentration} onChangeText={concentration => update('medicine', { concentration })} /></View></View><View style={columns}><View style={styles.flex}><Field label="Dose amount" keyboardType="decimal-pad" value={form.doseAmount} onChangeText={doseAmount => update('medicine', { doseAmount })} /></View><View style={styles.flex}><Field label="Dose unit" value={form.doseUnit} onChangeText={doseUnit => update('medicine', { doseUnit })} /></View></View><Field label="Display dosage" placeholder="5 ml" value={form.dosage} onChangeText={dosage => update('medicine', { dosage })} /><Field label="Frequency" placeholder="every 6 hours" value={form.frequency} onChangeText={frequency => update('medicine', { frequency })} /><View style={columns}><View style={styles.flex}><Field label="Minimum gap (hours)" keyboardType="decimal-pad" value={form.minGapHours} onChangeText={minGapHours => update('medicine', { minGapHours })} /></View><View style={styles.flex}><Field label="Maximum / 24h" keyboardType="number-pad" value={form.maxDosesPer24h} onChangeText={maxDosesPer24h => update('medicine', { maxDosesPer24h })} /></View></View><Text style={[styles.label, { color: colors.text }]}>Schedule source</Text><View style={styles.choices}>{(['PACKAGING', 'LEAFLET', 'CLINICIAN'] as const).map(scheduleSource => <Choice key={scheduleSource} label={scheduleSource.toLowerCase()} selected={form.scheduleSource === scheduleSource} onPress={() => update('medicine', { scheduleSource })} tone={colors.medicine} />)}</View><ToggleRow label="As needed (PRN)" value={form.isPrn} onChange={isPrn => update('medicine', { isPrn, ...(isPrn ? { frequency: 'as needed' } : {}) })} /><View style={columns}><View style={styles.flex}><DateTimeField label="Start date" mode="date" value={form.startDate} onChange={startDate => update('medicine', { startDate })} /></View><View style={styles.flex}><DateTimeField label="End date" mode="date" optional value={form.endDate} onChange={endDate => update('medicine', { endDate })} /></View></View><Field label="Description" multiline value={form.description} onChangeText={description => update('medicine', { description })} /><Field label="Instructions / notes" multiline value={form.notes} onChangeText={notes => update('medicine', { notes })} /><Field label="Source notes" multiline value={form.scheduleSourceNotes} onChangeText={scheduleSourceNotes => update('medicine', { scheduleSourceNotes })} />{editor.id ? <AppButton fullWidth variant="danger" label="Stop medicine" onPress={() => remove('medicine', editor.id!, 'medicine')} /> : null}</>
  }

  const form = forms.dose
  const medicines = data?.medicines.filter(item => item.childId === form.childId) || []
  return <>{childChoices('dose')}<Text style={[styles.label, { color: colors.text }]}>Medicine</Text><View style={styles.choices}>{medicines.map(item => <Choice key={item.id} label={item.name} selected={form.medicineId === item.id} onPress={() => update('dose', { medicineId: item.id, dosage: item.dosage, episodeId: item.episodeId || form.episodeId })} tone={colors.medicine} />)}</View>{episodeChoices('dose')}<Field label="Dosage given" value={form.dosage} onChangeText={dosage => update('dose', { dosage })} /><DateTimeField label="Taken at" value={form.takenAt} onChange={takenAt => update('dose', { takenAt })} /><Field label="Notes" multiline value={form.notes} onChangeText={notes => update('dose', { notes })} />{warnings.length ? <><InfoBanner tone="warning" title="Dose safety warning" message={warnings.map(item => item.kind === 'daily-limit' ? 'Daily limit: ' + item.count + ' of ' + item.max + ' already recorded.' : 'Minimum ' + item.minGapHours + 'h gap; earliest indicated time ' + (item.earliestSafeTime ? dateTime(item.earliestSafeTime) : 'unknown') + '.').join(' ')} /><Field label="Why must this factual record be saved?" value={form.warningReason} onChangeText={warningReason => update('dose', { warningReason })} /><AppButton fullWidth variant="danger" label="Record anyway" busy={busy} disabled={!form.warningReason.trim()} onPress={forceSave} /></> : null}{editor.id ? <AppButton fullWidth variant="danger" label="Delete dose" onPress={() => remove('dose', editor.id!, 'dose')} /> : null}</>
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useAppTheme()
  return <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.primary }} thumbColor="#FFFFFF" /></View>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  childHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  childAvatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  childInitial: { fontFamily: fontFamilies.displayBold, fontSize: 18 },
  childName: { fontFamily: fontFamilies.displayBold, fontSize: 18 },
  meta: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  medicineLine: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 14 },
  recordTitle: { fontFamily: fontFamilies.bodyBold, fontSize: 15, lineHeight: 20 },
  statusTop: { marginTop: 7 },
  emptyText: { fontFamily: fontFamilies.body, marginTop: 14 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordCard: { paddingHorizontal: 14, paddingVertical: 3 },
  modal: { flex: 1 },
  formPage: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: spacing.md, paddingBottom: 70, gap: spacing.md },
  label: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13, lineHeight: 18 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { minHeight: Platform.OS === 'ios' ? 54 : 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radii.medium, paddingHorizontal: 14 },
  two: { flexDirection: 'row', gap: 12 },
  compactField: { minWidth: 110, gap: 7 },
})
