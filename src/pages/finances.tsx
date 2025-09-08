import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { usePageState } from '../hooks/usePageState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { ContribTableDesktop, ContribCardsMobile } from '../components/ui/finance/ContribBlock'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard,
  PiggyBank,
  Target,
  Plus,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Calculator,
  Trash2
} from 'lucide-react'

interface Earner {
  id: string
  name: string
  salary: number
  keep: number
}

interface Account {
  id: string
  name: string
  target: number
  expenses: any[]
}

type SplitMethod = 'equal' | 'proportional' | 'custom'

interface FinanceState {
  earners: Earner[]
  accounts: Account[]
  splitMethod: SplitMethod
  months: number
  startingSavings: number
  savingsPct: number
  selectedTemplateKey: string
}

export default function FinancesPage() {
  const { data: session, status } = useSession()
  const [householdId, setHouseholdId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  // Financial planning state
  const [earners, setEarners] = useState<Earner[]>([
    { id: '1', name: 'You', salary: 0, keep: 0 },
    { id: '2', name: 'Partner', salary: 0, keep: 0 },
  ])
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: 'Monthly Expenses', target: 0, expenses: [] },
    { id: '2', name: 'Emergency Fund', target: 0, expenses: [] },
  ])
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal')
  const [months, setMonths] = useState(12)
  const [startingSavings, setStartingSavings] = useState(0)
  const [savingsPct, setSavingsPct] = useState(20)
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('classic20')

  // Get household ID
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/household/active')
        .then(res => res.json())
        .then(data => {
          if (data.householdId) {
            setHouseholdId(data.householdId)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status])

  // Load financial data using the proper usePageState hook
  const {
    value: financeState,
    setValue: setFinanceState,
    loading: psLoading,
    saving: psSaving,
    error: psError,
  } = usePageState<FinanceState>({
    householdId,
    page: 'finances',
    initial: {
      earners,
      accounts,
      splitMethod,
      months,
      startingSavings,
      savingsPct,
      selectedTemplateKey,
    },
    saveDelayMs: 700,
  })

  // Update local state when page state loads
  useEffect(() => {
    if (financeState && !psLoading) {
      setEarners(financeState.earners || earners)
      setAccounts(financeState.accounts || accounts)
      setSplitMethod(financeState.splitMethod || 'equal')
      setMonths(financeState.months || 12)
      setStartingSavings(financeState.startingSavings || 0)
      setSavingsPct(financeState.savingsPct || 20)
      setSelectedTemplateKey(financeState.selectedTemplateKey || 'classic20')
    }
  }, [financeState, psLoading])

  // Save financial data using usePageState
  const saveFinancialData = (newState: Partial<FinanceState>) => {
    const state: FinanceState = {
      earners,
      accounts,
      splitMethod,
      months,
      startingSavings,
      savingsPct,
      selectedTemplateKey,
      ...newState
    }
    setFinanceState(state)
  }

  // Calculate totals
  const totalSalary = earners.reduce((sum, earner) => sum + earner.salary, 0)
  const totalTargets = accounts.reduce((sum, account) => sum + account.target, 0)
  const autoSavingsTarget = (totalSalary * savingsPct) / 100
  const totalMonthly = totalTargets + autoSavingsTarget
  const remaining = totalSalary - totalMonthly

  // Split calculation
  const calculateSplit = (target: number, earner: Earner) => {
    switch (splitMethod) {
      case 'equal':
        return target / earners.length
      case 'proportional':
        return earner.salary > 0 ? (target * earner.salary) / totalSalary : 0
      case 'custom':
        return earner.keep
      default:
        return target / earners.length
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Finances">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your financial plan...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <ModernAppShell title="Finances">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600">Please sign in to access your financial planning</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (!householdId) {
    return (
      <ModernAppShell title="Finances">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-cozy-text-muted">Creating or locating your household...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Finances">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-cozy-text mb-2 flex items-center gap-3">
            <span className="animate-cozy-wiggle">💰</span>Financial Planning
          </h1>
          <p className="text-cozy-text-muted">Plan your household finances with love and care</p>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSalary)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Monthly Budget</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalMonthly)}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cozy-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Savings Rate</p>
                  <p className="text-2xl font-bold text-cozy-primary">{savingsPct}%</p>
                </div>
                <PiggyBank className="h-8 w-8 text-cozy-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${remaining >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Remaining</p>
                  <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(remaining)}
                  </p>
                </div>
                {remaining >= 0 ? (
                  <ArrowUpRight className="h-8 w-8 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earners Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Income Earners
              </div>
              <Button
                onClick={() => {
                  const newEarner = {
                    id: Date.now().toString(),
                    name: `Earner ${earners.length + 1}`,
                    salary: 0,
                    keep: 0
                  }
                  const newEarners = [...earners, newEarner]
                  setEarners(newEarners)
                  saveFinancialData({ earners: newEarners })
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Earner
              </Button>
            </CardTitle>
            <CardDescription>Define who contributes to the household income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earners.map((earner, index) => (
                <div key={earner.id} className="p-4 border rounded-lg">
                  {/* Mobile-first responsive layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                    {/* Name field - full width on mobile, 1 column on desktop */}
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">
                        Name
                      </label>
                      <Input
                        value={earner.name}
                        onChange={(e) => {
                          const newEarners = [...earners]
                          newEarners[index].name = e.target.value
                          setEarners(newEarners)
                          saveFinancialData({ earners: newEarners })
                        }}
                        className="font-medium w-full"
                        placeholder="Earner name"
                      />
                    </div>
                    
                    {/* Salary field */}
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">
                        Salary (€)
                      </label>
                      <Input
                        type="number"
                        placeholder="Salary"
                        value={earner.salary || ''}
                        onChange={(e) => {
                          const newEarners = [...earners]
                          newEarners[index].salary = parseFloat(e.target.value) || 0
                          setEarners(newEarners)
                          saveFinancialData({ earners: newEarners })
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Keep field */}
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">
                        Personal Keep (€)
                      </label>
                      <Input
                        type="number"
                        placeholder="Keep"
                        value={earner.keep || ''}
                        onChange={(e) => {
                          const newEarners = [...earners]
                          newEarners[index].keep = parseFloat(e.target.value) || 0
                          setEarners(newEarners)
                          saveFinancialData({ earners: newEarners })
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Remove button */}
                    <div className="sm:col-span-1 flex justify-end">
                      {earners.length > 1 && (
                        <Button
                          onClick={() => {
                            const newEarners = earners.filter((_, i) => i !== index)
                            setEarners(newEarners)
                            saveFinancialData({ earners: newEarners })
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">Remove</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accounts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Budget Accounts
            </CardTitle>
            <CardDescription>Set up your monthly budget categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account, index) => (
                <div key={account.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <Input
                      value={account.name}
                      onChange={(e) => {
                        const newAccounts = [...accounts]
                        newAccounts[index].name = e.target.value
                        setAccounts(newAccounts)
                        saveFinancialData({ accounts: newAccounts })
                      }}
                      className="font-medium"
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      placeholder="Target"
                      value={account.target || ''}
                      onChange={(e) => {
                        const newAccounts = [...accounts]
                        newAccounts[index].target = parseFloat(e.target.value) || 0
                        setAccounts(newAccounts)
                        saveFinancialData({ accounts: newAccounts })
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Split Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Split Method
            </CardTitle>
            <CardDescription>How should expenses be divided between earners?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[
                { key: 'equal', label: 'Equal Split' },
                { key: 'proportional', label: 'Proportional' },
                { key: 'custom', label: 'Custom' }
              ].map((method) => (
                <Button
                  key={method.key}
                  variant={splitMethod === method.key ? 'default' : 'outline'}
                  onClick={() => {
                    setSplitMethod(method.key as SplitMethod)
                    saveFinancialData({ splitMethod: method.key as SplitMethod })
                  }}
                >
                  {method.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contribution Table */}
        <Card>
          <CardHeader>
            <CardTitle>Contribution Breakdown</CardTitle>
            <CardDescription>See how expenses are split between earners</CardDescription>
          </CardHeader>
          <CardContent>
            <ContribTableDesktop
              accounts={accounts}
              earners={earners}
              split={calculateSplit}
              autoSavingsTarget={autoSavingsTarget}
              savingsPct={savingsPct}
            />
            <ContribCardsMobile
              accounts={accounts}
              earners={earners}
              split={calculateSplit}
              autoSavingsTarget={autoSavingsTarget}
              savingsPct={savingsPct}
            />
          </CardContent>
        </Card>

        {/* Savings Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              Savings Settings
            </CardTitle>
            <CardDescription>Configure your savings goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-cozy-text">Savings Percentage</label>
                <Input
                  type="number"
                  value={savingsPct}
                  onChange={(e) => {
                    const newPct = parseFloat(e.target.value) || 0
                    setSavingsPct(newPct)
                    saveFinancialData({ savingsPct: newPct })
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-cozy-text">Starting Savings</label>
                <Input
                  type="number"
                  value={startingSavings}
                  onChange={(e) => {
                    const newSavings = parseFloat(e.target.value) || 0
                    setStartingSavings(newSavings)
                    saveFinancialData({ startingSavings: newSavings })
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-cozy-text">Planning Period (months)</label>
                <Input
                  type="number"
                  value={months}
                  onChange={(e) => {
                    const newMonths = parseInt(e.target.value) || 12
                    setMonths(newMonths)
                    saveFinancialData({ months: newMonths })
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernAppShell>
  )
}