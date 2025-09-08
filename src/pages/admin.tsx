import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Users, 
  Home, 
  Shield, 
  Activity, 
  Database,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  Mail,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalHouseholds: number
  activeUsers: number
  newUsersToday: number
  totalInvites: number
  pendingInvites: number
  totalShoppingItems: number
  totalMedicines: number
}

interface User {
  id: string
  name: string | null
  email: string
  createdAt: string
  updatedAt: string
  activeHouseholdId: string | null
  ownedHouseholds: number
  memberships: number
}

interface Household {
  id: string
  name: string
  ownerId: string
  createdAt: string
  memberCount: number
  owner: {
    name: string | null
    email: string
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Check if user is admin with the correct email
  const isAdmin = session?.user?.email === 'lawfinuu@gmail.com'

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/')
      return
    }

    if (!isAdmin) {
      router.push('/dashboard')
      return
    }

    loadAdminData()
  }, [session, status, isAdmin])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      const [statsRes, usersRes, householdsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/households')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      if (householdsRes.ok) {
        const householdsData = await householdsRes.json()
        setHouseholds(householdsData.households || [])
      }
    } catch (err) {
      setError('Failed to load admin data')
      console.error('Admin data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (res.ok) {
        const result = await res.json()
        if (action === 'reset_password' && result.tempPassword) {
          alert(`Temporary password: ${result.tempPassword}`)
        }
        await loadAdminData() // Refresh data
      } else {
        const errorData = await res.json()
        setError(errorData.error || `Failed to ${action} user`)
      }
    } catch (err) {
      setError(`Failed to ${action} user`)
    }
  }

  const handleHouseholdAction = async (householdId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/households/${householdId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (res.ok) {
        await loadAdminData() // Refresh data
      } else {
        const errorData = await res.json()
        setError(errorData.error || `Failed to ${action} household`)
      }
    } catch (err) {
      setError(`Failed to ${action} household`)
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'households', label: 'Households', icon: Home },
    { id: 'system', label: 'System', icon: Settings },
  ]

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-cozy-primary" />
            <p className="text-cozy-text-muted">Loading admin panel...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (!isAdmin) {
    return (
      <ModernAppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold text-cozy-text mb-2">Access Denied</h1>
            <p className="text-cozy-text-muted">You don't have permission to access this page.</p>
            <p className="text-sm text-cozy-text-muted mt-2">Admin access required: lawfinuu@gmail.com</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell>
      <Head>
        <title>Admin Panel - HouseFlow</title>
      </Head>

      <div className="min-h-screen bg-cozy-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-cozy-primary" />
              <h1 className="text-3xl font-bold text-cozy-text">Admin Panel</h1>
              <Badge variant="secondary" className="ml-2">lawfinuu@gmail.com</Badge>
            </div>
            <p className="text-cozy-text-muted">Manage users, households, and system settings</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setError('')}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-cozy-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-cozy-primary text-cozy-primary'
                          : 'border-transparent text-cozy-text-muted hover:text-cozy-text hover:border-cozy-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-cozy-text-muted">Total Users</p>
                        <p className="text-2xl font-bold text-cozy-text">{stats.totalUsers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Home className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-cozy-text-muted">Households</p>
                        <p className="text-2xl font-bold text-cozy-text">{stats.totalHouseholds}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <UserCheck className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-cozy-text-muted">Active Users</p>
                        <p className="text-2xl font-bold text-cozy-text">{stats.activeUsers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-cozy-text-muted">New Today</p>
                        <p className="text-2xl font-bold text-cozy-text">{stats.newUsersToday}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Invites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-cozy-text-muted">Total</span>
                        <span className="font-medium">{stats.totalInvites}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cozy-text-muted">Pending</span>
                        <Badge variant="secondary">{stats.pendingInvites}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-cozy-text-muted">Shopping Items</span>
                        <span className="font-medium">{stats.totalShoppingItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cozy-text-muted">Medicines</span>
                        <span className="font-medium">{stats.totalMedicines}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button 
                        onClick={loadAdminData}
                        variant="outline" 
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Management ({users.length} users)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-cozy-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">User</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Email</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Joined</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Households</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-cozy-gray-100">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-cozy-text">
                                  {user.name || 'Unnamed User'}
                                </p>
                                <p className="text-sm text-cozy-text-muted">ID: {user.id}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-cozy-text">{user.email}</td>
                            <td className="py-3 px-4 text-cozy-text-muted">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Badge variant="secondary">{user.ownedHouseholds} owned</Badge>
                                <Badge variant="outline">{user.memberships} member</Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserAction(user.id, 'view')}
                                  title="View user details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserAction(user.id, 'reset_password')}
                                  title="Reset password"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete user ${user.email}?`)) {
                                      handleUserAction(user.id, 'delete')
                                    }
                                  }}
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Households Tab */}
          {activeTab === 'households' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Household Management ({households.length} households)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-cozy-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Household</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Owner</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Created</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Members</th>
                          <th className="text-left py-3 px-4 font-medium text-cozy-text">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {households.map((household) => (
                          <tr key={household.id} className="border-b border-cozy-gray-100">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-cozy-text">{household.name}</p>
                                <p className="text-sm text-cozy-text-muted">ID: {household.id}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-cozy-text">{household.owner.name || 'Unnamed'}</p>
                                <p className="text-sm text-cozy-text-muted">{household.owner.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-cozy-text-muted">
                              {new Date(household.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{household.memberCount} members</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleHouseholdAction(household.id, 'view')}
                                  title="View household details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete household "${household.name}"? This will delete ALL related data!`)) {
                                      handleHouseholdAction(household.id, 'delete')
                                    }
                                  }}
                                  title="Delete household"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Database
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button variant="outline" className="w-full">
                        <Database className="w-4 h-4 mr-2" />
                        Run Database Backup
                      </Button>
                      <Button variant="outline" className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Optimize Database
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      System Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button variant="outline" className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Clear Cache
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Activity className="w-4 h-4 mr-2" />
                        View System Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModernAppShell>
  )
}
