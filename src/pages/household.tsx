import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Users, Plus, Mail, UserPlus, Settings } from 'lucide-react'

interface Household {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

interface Membership {
  id: string
  userId: string
  householdId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

export default function HouseholdPage() {
  const { data: session, status } = useSession()
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')

  // Load household data
  useEffect(() => {
    if (status === 'authenticated') {
      loadHouseholdData()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status])

  const loadHouseholdData = async () => {
    try {
      // Load active household
      const householdRes = await fetch('/api/household/active')
      const householdData = await householdRes.json()
      
      if (householdData.householdId) {
        setHousehold({
          id: householdData.householdId,
          name: householdData.name || 'My Household',
          ownerId: householdData.ownerId || '',
          createdAt: householdData.createdAt || new Date().toISOString(),
          updatedAt: householdData.updatedAt || new Date().toISOString(),
        })

        // Load members
        const membersRes = await fetch(`/api/household/members?householdId=${householdData.householdId}`)
        const membersData = await membersRes.json()
        setMembers(membersData.members || [])
      }
    } catch (error) {
      console.error('Failed to load household data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail || !household) return

    try {
      const response = await fetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          householdId: household.id
        })
      })

      if (response.ok) {
        alert('Invite sent successfully!')
        setInviteEmail('')
      } else {
        alert('Failed to send invite')
      }
    } catch (error) {
      console.error('Failed to send invite:', error)
      alert('Failed to send invite')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Household">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your household...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <ModernAppShell title="Household">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600">Please sign in to access your household</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Household">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-cozy-text">Household</h1>
          <p className="text-cozy-text-muted">Manage your household members and settings</p>
        </div>

        {household ? (
          <>
            {/* Household Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {household.name}
                </CardTitle>
                <CardDescription>
                  Created {new Date(household.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">Active Household</Badge>
                    <span className="text-sm text-cozy-text-muted">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invite Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Invite Members
                </CardTitle>
                <CardDescription>Send invitations to join your household</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={sendInvite} disabled={!inviteEmail}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle>Household Members</CardTitle>
                <CardDescription>People who have access to your household</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cozy-primary rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {member.user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-cozy-text">{member.user.name}</div>
                          <div className="text-sm text-cozy-text-muted">{member.user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                        {member.role !== 'OWNER' && (
                          <Button variant="outline" size="sm">
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🏠</div>
              <h2 className="text-xl font-semibold text-cozy-text mb-2">No Household Found</h2>
              <p className="text-cozy-text-muted mb-4">You don't have an active household yet.</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Household
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ModernAppShell>
  )
}
