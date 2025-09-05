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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [householdId, setHouseholdId] = useState<string>('')
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [totalItems, setTotalItems] = useState(0)
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

        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2">
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
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest household activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shoppingLists.length > 0 ? (
                shoppingLists.slice(0, 3).map((list) => (
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
                <div className="flex items-center gap-3 p-3 rounded-lg bg-cozy-cream">
                  <div className="h-8 w-8 rounded-lg bg-cozy-sage-soft flex items-center justify-center text-sm">
                    🧺
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-cozy-text">No shopping lists yet</p>
                    <p className="text-xs text-cozy-text-muted">Create your first shopping list to get started</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernAppShell>
  )
}