import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import HouseholdCreationWizard from '../components/HouseholdCreationWizard'
import EnhancedInvitePanel from '../components/EnhancedInvitePanel'
import HouseholdManagement from '../components/HouseholdManagement'
import { Users, Plus, Mail, UserPlus, Settings, RefreshCw, Home, AlertCircle } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [showCreationWizard, setShowCreationWizard] = useState(false)
  const [householdError, setHouseholdError] = useState('')

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
      setHouseholdError('')
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

        // Members are now loaded by HouseholdManagement component
      } else {
        // No household found - this is normal for new users
        setHousehold(null)
      }
    } catch (error) {
      console.error('Failed to load household data:', error)
      setHouseholdError('Failed to load household data. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const handleHouseholdCreated = (householdId: string) => {
    setShowCreationWizard(false)
    // Reload household data to show the new household
    loadHouseholdData()
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
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Invite Panel */}
            <EnhancedInvitePanel 
              householdId={household.id}
              householdName={household.name}
            />

            {/* Household Management */}
            <HouseholdManagement 
              householdId={household.id}
              householdName={household.name}
            />
          </>
        ) : (
          <>
            {householdError ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h2 className="text-xl font-semibold text-cozy-text mb-2">Error Loading Household</h2>
                  <p className="text-cozy-text-muted mb-4">{householdError}</p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={() => window.location.reload()}
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button 
                      onClick={() => setShowCreationWizard(true)}
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Create Household
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : showCreationWizard ? (
              <HouseholdCreationWizard
                onComplete={handleHouseholdCreated}
                onCancel={() => setShowCreationWizard(false)}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🏠</div>
                  <h2 className="text-xl font-semibold text-cozy-text mb-2">Welcome to Houseflow!</h2>
                  <p className="text-cozy-text-muted mb-6">
                    Create your household to start managing your home, family, and daily tasks together.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setShowCreationWizard(true)}
                      className="w-full"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Create Your Household
                    </Button>
                    <p className="text-sm text-cozy-text-muted">
                      Or join an existing household with an invite link
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ModernAppShell>
  )
}
