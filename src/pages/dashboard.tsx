import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import Link from 'next/link'
import { usePageState } from '../hooks/usePageState'

interface ShoppingList {
  id: string
  name: string
  itemCount: number
}

interface FinanceState {
  earners: Array<{ id: string; name: string; salary: number; keep: number }>
  accounts: Array<{ id: string; name: string; target: number; expenses: any[] }>
  splitMethod: string
  months: number
  startingSavings: number
  savingsPct: number
  selectedTemplateKey: string
}

interface Medicine {
  id: string
  childId: string
  name: string
  dosage: string
  frequency: string
  isActive: boolean
  nextDoseOverride?: string
  child: {
    id: string
    name: string
  }
}

interface MedicineDose {
  id: string
  childId: string
  medicineId: string
  takenAt: string
  dosage: string
  notes?: string
  medicine: {
    name: string
  }
  child: {
    name: string
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [householdId, setHouseholdId] = useState<string>('')
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [recentDoses, setRecentDoses] = useState<MedicineDose[]>([])
  const [loading, setLoading] = useState(true)

  // Get household ID
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/household/active')
        .then(res => res.json())
        .then(data => {
          if (data.householdId) {
            setHouseholdId(data.householdId)
            loadShoppingData(data.householdId)
            loadMedicineData(data.householdId)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status])

  const loadShoppingData = async (hid: string) => {
    try {
      const response = await fetch('/api/shopping/lists')
      if (response.ok) {
        const data = await response.json()
        setShoppingLists(data.lists || [])
        
        // Calculate total items
        let total = 0
        for (const list of data.lists || []) {
          const itemsResponse = await fetch(`/api/shopping/items?listId=${list.id}`)
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json()
            total += itemsData.items?.length || 0
          }
        }
        setTotalItems(total)
      }
    } catch (error) {
      console.error('Failed to load shopping data:', error)
    }
  }

  const loadMedicineData = async (hid: string) => {
    try {
      // Load active medicines
      const medicinesResponse = await fetch(`/api/medicine/medicines?householdId=${hid}`)
      if (medicinesResponse.ok) {
        const medicinesData = await medicinesResponse.json()
        setMedicines(medicinesData.medicines || [])
      }

      // Load recent doses (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dosesResponse = await fetch(`/api/medicine/doses?householdId=${hid}&startDate=${sevenDaysAgo.toISOString().split('T')[0]}`)
      if (dosesResponse.ok) {
        const dosesData = await dosesResponse.json()
        setRecentDoses(dosesData.doses || [])
      }
    } catch (error) {
      console.error('Failed to load medicine data:', error)
    }
  }

  // Load financial data
  const { value: financeState } = usePageState<FinanceState>({
    householdId,
    page: 'finances',
    initial: {
      earners: [{ id: '1', name: 'You', salary: 0, keep: 0 }],
      accounts: [{ id: '1', name: 'Monthly Expenses', target: 0, expenses: [] }],
      splitMethod: 'equal',
      months: 12,
      startingSavings: 0,
      savingsPct: 20,
      selectedTemplateKey: 'classic20',
    },
  })

  // Calculate financial summary
  const totalSalary = financeState?.earners?.reduce((sum, earner) => sum + earner.salary, 0) || 0
  const totalTargets = financeState?.accounts?.reduce((sum, account) => sum + account.target, 0) || 0
  const monthlySavings = (totalSalary * (financeState?.savingsPct || 20)) / 100

  // Calculate medicine summary
  const activeMedicines = medicines.filter(m => m.isActive)
  const getDueMedicines = () => {
    const now = new Date()
    return activeMedicines.filter(medicine => {
      // Simple logic: if medicine has nextDoseOverride, check if it's due
      if (medicine.nextDoseOverride) {
        return new Date(medicine.nextDoseOverride) <= now
      }
      // For now, just return active medicines as "due" for demo
      // In a real implementation, you'd calculate based on last dose and frequency
      return true
    })
  }
  const dueMedicines = getDueMedicines()

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Overview">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your dashboard...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Overview">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-cozy-text">Welcome Home</h1>
          <p className="text-cozy-text-muted">Your cozy home hub awaits</p>
        </div>

        {/* Medicine Alerts */}
        {dueMedicines.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="text-orange-600 text-2xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">
                    Medicine Reminder
                  </h3>
                  <p className="text-sm text-orange-700">
                    {dueMedicines.length} medicine{dueMedicines.length !== 1 ? 's' : ''} {dueMedicines.length === 1 ? 'is' : 'are'} due for administration
                  </p>
                  <div className="text-xs text-orange-600 mt-1">
                    {dueMedicines.map(medicine => `${medicine.name} (${medicine.child.name})`).join(', ')}
                  </div>
                </div>
                <Link href="/medicine">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                    View Medicines
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Shopping widget */}
          <Card className="hover:shadow-cozy-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cozy-sage-soft flex items-center justify-center text-xl">
                  🧺
                </div>
                <div>
                  <div className="text-lg font-semibold">Shopping List</div>
                  <div className="text-sm text-cozy-text-muted">
                    {totalItems} item{totalItems !== 1 ? 's' : ''} across {shoppingLists.length} list{shoppingLists.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button variant="outline" className="flex-1 mr-2">
                  + Quick Add
                </Button>
                <Link href="/shopping">
                  <Button className="bg-cozy-primary hover:bg-cozy-primary-deep">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Finances widget */}
          <Card className="hover:shadow-cozy-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cozy-primary-soft flex items-center justify-center text-xl">
                  💰
                </div>
                <div>
                  <div className="text-lg font-semibold">Finances</div>
                  <div className="text-sm text-cozy-text-muted">
                    {totalSalary > 0 ? `€${totalSalary.toLocaleString()} income` : 'No income set'}
                    {totalTargets > 0 && ` • €${totalTargets.toLocaleString()} targets`}
                    {monthlySavings > 0 && ` • €${monthlySavings.toLocaleString()}/mo savings`}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button variant="outline" className="flex-1 mr-2">
                  Quick Add
                </Button>
                <Link href="/finances">
                  <Button className="bg-cozy-primary hover:bg-cozy-primary-deep">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Medicine widget */}
          <Card className="hover:shadow-cozy-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cozy-primary-soft flex items-center justify-center text-xl">
                  💊
                </div>
                <div>
                  <div className="text-lg font-semibold">Medicine</div>
                  <div className="text-sm text-cozy-text-muted">
                    {activeMedicines.length} active medicine{activeMedicines.length !== 1 ? 's' : ''}
                    {dueMedicines.length > 0 && ` • ${dueMedicines.length} due`}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dueMedicines.length > 0 && (
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-center gap-2">
                      <div className="text-orange-600">⚠️</div>
                      <div className="text-sm font-medium text-orange-800">
                        {dueMedicines.length} medicine{dueMedicines.length !== 1 ? 's' : ''} due
                      </div>
                    </div>
                    <div className="text-xs text-orange-700 mt-1">
                      {dueMedicines.slice(0, 2).map(medicine => medicine.name).join(', ')}
                      {dueMedicines.length > 2 && ` and ${dueMedicines.length - 2} more`}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Button variant="outline" className="flex-1 mr-2">
                    Quick Add
                  </Button>
                  <Link href="/medicine">
                    <Button className="bg-cozy-primary hover:bg-cozy-primary-deep">
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest household activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Recent Medicine Doses */}
              {recentDoses.length > 0 && (
                recentDoses.slice(0, 2).map((dose) => (
                  <div key={dose.id} className="flex items-center gap-3 p-3 rounded-lg bg-cozy-cream">
                    <div className="h-8 w-8 rounded-lg bg-cozy-primary-soft flex items-center justify-center text-sm">
                      💊
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-cozy-text">
                        {dose.medicine.name} given to {dose.child.name}
                      </p>
                      <p className="text-xs text-cozy-text-muted">
                        {new Date(dose.takenAt).toLocaleDateString()} • {dose.dosage}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* Shopping Lists */}
              {shoppingLists.length > 0 ? (
                shoppingLists.slice(0, 2).map((list) => (
                  <div key={list.id} className="flex items-center gap-3 p-3 rounded-lg bg-cozy-cream">
                    <div className="h-8 w-8 rounded-lg bg-cozy-sage-soft flex items-center justify-center text-sm">
                      🧺
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-cozy-text">
                        {list.name} ({list.itemCount} items)
                      </p>
                      <p className="text-xs text-cozy-text-muted">Shopping list</p>
                    </div>
                  </div>
                ))
              ) : (
                recentDoses.length === 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-cozy-cream">
                    <div className="h-8 w-8 rounded-lg bg-cozy-sage-soft flex items-center justify-center text-sm">
                      🧺
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-cozy-text">No recent activity</p>
                      <p className="text-xs text-cozy-text-muted">Start by creating a shopping list or recording medicine doses</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernAppShell>
  )
}