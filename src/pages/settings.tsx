import React, { useState, useEffect } from 'react'
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
  Database,
  Save,
  Eye,
  EyeOff,
  LogOut,
  Key
} from 'lucide-react'

const SETTINGS_TABS = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'privacy', name: 'Privacy & Security', icon: Shield },
  { id: 'data', name: 'Data & Storage', icon: Database },
]

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [dataMessage, setDataMessage] = useState('')
  
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
      alert('Profile updated successfully!')
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      alert(error?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
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
      alert('Password updated successfully!')
    } catch (error: any) {
      alert(error?.message || 'Failed to update password')
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
      link.download = `houseflow-export-${new Date().toISOString().slice(0, 10)}.json`
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
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your settings...</p>
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
          <h1 className="text-3xl font-bold text-cozy-text">Settings</h1>
          <p className="text-cozy-text-muted">Manage your account and preferences</p>
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
                            ? 'bg-cozy-primary text-white'
                            : 'text-cozy-text hover:bg-cozy-cream'
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
                        <label className="text-sm font-medium text-cozy-text">Full Name</label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-cozy-text">Email</label>
                        <Input
                          type="email"
                          value={profile.email}
                          readOnly
                          className="mt-1"
                        />
                        <p className="mt-1 text-xs text-cozy-text-muted">Contact an administrator to change your login email.</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-sm text-cozy-text-muted">Changes are saved to your account.</span>
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
                      <Key className="w-5 h-5" />
                      Security
                    </CardTitle>
                    <CardDescription>Manage your password and security settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-cozy-text">Current Password</label>
                      <div className="relative mt-1">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-cozy-text-muted hover:text-cozy-text"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-cozy-text">New Password</label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-cozy-text">Confirm New Password</label>
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

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Medicine reminders</CardTitle>
                  <CardDescription>Browser notifications are requested only when you choose to enable them.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-cozy-text-muted">
                    Current permission: <strong className="text-cozy-text">{notificationPermission}</strong>
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
                <CardContent className="space-y-3 text-sm text-cozy-text-muted">
                  <p>HouseFlow requires the site access gate and your personal HouseFlow account.</p>
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
                  {dataMessage && <p className="text-sm text-cozy-text-muted">{dataMessage}</p>}
                  <p className="text-xs text-cozy-text-muted">Clearing local cache does not remove anything from the HouseFlow server.</p>
                </CardContent>
              </Card>
            )}

            {/* Sign Out */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-cozy-text">Sign Out</h3>
                    <p className="text-sm text-cozy-text-muted">Sign out of your account</p>
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
