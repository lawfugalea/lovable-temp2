import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { withBasePath } from '@/lib/base-path'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Database,
  Loader2,
  Save,
  Eye,
  EyeOff,
  LogOut,
  Key,
  Monitor,
  Moon,
  Palette,
  Sparkles,
  Sun,
  Trash2,
  AlertTriangle,
  Compass,
  ListChecks
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'
import { useTour } from '@/components/onboarding/TourProvider'

const SETTINGS_TABS = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'billing', name: 'Plan & Billing', icon: CreditCard },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'privacy', name: 'Privacy & Security', icon: Shield },
  { id: 'data', name: 'Data & Storage', icon: Database },
]

interface BillingSummary {
  plan: 'FREE' | 'FAMILY'
  effectiveVia: 'free' | 'stripe' | 'admin' | 'demo' | 'grace'
  isOwner: boolean
  currentPeriodEnd: string | null
  graceUntil: string | null
  status: string | null
  hasBillingAccount: boolean
  billingConfigured: boolean
  prices: { monthly: string; annual: string }
}

const FAMILY_FEATURES = [
  'Money planner with AI savings coach',
  'Medicine for unlimited children',
  'Push reminders for doses',
  'PDF health reports',
]

function BillingCard() {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/billing/summary')
        if (response.ok) setSummary(await response.json())
      } catch {
        // summary stays null; card shows loading state
      }
    })()
  }, [])

  const startCheckout = async (interval: 'month' | 'year') => {
    setBusy(interval)
    setError('')
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout')
      setBusy(null)
    }
  }

  const openPortal = async () => {
    setBusy('portal')
    setError('')
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not open the billing portal')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the billing portal')
      setBusy(null)
    }
  }

  if (!summary) {
    return (
      <Card><CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading your plan…
      </CardContent></Card>
    )
  }

  const isFamily = summary.plan === 'FAMILY'
  const renewal = summary.currentPeriodEnd ? new Date(summary.currentPeriodEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const grace = summary.graceUntil ? new Date(summary.graceUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Your plan</CardTitle>
          <CardDescription>Billing applies to the whole household.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${isFamily ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {isFamily ? 'Family' : 'Free'}
            </span>
            {summary.effectiveVia === 'admin' && <span className="text-xs text-muted-foreground">complimentary</span>}
            {summary.effectiveVia === 'demo' && <span className="text-xs text-muted-foreground">demo households include Family features</span>}
            {summary.effectiveVia === 'stripe' && renewal && <span className="text-xs text-muted-foreground">renews {renewal}</span>}
          </div>
          {summary.effectiveVia === 'grace' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              A payment failed — Family features stay on until {grace || 'the end of the grace period'}. Update your card in the billing portal.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!isFamily && summary.effectiveVia !== 'demo' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">The Family plan adds:</p>
              <ul className="space-y-1.5">
                {FAMILY_FEATURES.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />{feature}
                  </li>
                ))}
              </ul>
              {summary.billingConfigured ? (
                summary.isOwner ? (
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <Button onClick={() => void startCheckout('month')} disabled={busy !== null} className="min-h-11 flex-1">
                      {busy === 'month' && <Loader2 className="animate-spin" />}Family — {summary.prices.monthly}/month
                    </Button>
                    <Button variant="outline" onClick={() => void startCheckout('year')} disabled={busy !== null} className="min-h-11 flex-1">
                      {busy === 'year' && <Loader2 className="animate-spin" />}{summary.prices.annual}/year (2 months free)
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Only the household owner can manage the subscription — ask them to upgrade here.
                  </p>
                )
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Billing is not configured on this deployment yet.
                </p>
              )}
              <p className="text-xs text-muted-foreground">Prices include VAT. Cancel anytime — your data stays, features return to the free tier.</p>
            </div>
          )}

          {isFamily && summary.effectiveVia !== 'demo' && summary.hasBillingAccount && summary.isOwner && (
            <Button variant="outline" onClick={() => void openPortal()} disabled={busy !== null} className="min-h-11">
              {busy === 'portal' && <Loader2 className="animate-spin" />}Manage subscription
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const THEME_OPTIONS = [
  { value: 'light', name: 'Light', description: 'Bright and airy, all day', icon: Sun },
  { value: 'dark', name: 'Dark', description: 'Easy on late-night eyes', icon: Moon },
  { value: 'system', name: 'System', description: 'Follow this device', icon: Monitor },
]

function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const active = theme ?? 'system'
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Theme
        </CardTitle>
        <CardDescription>Choose how Clankeep looks on this device</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon
            const selected = active === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                  selected
                    ? 'border-primary bg-primary/5 shadow-soft-sm'
                    : 'hover:border-primary/30 hover:bg-accent/50'
                )}
              >
                <span className={cn(
                  'grid h-9 w-9 place-items-center rounded-lg',
                  selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold">{option.name}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const onboarding = useOnboarding()
  const tour = useTour()
  const hasHousehold = onboarding?.state?.household != null
  const checklistDismissed = onboarding?.state?.user.checklistDismissedAt != null
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [dataMessage, setDataMessage] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confirm = useConfirm()
  
  // User profile state
  const [profile, setProfile] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || ''
  })

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Load user settings
  useEffect(() => {
    if (session?.user) {
      setProfile(prev => ({
        ...prev,
        name: session.user?.name || prev.name,
        email: session.user?.email || prev.email
      }))
    }
  }, [session])

  useEffect(() => {
    const requested = typeof router.query.tab === 'string' ? router.query.tab : ''
    if (SETTINGS_TABS.some(tab => tab.id === requested)) setActiveTab(requested)
  }, [router.query.tab])

  useEffect(() => {
    setNotificationPermission('Notification' in window ? Notification.permission : 'unsupported')
  }, [])

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update profile')
      await update({ refreshProfile: true })
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error(error?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update password')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password updated successfully!')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: withBasePath('/landing') })
  }

  const handleNotificationPermission = async () => {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  const handleExport = async () => {
    setLoading(true)
    setDataMessage('')
    try {
      const response = await fetch('/api/account/export')
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to export data')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clankeep-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setDataMessage('Your export was created successfully.')
    } catch (error) {
      setDataMessage(error instanceof Error ? error.message : 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Enter your password to delete your account')
      return
    }
    const confirmed = await confirm({
      title: 'Delete your account?',
      description:
        'This permanently deletes your account. If you are the sole owner of a household, that household and all its shared data — including children’s medicine and health records — will be deleted for everyone. This cannot be undone.',
      confirmText: 'Delete my account',
      destructive: true,
    })
    if (!confirmed) return
    setDeleting(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to delete account')
      toast.success('Your account has been deleted')
      await signOut({ callbackUrl: withBasePath('/landing') })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account')
      setDeleting(false)
    }
  }

  const handleClearLocalData = () => {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith('houseflow_')))
    keys.forEach(key => localStorage.removeItem(key))
    setDataMessage(`Cleared ${keys.length} local cache ${keys.length === 1 ? 'entry' : 'entries'}. Server data was not deleted.`)
  }

  if (status === 'loading') {
    return (
      <ModernAppShell title="Settings">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your settings...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <ModernAppShell title="Settings">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600">Please sign in to access your settings</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1">
              {SETTINGS_TABS.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary text-white'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{tab.name}</span>
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>Update the name shown to your household</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Full Name</label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <Input
                          type="email"
                          value={profile.email}
                          readOnly
                          className="mt-1"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Contact an administrator to change your login email.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-sm text-muted-foreground">Changes are saved to your account.</span>
                      <Button onClick={handleProfileUpdate} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="w-5 h-5" />
                      Guidance
                    </CardTitle>
                    <CardDescription>Replay the tour or bring back the setup checklist</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Product tour</p>
                        <p className="text-sm text-muted-foreground">A short walk through each part of the app.</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => void tour?.startTour()}
                        disabled={!tour || !hasHousehold}
                      >
                        <Compass className="mr-2 h-4 w-4" />
                        Replay the tour
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Getting-started checklist</p>
                        <p className="text-sm text-muted-foreground">
                          {checklistDismissed
                            ? 'Hidden on your overview. This only affects you, not the rest of your household.'
                            : 'Currently showing on your overview.'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        disabled={!checklistDismissed || !hasHousehold}
                        onClick={() => void onboarding?.update({ checklistDismissed: false }).catch(() => {})}
                      >
                        <ListChecks className="mr-2 h-4 w-4" />
                        Show it again
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Security
                    </CardTitle>
                    <CardDescription>Manage your password and security settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Current Password</label>
                      <div className="relative mt-1">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">New Password</label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <Button disabled={loading} onClick={handlePasswordUpdate}>
                      Update Password
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && <BillingCard />}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && <AppearanceCard />}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Medicine reminders</CardTitle>
                  <CardDescription>Browser notifications are requested only when you choose to enable them.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Current permission: <strong className="text-foreground">{notificationPermission}</strong>
                  </p>
                  {notificationPermission === 'default' && (
                    <Button onClick={handleNotificationPermission}>Enable browser notifications</Button>
                  )}
                  {notificationPermission === 'denied' && (
                    <p className="text-sm text-amber-700">Notifications are blocked. Use your browser&apos;s site settings to enable them.</p>
                  )}
                  {notificationPermission === 'granted' && (
                    <p className="text-sm text-green-700">Notifications are enabled for medicine reminders.</p>
                  )}
                  {notificationPermission === 'unsupported' && (
                    <p className="text-sm text-amber-700">This browser does not support notifications.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'privacy' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Privacy & Security</CardTitle>
                  <CardDescription>Your account and household data are protected by two authentication layers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Clankeep requires the site access gate and your personal Clankeep account.</p>
                  <p>Household APIs verify membership before returning shared data. Personal notes remain visible only to you unless explicitly shared.</p>
                  <p>Use the password controls under Profile to rotate your account password.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'data' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> Data & Storage</CardTitle>
                  <CardDescription>Download your accessible data or clear this browser&apos;s local cache.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={handleExport} disabled={loading}>Export my data</Button>
                    <Button variant="outline" onClick={handleClearLocalData}>Clear local cache</Button>
                  </div>
                  {dataMessage && <p className="text-sm text-muted-foreground">{dataMessage}</p>}
                  <p className="text-xs text-muted-foreground">Clearing local cache does not remove anything from the Clankeep server.</p>

                  <div className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      <h3 className="font-semibold">Danger zone</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Permanently delete your account. If you are the sole owner of a household, that household and all its
                      shared data — including children&apos;s medicine and health records — will be deleted for everyone. This
                      cannot be undone.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        type="password"
                        value={deletePassword}
                        onChange={(event) => setDeletePassword(event.target.value)}
                        placeholder="Confirm your password"
                        autoComplete="current-password"
                        className="sm:max-w-xs"
                      />
                      <Button
                        variant="destructive"
                        onClick={() => void handleDeleteAccount()}
                        disabled={deleting || !deletePassword}
                        className="gap-2"
                      >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete my account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sign Out */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Sign Out</h3>
                    <p className="text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ModernAppShell>
  )
}
