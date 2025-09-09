import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ModernAppShell from '../components/ModernAppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Users,
  Home,
  ShoppingCart,
  Pill,
  Trash2,
  Shield,
  Activity,
  RefreshCw,
  Link as LinkIcon,
  Key,
  UserCheck,
  Settings,
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
  activeHouseholdId: string | null;
  ownedHouseholds: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  memberships: Array<{
    id: string;
    role: string;
    household: {
      id: string;
      name: string;
    };
  }>;
  _count: {
    shoppingItemsCreated: number;
    shoppingItemsCompleted: number;
  };
}

interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  invites: Array<{
    id: string;
    email: string | null;
    role: string;
    status: string;
    createdAt: string;
  }>;
  _count: {
    shoppingLists: number;
    children: number;
    activeForUsers: number;
  };
}

interface Stats {
  overview: {
    totalUsers: number;
    totalHouseholds: number;
    totalShoppingLists: number;
    totalShoppingItems: number;
    totalInvites: number;
    totalChildren: number;
    totalMedicines: number;
    totalFeverReadings: number;
    recentUsers: number;
    activeHouseholds: number;
  };
  shopping: {
    activeItems: number;
    completedItems: number;
  };
  medicine: {
    activeMedicines: number;
    inactiveMedicines: number;
  };
  topHouseholds: Array<{
    id: string;
    name: string;
    owner: {
      name: string | null;
      email: string;
    };
    _count: {
      members: number;
      shoppingLists: number;
      children: number;
    };
  }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [invites, setInvites] = useState<Array<{ id: string; token: string; email: string | null; role: string; status: string; expiresAt: string; household: { id: string; name: string } }>>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const adminUserAction = async (
    userId: string,
    action: 'reconcile' | 'setActiveHousehold' | 'resetPassword',
    payload?: any
  ) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, ...payload }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }
      await loadData();
    } catch (e: any) {
      alert(e?.message || 'Action failed');
    }
  };

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.email !== 'lawfinuu@gmail.com') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Load data
  useEffect(() => {
    if (session?.user?.email === 'lawfinuu@gmail.com') {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, householdsRes, statsRes, invitesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/households'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/invites'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (householdsRes.ok) {
        const householdsData = await householdsRes.json();
        setHouseholds(householdsData.households);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData.invites);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(userId);
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const deleteHousehold = async (householdId: string) => {
    if (!confirm('Are you sure you want to delete this household? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(householdId);
      const response = await fetch('/api/admin/households', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ householdId }),
      });

      if (response.ok) {
        setHouseholds(households.filter(household => household.id !== householdId));
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting household:', error);
      alert('Failed to delete household');
    } finally {
      setDeleting(null);
    }
  };

  const transferOwnership = async (householdId: string, newOwnerUserId: string) => {
    try {
      const response = await fetch('/api/admin/households', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transferOwnership', householdId, newOwnerUserId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }
      await loadData();
    } catch (e: any) {
      alert(e?.message || 'Transfer failed');
    }
  };

  const updateInvite = async (inviteId: string, action: 'revoke' | 'expire') => {
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, inviteId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed');
      }
      await loadData();
    } catch (e: any) {
      alert(e?.message || 'Invite update failed');
    }
  };

  const getAcceptUrl = async (token: string) => {
    const r = await fetch('/api/admin/invites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acceptLink', token }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.acceptUrl as string;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Admin Panel">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cozy-primary"></div>
        </div>
      </ModernAppShell>
    );
  }

  if (!session || session.user?.email !== 'lawfinuu@gmail.com') {
    return null;
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'households', name: 'Households', icon: Home },
    { id: 'invites', name: 'Invites', icon: LinkIcon },
    { id: 'tools', name: 'Tools', icon: Settings },
  ];

  return (
    <ModernAppShell title="Admin Panel">
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cozy-text">Admin Panel</h1>
            <p className="text-cozy-text-muted">Manage users, households, and view system statistics</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Access
          </Badge>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-cozy-cream p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-cozy-primary shadow-sm'
                    : 'text-cozy-text-muted hover:text-cozy-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.overview.recentUsers} new this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Households</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.overview.totalHouseholds}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.overview.activeHouseholds} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Shopping Items</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.overview.totalShoppingItems}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.shopping.activeItems} active, {stats.shopping.completedItems} done
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Medicines</CardTitle>
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.overview.totalMedicines}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.medicine.activeMedicines} active
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Households */}
            <Card>
              <CardHeader>
                <CardTitle>Top Households by Activity</CardTitle>
                <CardDescription>Households with the most shopping lists</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topHouseholds.slice(0, 5).map((household) => (
                    <div key={household.id} className="flex items-center justify-between p-3 bg-cozy-cream rounded-lg">
                      <div>
                        <p className="font-medium">{household.name}</p>
                        <p className="text-sm text-cozy-text-muted">
                          Owner: {household.owner.name || household.owner.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{household._count.shoppingLists} lists</p>
                        <p className="text-xs text-cozy-text-muted">
                          {household._count.members} members
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-cozy-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cozy-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name || 'No name'}</p>
                          <p className="text-sm text-cozy-text-muted">{user.email}</p>
                          <p className="text-xs text-cozy-text-muted">
                            Joined: {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {user.ownedHouseholds.length} households owned
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {user.memberships.length} memberships
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {user._count.shoppingItemsCreated} items created
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => adminUserAction(user.id, 'reconcile')} title="Reconcile active household">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={async () => {
                        const hid = prompt('Set active householdId (or leave blank for null):', user.activeHouseholdId || '');
                        if (hid === null) return; await adminUserAction(user.id, 'setActiveHousehold', { householdId: hid || null });
                      }} title="Set active household">
                        <Home className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={async () => {
                        const pw = prompt('New password for user:');
                        if (!pw) return; await adminUserAction(user.id, 'resetPassword', { newPassword: pw });
                      }} title="Reset password">
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        disabled={deleting === user.id || user.email === 'lawfinuu@gmail.com'}
                        className="text-red-600 hover:text-red-700"
                        title="Delete user"
                      >
                        {deleting === user.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Households Tab */}
        {activeTab === 'households' && (
          <Card>
            <CardHeader>
              <CardTitle>Household Management</CardTitle>
              <CardDescription>Manage all households in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {households.map((household) => (
                  <div key={household.id} className="flex items-center justify-between p-4 border border-cozy-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cozy-primary rounded-full flex items-center justify-center">
                          <Home className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{household.name}</p>
                          <p className="text-sm text-cozy-text-muted">
                            Owner: {household.owner.name || household.owner.email}
                          </p>
                          <p className="text-xs text-cozy-text-muted">
                            Created: {formatDate(household.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {household._count.members} members
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {household._count.shoppingLists} lists
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {household._count.children} children
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {household.invites.length} invites
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" title="Transfer ownership" onClick={async () => {
                        const uid = prompt('Enter new owner userId:');
                        if (!uid) return; await transferOwnership(household.id, uid);
                      }}>
                        <UserCheck className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteHousehold(household.id)}
                        disabled={deleting === household.id || household.owner.email === 'lawfinuu@gmail.com'}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deleting === household.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <Card>
            <CardHeader>
              <CardTitle>Invites</CardTitle>
              <CardDescription>Review and manage invites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between p-3 border border-cozy-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">{i.email || 'Open invite'} → {i.household.name}</p>
                      <p className="text-xs text-cozy-text-muted">Role: {i.role} • Status: {i.status} • Expires: {formatDate(i.expiresAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={async () => {
                        const url = await getAcceptUrl(i.token);
                        if (url) {
                          try { await navigator.clipboard.writeText(url); alert('Accept URL copied'); } catch { alert(url); }
                        } else {
                          alert('Failed to get URL');
                        }
                      }} title="Copy accept link">
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateInvite(i.id, 'revoke')} disabled={i.status !== 'PENDING'} title="Revoke">Revoke</Button>
                      <Button variant="outline" size="sm" onClick={() => updateInvite(i.id, 'expire')} disabled={i.status !== 'PENDING'} title="Expire">Expire</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Tools</CardTitle>
              <CardDescription>Quick helpers for debugging and maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-cozy-text-muted">
                <p>Use the Users/Households/Invites tabs for most operations. More tools can be added here on demand.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ModernAppShell>
  );
}
