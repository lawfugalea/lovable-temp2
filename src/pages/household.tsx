import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import HouseholdCreationWizard from '../components/HouseholdCreationWizard'
import WelcomeFlow from '../components/onboarding/WelcomeFlow'
import EnhancedInvitePanel from '../components/EnhancedInvitePanel'
import HouseholdManagement from '../components/HouseholdManagement'
import { Users, Settings, RefreshCw, Home, Save, X, MapPin } from 'lucide-react'
import { COUNTRY_OPTIONS, countryLabel } from '@/lib/countries'

interface Household {
  id: string
  name: string
  ownerId: string | null
  country: string
  createdAt: string
  updatedAt: string
  role: 'OWNER' | 'MEMBER'
}

export default function HouseholdPage() {
  const { data: session, status } = useSession()
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreationWizard, setShowCreationWizard] = useState(false)
  const [householdError, setHouseholdError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [householdName, setHouseholdName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingCountry, setSavingCountry] = useState(false)

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
      if (householdRes.status === 404) {
        setHousehold(null)
      } else if (!householdRes.ok) {
        throw new Error(householdData.error || 'Failed to load household')
      } else if (householdData.householdId) {
        setHousehold({
          id: householdData.householdId,
          name: householdData.name,
          ownerId: householdData.ownerId,
          country: householdData.country || 'MT',
          createdAt: householdData.createdAt,
          updatedAt: householdData.updatedAt,
          role: householdData.role,
        })
        setHouseholdName(householdData.name)
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


  const handleHouseholdCreated = () => {
    setShowCreationWizard(false)
    // Reload household data to show the new household
    loadHouseholdData()
  }

  const handleRenameHousehold = async () => {
    if (!household) return
    setSavingName(true)
    setHouseholdError('')
    try {
      const response = await fetch('/api/household/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId: household.id, name: householdName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to rename household')
      setHousehold(current => current ? { ...current, ...data.household } : current)
      setHouseholdName(data.household.name)
      setEditingName(false)
    } catch (error) {
      setHouseholdError(error instanceof Error ? error.message : 'Failed to rename household')
    } finally {
      setSavingName(false)
    }
  }

  const handleCountryChange = async (country: string) => {
    if (!household || country === household.country) return
    setSavingCountry(true)
    setHouseholdError('')
    try {
      const response = await fetch('/api/household/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId: household.id, country }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update the household country')
      setHousehold(current => current ? { ...current, ...data.household } : current)
    } catch (error) {
      setHouseholdError(error instanceof Error ? error.message : 'Failed to update the household country')
    } finally {
      setSavingCountry(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Household">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your household...</p>
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
          <h1 className="font-display text-3xl font-bold text-foreground">Household</h1>
          <p className="text-muted-foreground">Manage your household members and settings</p>
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">Active Household</Badge>
                    <Badge variant={household.role === 'OWNER' ? 'default' : 'secondary'}>{household.role}</Badge>
                  </div>
                  {household.role === 'OWNER' && !editingName && (
                    <Button variant="outline" size="sm" onClick={() => setEditingName(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Rename
                    </Button>
                  )}
                </div>
                {editingName && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={householdName}
                      onChange={(event) => setHouseholdName(event.target.value)}
                      maxLength={100}
                      aria-label="Household name"
                    />
                    <Button onClick={handleRenameHousehold} disabled={savingName || householdName.trim().length < 2}>
                      <Save className="w-4 h-4 mr-2" />
                      {savingName ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setHouseholdName(household.name)
                        setEditingName(false)
                      }}
                      disabled={savingName}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {household.role === 'OWNER'
                      ? `Household location: ${countryLabel(household.country)}`
                      : `Location: ${countryLabel(household.country)}`}
                  </div>
                  {household.role === 'OWNER' && (
                    <select
                      value={household.country}
                      onChange={(event) => void handleCountryChange(event.target.value)}
                      disabled={savingCountry}
                      aria-label="Household country"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      {COUNTRY_OPTIONS.map(option => (
                        <option key={option.code} value={option.code}>{option.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                {householdError && <p className="mt-3 text-sm text-red-600">{householdError}</p>}
              </CardContent>
            </Card>

            {/* Enhanced Invite Panel */}
            {household.role === 'OWNER' && (
              <EnhancedInvitePanel
                householdId={household.id}
                householdName={household.name}
              />
            )}

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
                  <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                    <RefreshCw className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-2">Error Loading Household</h2>
                  <p className="text-muted-foreground mb-4">{householdError}</p>
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
              // Same first-run experience as the dashboard, including the
              // "I was invited" path — this page used to offer only a create
              // button and a sentence about invite links with nowhere to paste one.
              <WelcomeFlow onCreated={handleHouseholdCreated} />
            )}
          </>
        )}
      </div>
    </ModernAppShell>
  )
}
