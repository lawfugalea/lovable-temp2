import React, { useState } from 'react'
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Database,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor,
  Users,
  Home,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Key
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface UserProfile {
  name: string
  email: string
  phone: string
  address: string
  avatar: string
  role: string
}

interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  weeklyReports: boolean
  budgetAlerts: boolean
  shoppingReminders: boolean
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'household'
  dataSharing: boolean
  analytics: boolean
  marketing: boolean
}

const mockProfile: UserProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  address: '123 Main St, Anytown, USA',
  avatar: '👤',
  role: 'Household Admin'
}

const mockNotifications: NotificationSettings = {
  email: true,
  push: true,
  sms: false,
  weeklyReports: true,
  budgetAlerts: true,
  shoppingReminders: false
}

const mockPrivacy: PrivacySettings = {
  profileVisibility: 'household',
  dataSharing: false,
  analytics: true,
  marketing: false
}

export default function ModernSettings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(mockProfile)
  const [notifications, setNotifications] = useState(mockNotifications)
  const [privacy, setPrivacy] = useState(mockPrivacy)
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState('light')

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'data', name: 'Data & Storage', icon: Database },
  ]

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
    setPrivacy(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-cozy-text">Settings</h1>
        <p className="text-cozy-text-muted">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-cozy-primary-soft flex items-center justify-center text-2xl">
                      {profile.avatar}
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        Change Avatar
                      </Button>
                      <p className="text-sm text-cozy-text-muted mt-1">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-cozy-text">Full Name</label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-cozy-text">Email</label>
                      <Input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-cozy-text">Phone</label>
                      <Input
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-cozy-text">Address</label>
                      <Input
                        value={profile.address}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter your address"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{profile.role}</Badge>
                      <span className="text-sm text-cozy-text-muted">Role in household</span>
                    </div>
                    <Button>
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
                  <CardDescription>
                    Manage your password and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-cozy-text">Current Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cozy-text-muted hover:text-cozy-text"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-cozy-text">New Password</label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-cozy-text">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button variant="outline">
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-cozy-text">Communication</h4>
                  {[
                    { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                    { key: 'push', label: 'Push Notifications', description: 'Get notified on your device' },
                    { key: 'sms', label: 'SMS Notifications', description: 'Receive text messages' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-cozy-cream">
                      <div>
                        <p className="font-medium text-cozy-text">{item.label}</p>
                        <p className="text-sm text-cozy-text-muted">{item.description}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationChange(item.key as keyof NotificationSettings)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications[item.key as keyof NotificationSettings] ? 'bg-cozy-primary' : 'bg-cozy-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications[item.key as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-cozy-text">App Activities</h4>
                  {[
                    { key: 'weeklyReports', label: 'Weekly Reports', description: 'Get weekly summary reports' },
                    { key: 'budgetAlerts', label: 'Budget Alerts', description: 'Notify when approaching budget limits' },
                    { key: 'shoppingReminders', label: 'Shopping Reminders', description: 'Remind about shopping lists' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-cozy-cream">
                      <div>
                        <p className="font-medium text-cozy-text">{item.label}</p>
                        <p className="text-sm text-cozy-text-muted">{item.description}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationChange(item.key as keyof NotificationSettings)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications[item.key as keyof NotificationSettings] ? 'bg-cozy-primary' : 'bg-cozy-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications[item.key as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-cozy-text">Profile Visibility</label>
                    <select
                      value={privacy.profileVisibility}
                      onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-cozy-gray-300 bg-cozy-surface px-3 py-2 text-cozy-text focus:ring-2 focus:ring-cozy-primary"
                    >
                      <option value="public">Public - Visible to everyone</option>
                      <option value="household">Household - Visible to household members</option>
                      <option value="private">Private - Only visible to you</option>
                    </select>
                  </div>

                  {[
                    { key: 'dataSharing', label: 'Data Sharing', description: 'Allow sharing of anonymized data for app improvement' },
                    { key: 'analytics', label: 'Analytics', description: 'Help us understand how you use the app' },
                    { key: 'marketing', label: 'Marketing Communications', description: 'Receive promotional emails and updates' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-cozy-cream">
                      <div>
                        <p className="font-medium text-cozy-text">{item.label}</p>
                        <p className="text-sm text-cozy-text-muted">{item.description}</p>
                      </div>
                      <button
                        onClick={() => handlePrivacyChange(item.key as keyof PrivacySettings, !privacy[item.key as keyof PrivacySettings])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          privacy[item.key as keyof PrivacySettings] ? 'bg-cozy-primary' : 'bg-cozy-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            privacy[item.key as keyof PrivacySettings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-cozy-text">Theme</label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {[
                      { id: 'light', name: 'Light', icon: Sun },
                      { id: 'dark', name: 'Dark', icon: Moon },
                      { id: 'system', name: 'System', icon: Monitor },
                    ].map((themeOption) => {
                      const Icon = themeOption.icon
                      return (
                        <button
                          key={themeOption.id}
                          onClick={() => setTheme(themeOption.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                            theme === themeOption.id
                              ? 'border-cozy-primary bg-cozy-primary-soft'
                              : 'border-cozy-gray-300 hover:bg-cozy-cream'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-sm font-medium">{themeOption.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-cozy-text">Accent Color</label>
                  <div className="flex gap-2 mt-2">
                    {['cozy-primary', 'cozy-sage', 'cozy-terracotta', 'blue', 'green', 'purple'].map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          color === 'cozy-primary' ? 'border-cozy-primary' : 'border-cozy-gray-300'
                        }`}
                        style={{ backgroundColor: `var(--${color})` }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Manage your data and storage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Download className="w-6 h-6" />
                      <span className="text-sm">Export Data</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">Import Data</span>
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-cozy-text">Delete All Data</p>
                        <p className="text-sm text-cozy-text-muted">Permanently remove all your data</p>
                      </div>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
