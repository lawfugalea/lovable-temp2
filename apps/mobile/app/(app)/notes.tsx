import type { MobileNoteColor, MobileNoteResponse, MobileNoteSummary, MobileNotesResponse } from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth/AuthProvider'
import { RichNoteEditor } from '@/RichNoteEditor'
import { RichNotePreview, RichNoteView } from '@/RichNoteView'
import { setTaskItemChecked } from '@/noteChecklist'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import { AppButton, Card, EmptyState, ErrorBanner, Field, IconButton, LoadingState, PageHeader, Screen, SectionHeader, SegmentedControl, SheetHeader, StatusPill, useResponsive } from '@/ui'

const noteColors: MobileNoteColor[] = ['yellow', 'green', 'blue', 'purple', 'pink', 'gray']
const lightBackgrounds: Record<MobileNoteColor, string> = { yellow: '#FFF7D6', green: '#E9F8EE', blue: '#EAF2FF', purple: '#F1EBFF', pink: '#FDECF3', gray: '#EFF1F5' }
const darkBackgrounds: Record<MobileNoteColor, string> = { yellow: '#383119', green: '#19362B', blue: '#1D2D4D', purple: '#30254C', pink: '#412536', gray: '#273246' }
type NotesView = 'active' | 'archive'
type EditorState = { note: MobileNoteSummary | 'new'; editing: boolean; title: string; contentText: string; contentJson: unknown | null; isShared: boolean; color: MobileNoteColor }

function SharingToggle({ value, offColor, onColor }: { value: boolean; offColor: string; onColor: string }) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(progress, { toValue: value ? 1 : 0, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [progress, value])
  return <Animated.View style={[styles.shareToggle, { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [offColor, onColor] }) }]}><Animated.View style={[styles.shareThumb, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }] }]} /></Animated.View>
}

