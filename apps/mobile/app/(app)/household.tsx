import type { MobileCreateHouseholdResponse, MobileCreateInviteResponse, MobileWorkspaceMember, MobileWorkspaceResponse, MobileWorkspaceUpdateResponse } from '@clankeep/contracts'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { useNotifications } from '@/notifications/NotificationProvider'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import { AppButton, BrandHero, Card, EmptyState, ErrorBanner, Field, IconButton, LoadingState, Screen, SectionHeader, SegmentedControl, StatusPill, useResponsive } from '@/ui'

export default function FamilyScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { compact, tablet } = useResponsive()
  const { bootstrap, request, reloadBootstrap, logout } = useAuth()
  const notifications = useNotifications()
  const householdId = bootstrap?.activeHouseholdId
  const [workspace, setWorkspace] = useState<MobileWorkspaceResponse | null>(null)
  const [profileName, setProfileName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [invite, setInvite] = useState({ email: '', role: 'MEMBER' as 'MEMBER' | 'OWNER' })
  const [loading, setLoading] = useState(Boolean(householdId))
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!householdId) { setWorkspace(null); return }
    const next = await request<MobileWorkspaceResponse>(`/api/mobile/v1/workspace?householdId=${encodeURIComponent(householdId)}`)
    setWorkspace(next); setProfileName(next.profile.name); setHouseholdName(next.household.name)
  }, [householdId, request])
  useEffect(() => { setLoading(Boolean(householdId)); void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load family settings.')).finally(() => setLoading(false)) }, [householdId, load])
  const refresh = async () => { setRefreshing(true); setError(''); try { await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh family settings.') } finally { setRefreshing(false) } }
  const createHousehold = async () => { setBusy('create-household'); setError(''); try { await request<MobileCreateHouseholdResponse>('/api/mobile/v1/household/create', { method: 'POST', body: JSON.stringify({ name: newHouseholdName, country: 'MT' }) }); await reloadBootstrap() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create household.') } finally { setBusy('') } }
  const saveWorkspace = async (action: 'profile' | 'household') => { if (!householdId) return; setBusy(action); setError(''); try { const result = await request<MobileWorkspaceUpdateResponse>('/api/mobile/v1/workspace', { method: 'PATCH', body: JSON.stringify({ householdId, action, name: action === 'profile' ? profileName : householdName }) }); setWorkspace(result.workspace); if (action === 'household') await reloadBootstrap() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save changes.') } finally { setBusy('') } }
  const sendInvite = async () => { if (!householdId) return; setBusy('invite'); setError(''); try { const result = await request<MobileCreateInviteResponse>('/api/mobile/v1/family/invites', { method: 'POST', body: JSON.stringify({ householdId, ...invite }) }); setWorkspace(current => current ? { ...current, invites: [...current.invites, result.invite] } : current); setInvite({ email: '', role: 'MEMBER' }); if (!result.emailSent) setError('The invitation was created, but the email provider did not confirm delivery.') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send invitation.') } finally { setBusy('') } }
  const revokeInvite = (id: string, email: string | null) => Alert.alert('Cancel invitation?', `Cancel the invitation for ${email || 'this person'}?`, [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel invitation', style: 'destructive', onPress: () => { if (!householdId) return; setBusy(id); void request<{ ok: true }>(`/api/mobile/v1/family/invites/${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify({ householdId }) }).then(() => setWorkspace(current => current ? { ...current, invites: current.invites.filter(item => item.id !== id) } : current)).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not cancel invitation.')).finally(() => setBusy('')) } }])
  const updateMember = async (member: MobileWorkspaceMember, action: 'role' | 'remove') => { if (!householdId) return; setBusy(member.membershipId); setError(''); try { await request<{ ok: true }>(`/api/mobile/v1/family/members/${encodeURIComponent(member.membershipId)}`, { method: action === 'remove' ? 'DELETE' : 'PATCH', body: JSON.stringify({ householdId, ...(action === 'role' ? { role: member.role === 'OWNER' ? 'MEMBER' : 'OWNER' } : {}) }) }); await load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update member.') } finally { setBusy('') } }
  const confirmRemove = (member: MobileWorkspaceMember) => Alert.alert('Remove household member?', `${member.name} will lose access to this household.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void updateMember(member, 'remove') }])

  if (loading) return <LoadingState label="Loading family workspace…" />
  return <Screen refreshing={refreshing} onRefresh={() => void refresh()}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="chevron-back" size={20} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>Home</Text></Pressable>
    <BrandHero eyebrow="FAMILY & ACCOUNT" title={workspace?.household.name || 'Create your household'} subtitle={workspace ? 'The people, invitations and details that make this space yours.' : 'Give your shared space a name to finish setup.'} compact />
    <ErrorBanner message={error} />
    {!householdId ? <Card><View style={styles.stack}><Field label="Household name" leadingIcon="home-outline" placeholder="The Smith family" value={newHouseholdName} onChangeText={setNewHouseholdName} /><AppButton fullWidth label="Create household" icon="home-outline" busy={busy === 'create-household'} disabled={newHouseholdName.trim().length < 2} onPress={() => void createHousehold()} /></View></Card> : <>
      <SectionHeader title="People" detail={`${workspace?.members.length || 0} household members`} />
      <View style={styles.stack}>{workspace?.members.map(member => {
        const canManage = workspace.household.role === 'OWNER' && !member.isCurrentUser
        return <Card key={member.membershipId} style={styles.personCard}><View style={[styles.personRow, compact && styles.personRowCompact]}><View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{member.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.flex}><View style={styles.nameRow}><Text style={[styles.name, { color: colors.text }]}>{member.name}</Text>{member.isCurrentUser ? <StatusPill label="You" tone="primary" /> : null}</View><Text style={[styles.meta, { color: colors.muted }]}>{member.email}</Text><View style={styles.rolePill}><StatusPill label={member.role === 'OWNER' ? 'Owner' : 'Member'} tone={member.role === 'OWNER' ? 'primary' : 'neutral'} /></View></View>{canManage ? <View style={[styles.actions, compact && styles.actionsCompact]}><IconButton label={member.role === 'OWNER' ? 'Make member' : 'Make owner'} icon="swap-horizontal-outline" disabled={busy === member.membershipId} onPress={() => void updateMember(member, 'role')} />{member.role === 'MEMBER' ? <IconButton danger label="Remove member" icon="person-remove-outline" disabled={busy === member.membershipId} onPress={() => confirmRemove(member)} /> : null}</View> : null}</View></Card>
      })}</View>
      {workspace?.household.role === 'OWNER' ? <>
        <SectionHeader title="Invite someone" detail="Invitations expire after seven days" />
        <Card><View style={styles.stack}><Field label="Email address" leadingIcon="mail-outline" autoCapitalize="none" keyboardType="email-address" placeholder="person@example.com" value={invite.email} onChangeText={email => setInvite(current => ({ ...current, email }))} /><SegmentedControl value={invite.role} onChange={role => setInvite(current => ({ ...current, role }))} options={[{ value: 'MEMBER', label: 'Member', icon: 'person-outline' }, { value: 'OWNER', label: 'Owner', icon: 'key-outline' }]} /><Text style={[styles.helper, { color: colors.muted }]}>{invite.role === 'OWNER' ? 'Owners can manage household members and settings.' : 'Members can use the shared household features.'}</Text><AppButton fullWidth label="Send invitation" icon="paper-plane-outline" busy={busy === 'invite'} disabled={!invite.email.trim()} onPress={() => void sendInvite()} /></View></Card>
        {workspace.invites.length ? <View style={styles.stack}>{workspace.invites.map(item => <Card key={item.id} style={styles.inviteCard}><View style={[styles.personRow, compact && styles.personRowCompact]}><View style={[styles.inviteIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="mail-unread-outline" size={21} color={colors.primary} /></View><View style={styles.flex}><Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{item.email || 'Invitation link'}</Text><Text style={[styles.meta, { color: colors.muted }]}>{item.role === 'OWNER' ? 'Owner' : 'Member'} · expires {new Date(item.expiresAt).toLocaleDateString()}</Text></View><IconButton danger label="Cancel invitation" icon="close-outline" disabled={busy === item.id} onPress={() => revokeInvite(item.id, item.email)} /></View></Card>)}</View> : null}
      </> : null}
      <SectionHeader title="Children" detail={`${workspace?.children.length || 0} profiles`} />
      {workspace?.children.length ? <View style={styles.childrenGrid}>{workspace.children.map(child => <Card key={child.id} style={[styles.childCard, tablet && styles.childCardTablet]}><View style={styles.personRow}><View style={[styles.childIcon, { backgroundColor: colors.dangerSoft }]}><Ionicons name="happy-outline" size={22} color={colors.medicine} /></View><View style={styles.flex}><View style={styles.nameRow}><Text style={[styles.name, { color: colors.text }]}>{child.name}</Text>{!child.isActive ? <StatusPill label="Inactive" /> : null}</View><Text style={[styles.meta, { color: colors.muted }]}>Born {new Date(child.dateOfBirth).toLocaleDateString()}</Text></View></View></Card>)}</View> : <EmptyState icon="happy-outline" title="No child profiles" message="Add a child from Health to track medicines, temperatures, and weights." />}
      <SectionHeader title="Account settings" detail="Changes are shared with the web app." />
      <View style={[styles.settingsGrid, tablet && styles.settingsGridTablet]}><Card style={tablet && styles.settingsCard}><View style={styles.stack}><View style={[styles.settingsIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="person-outline" size={22} color={colors.primary} /></View><Field label="Your name" value={profileName} onChangeText={setProfileName} /><Text style={[styles.meta, { color: colors.muted }]}>{workspace?.profile.email}</Text><AppButton variant="secondary" label="Save your name" busy={busy === 'profile'} disabled={profileName.trim().length < 2} onPress={() => void saveWorkspace('profile')} /></View></Card>
      {workspace?.household.role === 'OWNER' ? <Card style={tablet && styles.settingsCard}><View style={styles.stack}><View style={[styles.settingsIcon, { backgroundColor: colors.notes + '1F' }]}><Ionicons name="home-outline" size={22} color={colors.notes} /></View><Field label="Household name" value={householdName} onChangeText={setHouseholdName} /><Text style={[styles.meta, { color: colors.muted }]}>Country: {workspace.household.country}</Text><AppButton variant="secondary" label="Save household name" busy={busy === 'household'} disabled={householdName.trim().length < 2} onPress={() => void saveWorkspace('household')} /></View></Card> : null}</View>
      <SectionHeader title="Notifications" detail="Choose which time-sensitive reminders this phone should show." action={notifications.preferences.enabled ? <StatusPill label={`${notifications.scheduledCount} upcoming`} tone="primary" /> : undefined} />
      <Card style={styles.notificationCard}><NotificationToggle icon="notifications-outline" label="Clankeep reminders" description="Opt in on this phone. You can turn reminders off at any time." value={notifications.preferences.enabled} disabled={!notifications.ready || notifications.syncing} onChange={value => void notifications.setEnabled(value)} />
        {notifications.preferences.enabled ? <View style={[styles.notificationOptions, { borderTopColor: colors.border }]}>
          <NotificationToggle icon="medical-outline" label="Medicine doses" description="Verified, scheduled medicines only; PRN medicines are never inferred." value={notifications.preferences.medicine} disabled={notifications.syncing} onChange={value => void notifications.setCategory('medicine', value)} />
          <NotificationToggle icon="checkmark-circle-outline" label="Due chores" description="A morning reminder when chores are due in the next seven days." value={notifications.preferences.chores} disabled={notifications.syncing} onChange={value => void notifications.setCategory('chores', value)} />
          <NotificationToggle icon="restaurant-outline" label="Planned meals" description="A late-afternoon reminder for dated dinner plans." value={notifications.preferences.meals} disabled={notifications.syncing} onChange={value => void notifications.setCategory('meals', value)} />
          <NotificationToggle icon="receipt-outline" label="Recurring payments" description="Reminders based on visible subscription due dates." value={notifications.preferences.finance} disabled={notifications.syncing} onChange={value => void notifications.setCategory('finance', value)} />
          <Text style={[styles.notificationSafety, { color: colors.muted }]}>Phone reminders can be delayed or hidden by device settings. Always verify medicine timing and safety inside Health before recording a dose.</Text>
          <AppButton fullWidth label="Send test notification" icon="notifications" busy={notifications.testing} disabled={notifications.syncing} onPress={() => void notifications.sendTest()} />
          <AppButton fullWidth variant="secondary" label="Refresh upcoming reminders" icon="refresh-outline" busy={notifications.syncing} onPress={() => void notifications.sync()} />
        </View> : null}
        {notifications.error ? <View style={styles.notificationError}><Text style={[styles.helper, { color: colors.danger }]}>{notifications.error}</Text>{notifications.permission === 'denied' ? <AppButton compact variant="secondary" label="Open phone settings" icon="settings-outline" onPress={() => void Linking.openSettings()} /> : null}</View> : null}
      </Card>
    </>}
    <Card tone="danger" style={styles.signOutCard}><View style={[styles.signOutRow, compact && styles.signOutCompact]}><View style={styles.flex}><Text style={[styles.signOutTitle, { color: colors.text }]}>Finished for now?</Text><Text style={[styles.meta, { color: colors.muted }]}>Your data stays safely in Clankeep.</Text></View><AppButton variant="danger" label="Sign out" icon="log-out-outline" onPress={() => void logout()} /></View></Card>
  </Screen>
}

function NotificationToggle({ icon, label, description, value, disabled, onChange }: { icon: keyof typeof Ionicons.glyphMap; label: string; description: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useAppTheme()
  return <View style={styles.notificationRow}><View style={[styles.notificationIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={21} color={colors.primary} /></View><View style={styles.flex}><Text style={[styles.name, { color: colors.text }]}>{label}</Text><Text style={[styles.meta, { color: colors.muted }]}>{description}</Text></View><Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.primary }} thumbColor="#FFFFFF" /></View>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: spacing.sm },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingRight: spacing.sm },
  backText: { fontFamily: fontFamilies.bodyBold, fontSize: 15 },
  pressed: { opacity: 0.7 },
  personCard: { padding: spacing.sm },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personRowCompact: { alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamilies.displayBold, fontSize: 18 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  name: { fontFamily: fontFamilies.bodyBold, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  rolePill: { alignSelf: 'flex-start', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xs },
  actionsCompact: { flexDirection: 'column' },
  helper: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17 },
  inviteCard: { padding: spacing.sm },
  inviteIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  childIcon: { width: 46, height: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  childrenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  childCard: { width: '100%' },
  childCardTablet: { width: '48.8%' },
  settingsGrid: { gap: spacing.md },
  settingsGridTablet: { flexDirection: 'row', alignItems: 'stretch' },
  settingsCard: { flex: 1 },
  settingsIcon: { width: 46, height: 46, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center' },
  notificationCard: { gap: spacing.sm },
  notificationOptions: { gap: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  notificationRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notificationIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notificationSafety: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 18 },
  notificationError: { gap: spacing.sm, alignItems: 'flex-start' },
  signOutCard: { marginTop: spacing.sm },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  signOutCompact: { alignItems: 'stretch', flexDirection: 'column' },
  signOutTitle: { fontFamily: fontFamilies.displayBold, fontSize: 18 },
})
