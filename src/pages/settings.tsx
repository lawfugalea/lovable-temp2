import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
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

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // User profile state
  const [profile, setProfile] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
    address: ''
  })

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'data', name: 'Data & Storage', icon: Database },
  ]

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

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      // Update session
      await update({ name: profile.name })
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.href = '/'
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
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
                  {tabs.map((tab) => {
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
                    <CardDescription>Update your personal details and contact information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-cozy-primary-soft flex items-center justify-center text-2xl">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Button variant="outline" size="sm">
                          Change Avatar
                        </Button>
                        <p className="text-sm text-cozy-text-muted mt-1">JPG, PNG or GIF. Max size 2MB.</p>
                      </div>
                    </div>

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
                          onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-cozy-text">Phone</label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-cozy-text">Address</label>
                        <Input
                          value={profile.address}
                          onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Household Admin</Badge>
                        <span className="text-sm text-cozy-text-muted">Role in household</span>
                      </div>
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
                    <Button disabled={loading}>
                      Update Password
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Other tabs placeholder */}
            {activeTab !== 'profile' && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">⚙️</div>
                  <h2 className="text-xl font-semibold text-cozy-text mb-2">{tabs.find(t => t.id === activeTab)?.name}</h2>
                  <p className="text-cozy-text-muted">This section is coming soon!</p>
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