export default function NotesScreen() {
  const { colors, dark } = useAppTheme()
  const { tablet } = useResponsive()
  const { bootstrap, request } = useAuth()
  const householdId = bootstrap?.activeHouseholdId
  const [notes, setNotes] = useState<MobileNoteSummary[]>([])
  const [view, setView] = useState<NotesView>('active')
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const backgrounds = dark ? darkBackgrounds : lightBackgrounds

  const load = useCallback(async () => {
    if (!householdId) return
    const result = await request<MobileNotesResponse>(`/api/mobile/v1/notes?householdId=${encodeURIComponent(householdId)}`)
    setNotes(result.notes)
  }, [householdId, request])
  useEffect(() => { setLoading(true); void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load notes.')).finally(() => setLoading(false)) }, [load])
  const refresh = async () => { setRefreshing(true); setError(''); try { await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh notes.') } finally { setRefreshing(false) } }
  const open = (note?: MobileNoteSummary) => setEditor(note ? { note, editing: false, title: note.title, contentText: note.contentText, contentJson: note.contentJson, isShared: note.isShared, color: note.color } : { note: 'new', editing: true, title: '', contentText: '', contentJson: { type: 'doc', content: [{ type: 'paragraph' }] }, isShared: true, color: 'yellow' })
  const closeEditor = () => setEditor(current => {
    if (!current || current.note === 'new' || !current.editing) return null
    const note = current.note
    return { note, editing: false, title: note.title, contentText: note.contentText, contentJson: note.contentJson, isShared: note.isShared, color: note.color }
  })
  const save = async () => {
    if (!householdId || !editor || !editor.title.trim()) return
    setBusy('save'); setError('')
    try {
      const existing = editor.note === 'new' ? null : editor.note
      const result = await request<MobileNoteResponse>(existing ? `/api/mobile/v1/notes/${encodeURIComponent(existing.id)}` : '/api/mobile/v1/notes', { method: existing ? 'PATCH' : 'POST', body: JSON.stringify({ householdId, title: editor.title, contentText: editor.contentText, contentJson: editor.contentJson, isShared: editor.isShared, color: editor.color }) })
      setNotes(current => [result.note, ...current.filter(note => note.id !== result.note.id)])
      setEditor({ note: result.note, editing: false, title: result.note.title, contentText: result.note.contentText, contentJson: result.note.contentJson, isShared: result.note.isShared, color: result.note.color })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save note.') } finally { setBusy('') }
  }
  const organize = async (note: MobileNoteSummary, patch: { isPinned?: boolean; isArchived?: boolean }) => {
    if (!householdId) return
    setBusy(note.id)
    try {
      const result = await request<MobileNoteResponse>(`/api/mobile/v1/notes/${encodeURIComponent(note.id)}`, { method: 'PATCH', body: JSON.stringify({ householdId, ...patch }) })
      setNotes(current => current.map(item => item.id === note.id ? result.note : item))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not organize note.') } finally { setBusy('') }
  }
  const remove = (note: MobileNoteSummary) => Alert.alert('Delete note?', `Delete “${note.title}” and its attachments?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { if (!householdId) return; setBusy(note.id); void request<{ ok: true }>(`/api/mobile/v1/notes/${encodeURIComponent(note.id)}`, { method: 'DELETE', body: JSON.stringify({ householdId }) }).then(() => setNotes(current => current.filter(item => item.id !== note.id))).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not delete note.')).finally(() => setBusy('')) } }])
  const upload = async () => {
    if (!editor || editor.note === 'new') return
    const note = editor.note
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.72, base64: true })
    if (result.canceled || !result.assets[0]?.base64) return
    setBusy('attachment')
    try {
      const response = await request<{ attachment: MobileNoteSummary['attachments'][number] }>('/api/mobile/v1/notes/attachments', { method: 'POST', body: JSON.stringify({ noteId: note.id, base64: result.assets[0].base64 }) })
      setEditor(current => current && current.note !== 'new' ? { ...current, note: { ...current.note, attachments: [...current.note.attachments, response.attachment] } } : current)
      setNotes(current => current.map(item => item.id === note.id ? { ...item, attachments: [...item.attachments, response.attachment] } : item))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not attach image.') } finally { setBusy('') }
  }
  const removeAttachment = async (attachmentId: string) => {
    if (!editor || editor.note === 'new') return
    const note = editor.note
    setBusy(attachmentId)
    try {
      await request('/api/mobile/v1/notes/attachments', { method: 'DELETE', body: JSON.stringify({ noteId: note.id, attachmentId }) })
      setEditor(current => current && current.note !== 'new' ? { ...current, note: { ...current.note, attachments: current.note.attachments.filter(item => item.id !== attachmentId) } } : current)
      setNotes(current => current.map(item => item.id === note.id ? { ...item, attachments: item.attachments.filter(attachment => attachment.id !== attachmentId) } : item))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove attachment.') } finally { setBusy('') }
  }
  const toggleTask = async (note: MobileNoteSummary, path: number[], checked: boolean) => {
    if (!householdId || !note.canEdit || busy) return
    const contentJson = setTaskItemChecked(note.contentJson, path, checked)
    if (!contentJson) return
    const optimistic = { ...note, contentJson }
    const apply = (next: MobileNoteSummary) => {
      setNotes(current => current.map(item => item.id === next.id ? next : item))
      setEditor(current => current && current.note !== 'new' && current.note.id === next.id ? { ...current, note: next, contentText: next.contentText, contentJson: next.contentJson } : current)
    }
    setBusy(`task:${note.id}`); setError(''); apply(optimistic)
    try {
      const result = await request<MobileNoteResponse>(`/api/mobile/v1/notes/${encodeURIComponent(note.id)}`, { method: 'PATCH', body: JSON.stringify({ householdId, contentText: note.contentText, contentJson }) })
      apply(result.note)
    } catch (reason) {
      apply(note)
      setError(reason instanceof Error ? reason.message : 'Could not update this checklist item.')
    } finally { setBusy('') }
  }
  const visible = useMemo(() => notes.filter(note => note.isArchived === (view === 'archive') && (!search.trim() || `${note.title} ${note.contentText}`.toLowerCase().includes(search.trim().toLowerCase()))), [notes, search, view])

  if (!householdId) return <Screen><EmptyState icon="document-text-outline" title="Create a household first" message="Notes can be shared after your household is set up." /></Screen>
  if (loading) return <LoadingState label="Loading notes…" />
  return <>
    <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
      <PageHeader eyebrow="NOTES" title="Keep what matters" subtitle="Ideas, lists and household references—always close by." action={<IconButton filled icon="add" label="New note" onPress={() => open()} />} />
      <ErrorBanner message={error} />
      <Field label="Search" leadingIcon="search-outline" placeholder="Search notes" value={search} onChangeText={setSearch} />
      <SegmentedControl value={view} onChange={setView} options={[{ value: 'active', label: 'Active', icon: 'documents-outline' }, { value: 'archive', label: 'Archive', icon: 'archive-outline' }]} />
      {visible.length ? <View style={styles.grid}>{visible.map(note => <Card key={note.id} style={[styles.noteCard, tablet && styles.noteCardTablet, { backgroundColor: backgrounds[note.color] }]}>
        <Pressable accessibilityRole="button" onPress={() => open(note)} style={({ pressed }) => [styles.noteBody, pressed && styles.pressed]}>
          <View style={styles.noteHead}><View style={styles.noteTitleRow}>{note.isPinned ? <Ionicons name="pin" size={16} color={colors.notes} /> : null}<Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text></View><StatusPill label={note.isShared ? 'Shared' : 'Personal'} tone={note.isShared ? 'primary' : 'neutral'} /></View>
          <View style={styles.preview}><RichNotePreview contentJson={note.contentJson} contentText={note.contentText} onToggleTask={note.canEdit && !busy ? (path, checked) => void toggleTask(note, path, checked) : undefined} /></View>
          <View style={styles.metaRow}><Text style={[styles.meta, { color: colors.muted }]}>{note.ownerName}</Text>{note.attachments.length ? <View style={styles.attachmentCount}><Ionicons name="image-outline" size={14} color={colors.muted} /><Text style={[styles.meta, { color: colors.muted }]}>{note.attachments.length}</Text></View> : null}</View>
        </Pressable>
        {note.canDelete ? <View style={[styles.noteActions, { borderTopColor: colors.border }]}><IconButton icon={note.isPinned ? 'pin-outline' : 'pin'} label={note.isPinned ? 'Unpin note' : 'Pin note'} disabled={busy === note.id} onPress={() => void organize(note, { isPinned: !note.isPinned })} /><IconButton icon={note.isArchived ? 'return-up-back-outline' : 'archive-outline'} label={note.isArchived ? 'Restore note' : 'Archive note'} disabled={busy === note.id} onPress={() => void organize(note, { isArchived: !note.isArchived })} /><IconButton danger icon="trash-outline" label="Delete note" disabled={busy === note.id} onPress={() => remove(note)} /></View> : null}
      </Card>)}</View> : <EmptyState icon="document-text-outline" title={view === 'archive' ? 'Archive is empty' : 'No notes here'} message={search ? 'Try a different search.' : 'Create a note for ideas, instructions, or anything your household needs.'} action={view === 'active' && !search ? <AppButton compact label="Create note" icon="add" onPress={() => open()} /> : undefined} />}
    </Screen>
    <Modal visible={Boolean(editor)} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEditor}>
      <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <SheetHeader
          title={editor?.note === 'new' ? 'New note' : editor?.editing ? 'Edit note' : 'Note'}
          onClose={closeEditor}
          action={editor?.editing
            ? <AppButton compact label="Save" busy={busy === 'save'} disabled={!editor.title.trim() || (editor.note !== 'new' && !editor.note.canEdit)} onPress={() => void save()} />
            : editor?.note !== 'new' && editor?.note.canEdit
              ? <AppButton compact label="Edit" icon="create-outline" onPress={() => setEditor(current => current ? { ...current, editing: true } : current)} />
              : undefined}
        />
        {editor?.editing ? <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorPage}>
          <Field label="Title" value={editor.title} onChangeText={title => setEditor(current => current ? { ...current, title } : current)} editable={editor.note === 'new' || editor.note.canEdit} />
          <RichNoteEditor key={editor.note === 'new' ? 'new' : editor.note.id} initialJson={editor.contentJson} initialText={editor.contentText} editable={editor.note === 'new' || editor.note.canEdit} onChange={value => setEditor(current => current ? { ...current, ...value } : current)} />
          <SectionHeader title="Style & sharing" detail="Choose how this note feels and who can see it." />
          <View style={styles.colors}>{noteColors.map(color => <Pressable accessibilityLabel={`${color} note`} accessibilityRole="radio" accessibilityState={{ checked: editor.color === color }} key={color} onPress={() => setEditor(current => current ? { ...current, color } : current)} style={[styles.color, { backgroundColor: backgrounds[color], borderColor: editor.color === color ? colors.primary : colors.border }, editor.color === color && styles.colorSelected]}>{editor.color === color ? <Ionicons name="checkmark" size={19} color={colors.primary} /> : null}</Pressable>)}</View>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: editor.isShared, disabled: editor.note !== 'new' && !editor.note.canDelete }} disabled={editor.note !== 'new' && !editor.note.canDelete} onPress={() => setEditor(current => current ? { ...current, isShared: !current.isShared } : current)} style={({ pressed }) => [styles.share, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.shareIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={editor.isShared ? 'people' : 'lock-closed-outline'} size={21} color={colors.primary} /></View><View style={styles.flex}><Text style={[styles.shareText, { color: colors.text }]}>{editor.isShared ? 'Shared with household' : 'Personal note'}</Text><Text style={[styles.shareHint, { color: colors.muted }]}>{editor.isShared ? 'Everyone in this household can find it.' : 'Only you can see this note.'}</Text></View><SharingToggle value={editor.isShared} offColor={colors.borderStrong} onColor={colors.primary} /></Pressable>
          {editor.note !== 'new' ? <><SectionHeader title="Attachments" detail="Images up to 3 MB" action={<AppButton compact variant="secondary" label="Add image" icon="image-outline" busy={busy === 'attachment'} onPress={() => void upload()} />} />{editor.note.attachments.length ? <View style={styles.attachments}>{editor.note.attachments.map(item => <Card key={item.id} style={styles.attachmentCard}><View style={[styles.attachmentPreview, { backgroundColor: colors.notes + '20' }]}><Ionicons name="image-outline" size={25} color={colors.notes} /></View><View style={styles.flex}><Text numberOfLines={1} style={[styles.attachmentName, { color: colors.text }]}>{item.filename}</Text><Text style={[styles.meta, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text></View><IconButton danger icon="trash-outline" label="Remove attachment" disabled={busy === item.id} onPress={() => void removeAttachment(item.id)} /></Card>)}</View> : <Text style={[styles.hint, { color: colors.muted }]}>No images attached yet.</Text>}</> : <Text style={[styles.hint, { color: colors.muted }]}>Save the note once before adding images.</Text>}
        </ScrollView> : editor ? <ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.viewerPage}>
          <View style={styles.viewerHeader}>
            <View style={styles.viewerStatus}><StatusPill label={editor.isShared ? 'Shared' : 'Personal'} tone={editor.isShared ? 'primary' : 'neutral'} /><Text style={[styles.viewerMeta, { color: colors.muted }]}>{editor.note === 'new' ? '' : `Updated ${new Date(editor.note.updatedAt).toLocaleDateString()}`}</Text></View>
            <Text style={[styles.viewerTitle, { color: colors.text }]}>{editor.title}</Text>
            {editor.note !== 'new' ? <Text style={[styles.viewerMeta, { color: colors.muted }]}>By {editor.note.ownerName}</Text> : null}
          </View>
          <View style={[styles.viewerPaper, { backgroundColor: backgrounds[editor.color], borderColor: colors.border }]}><RichNoteView contentJson={editor.contentJson} contentText={editor.contentText} onToggleTask={editor.note !== 'new' && editor.note.canEdit && !busy ? (path, checked) => void toggleTask(editor.note as MobileNoteSummary, path, checked) : undefined} /></View>
          {editor.note !== 'new' && editor.note.attachments.length ? <><SectionHeader title="Attachments" /><View style={styles.attachments}>{editor.note.attachments.map(item => <Card key={item.id} style={styles.attachmentCard}><View style={[styles.attachmentPreview, { backgroundColor: colors.notes + '20' }]}><Ionicons name="image-outline" size={25} color={colors.notes} /></View><View style={styles.flex}><Text numberOfLines={1} style={[styles.attachmentName, { color: colors.text }]}>{item.filename}</Text><Text style={[styles.meta, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text></View></Card>)}</View></> : null}
        </ScrollView> : null}
      </SafeAreaView>
    </Modal>
  </>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  noteCard: { width: '100%', padding: 0, overflow: 'hidden' },
  noteCardTablet: { width: '48.8%' },
  noteBody: { minHeight: 142, padding: spacing.md },
  noteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  noteTitle: { flex: 1, fontFamily: fontFamilies.displayBold, fontSize: 18, lineHeight: 23 },
  preview: { fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  meta: { fontFamily: fontFamilies.bodyMedium, fontSize: 12, lineHeight: 17 },
  attachmentCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteActions: { minHeight: 60, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.72 },
  modal: { flex: 1 },
  editorPage: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  viewerPage: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  viewerHeader: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  viewerStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  viewerTitle: { fontFamily: fontFamilies.displayExtraBold, fontSize: 30, lineHeight: 37, marginTop: spacing.xs },
  viewerMeta: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, lineHeight: 18 },
  viewerPaper: { minHeight: 180, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.large, padding: spacing.lg },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  color: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3 },
  share: { minHeight: 72, borderRadius: radii.medium, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  shareIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shareToggle: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center' },
  shareThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  shareText: { fontFamily: fontFamilies.bodyBold, fontSize: 15 },
  shareHint: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  attachments: { gap: spacing.sm },
  attachmentCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  attachmentPreview: { width: 54, height: 54, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center' },
  attachmentName: { fontFamily: fontFamilies.bodyBold, fontSize: 14 },
  hint: { fontFamily: fontFamilies.body, fontSize: 13 },
})
