import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { usePageState } from '../hooks/usePageState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { ContribTableDesktop, ContribCardsMobile } from '../components/ui/finance/ContribBlock'
import Tabs, { TabPanel } from '../components/ui/Tabs'
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
  Trash2,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  FileText,
  Download,
  Upload
} from 'lucide-react'

interface Earner {
  id: string
  name: string
  salary: number
  keep: number
}

interface KnownExpense {
  id: string
  name: string
  amount: number
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  dueDate?: string
  category: string
}

interface BankAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  target: number
  knownExpenses: KnownExpense[]
}

type SplitMethod = 'equal' | 'proportional' | 'custom'

interface FinanceState {
  earners: Earner[]
  bankAccounts: BankAccount[]
  splitMethod: SplitMethod
  savingsPct: number
  selectedTemplateKey: string
  currentSavings: number
  financialGoals?: Array<{
    id: string
    name: string
    targetAmount: number
    currentAmount: number
    targetDate: string
    category: 'emergency' | 'vacation' | 'home' | 'car' | 'education' | 'retirement' | 'other'
    priority: 'low' | 'medium' | 'high'
  }>
}

export default function FinancesPage() {
  const { data: session, status } = useSession()
  const [householdId, setHouseholdId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  // Financial planning state - using usePageState as single source of truth
  const initialFinanceState: FinanceState = {
    earners: [
      { id: '1', name: 'You', salary: 0, keep: 0 },
      { id: '2', name: 'Partner', salary: 0, keep: 0 },
    ],
    bankAccounts: [
      { id: '1', name: 'Main Checking', type: 'checking', target: 0, knownExpenses: [] },
      { id: '2', name: 'Emergency Fund', type: 'savings', target: 0, knownExpenses: [] },
    ],
    splitMethod: 'equal',
    savingsPct: 20,
    selectedTemplateKey: 'fifty-thirty-twenty',
    currentSavings: 0,
  }
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  
  // Tab state
  const [activeTab, setActiveTab] = useState('budget')

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
    initial: initialFinanceState,
    saveDelayMs: 700,
  })

  // Extract values from financeState for easier access
  const earners = financeState?.earners || initialFinanceState.earners
  const bankAccounts = financeState?.bankAccounts || initialFinanceState.bankAccounts
  const splitMethod = financeState?.splitMethod || initialFinanceState.splitMethod
  const savingsPct = financeState?.savingsPct || initialFinanceState.savingsPct
  const selectedTemplateKey = financeState?.selectedTemplateKey || initialFinanceState.selectedTemplateKey
  const currentSavings = financeState?.currentSavings || initialFinanceState.currentSavings
  const financialGoals = financeState?.financialGoals || []

  // Refs for input management
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const nameInputRefs = useRef<{ [key: string]: string }>({})


  // Save financial data using usePageState
  const saveFinancialData = (newState: Partial<FinanceState>) => {
    setSaveStatus('saving')
    setHasUnsavedChanges(false)
    const state: FinanceState = {
      earners,
      bankAccounts,
      splitMethod,
      savingsPct,
      selectedTemplateKey,
      currentSavings,
      financialGoals,
      ...newState
    }
    setFinanceState(state)
  }

  // Track when user makes changes
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true)
    setSaveStatus('unsaved')
  }, [])

  // Export financial plan
  const exportFinancialPlan = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        earners,
        bankAccounts,
        splitMethod,
        savingsPct,
        selectedTemplateKey,
        currentSavings,
        financialGoals
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-plan-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import financial plan
  const importFinancialPlan = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string)
        
        if (importData.version && importData.data) {
          const { earners: importedEarners, bankAccounts: importedAccounts, splitMethod: importedSplitMethod, savingsPct: importedSavingsPct, selectedTemplateKey: importedTemplateKey, currentSavings: importedCurrentSavings, financialGoals: importedGoals } = importData.data
          
          // Validate imported data
          if (Array.isArray(importedEarners) && Array.isArray(importedAccounts)) {
            setFinanceState(prev => ({
              ...prev,
              earners: importedEarners,
              bankAccounts: importedAccounts,
              splitMethod: importedSplitMethod || 'equal',
              savingsPct: importedSavingsPct || 20,
              selectedTemplateKey: importedTemplateKey || 'fifty-thirty-twenty',
              currentSavings: importedCurrentSavings || 0,
              financialGoals: importedGoals || []
            }))
            
            markAsChanged()
            
            alert('Financial plan imported successfully!')
          } else {
            alert('Invalid file format. Please select a valid financial plan file.')
          }
        } else {
          alert('Invalid file format. Please select a valid financial plan file.')
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset file input
  }

  // Goal management functions
  const addGoal = (goal: Omit<typeof financialGoals[0], 'id'>) => {
    const newGoal = {
      ...goal,
      id: Date.now().toString()
    }
    const newGoals = [...financialGoals, newGoal]
    setFinanceState(prev => ({ ...prev, financialGoals: newGoals }))
    markAsChanged()
  }

  const updateGoal = (id: string, updates: Partial<typeof financialGoals[0]>) => {
    const newGoals = financialGoals.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    )
    setFinanceState(prev => ({ ...prev, financialGoals: newGoals }))
    markAsChanged()
  }

  const deleteGoal = (id: string) => {
    const newGoals = financialGoals.filter(goal => goal.id !== id)
    setFinanceState(prev => ({ ...prev, financialGoals: newGoals }))
    markAsChanged()
  }

  // Calculate goal progress
  const getGoalProgress = (goal: typeof financialGoals[0]) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
  }

  // Calculate monthly contribution needed for goal
  const getMonthlyContribution = (goal: typeof financialGoals[0]) => {
    const targetDate = new Date(goal.targetDate)
    const now = new Date()
    const monthsRemaining = Math.max(1, (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()))
    const remainingAmount = goal.targetAmount - goal.currentAmount
    return Math.max(0, remainingAmount / monthsRemaining)
  }

  // Goal Form Component
  const GoalForm = ({ onSubmit, onCancel }: {
    onSubmit: (goal: Omit<typeof financialGoals[0], 'id'>) => void
    onCancel: () => void
  }) => {
    const [formData, setFormData] = useState({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      targetDate: '',
      category: 'other' as const,
      priority: 'medium' as const
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (formData.name && formData.targetAmount > 0 && formData.targetDate) {
        onSubmit(formData)
      }
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-cozy-text mb-1">Goal Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Emergency Fund, Vacation, New Car"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cozy-text mb-1">Target Amount</label>
            <CurrencyInput
              value={formData.targetAmount}
              onChange={(value) => setFormData({ ...formData, targetAmount: value })}
              placeholder="0"
              showSuggestions={true}
              suggestions={[1000, 2500, 5000, 10000, 15000, 25000, 50000]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cozy-text mb-1">Current Amount</label>
            <CurrencyInput
              value={formData.currentAmount}
              onChange={(value) => setFormData({ ...formData, currentAmount: value })}
              placeholder="0"
              max={formData.targetAmount}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-cozy-text mb-1">Target Date</label>
          <Input
            type="date"
            value={formData.targetDate}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cozy-text mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-cozy-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cozy-primary"
            >
              <option value="emergency">Emergency Fund</option>
              <option value="vacation">Vacation</option>
              <option value="home">Home</option>
              <option value="car">Car</option>
              <option value="education">Education</option>
              <option value="retirement">Retirement</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-cozy-text mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-3 py-2 border border-cozy-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cozy-primary"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            Create Goal
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  // Section collapsing helpers
  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  const isSectionCollapsed = (sectionId: string) => collapsedSections.has(sectionId)

  // Collapsible Section Component
  const CollapsibleSection = ({ 
    id, 
    title, 
    children, 
    defaultCollapsed = false,
    icon,
    badge
  }: {
    id: string
    title: string
    children: React.ReactNode
    defaultCollapsed?: boolean
    icon?: React.ReactNode
    badge?: string | number
  }) => {
    const isCollapsed = isSectionCollapsed(id)
    
    useEffect(() => {
      if (defaultCollapsed && !collapsedSections.has(id)) {
        setCollapsedSections(prev => new Set([...prev, id]))
      }
    }, [id, defaultCollapsed])

    return (
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-cozy-gray-50 transition-colors"
          onClick={() => toggleSection(id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <CardTitle className="text-lg">{title}</CardTitle>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-cozy-text-muted">
                {isCollapsed ? 'Click to expand' : 'Click to collapse'}
              </span>
              <div className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            {children}
          </CardContent>
        )}
      </Card>
    )
  }

  // Track save status changes
  useEffect(() => {
    if (psSaving) {
      setSaveStatus('saving')
    } else if (psError) {
      setSaveStatus('error')
    } else if (financeState) {
      setSaveStatus('saved')
      setLastSaved(new Date())
    }
  }, [psSaving, psError, financeState])

  // Keyboard shortcuts handler
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    // Only handle shortcuts when not in input fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    const { key, ctrlKey, metaKey } = event
    const isCtrlOrCmd = ctrlKey || metaKey

    // Ctrl/Cmd + ? - Show shortcuts help
    if (isCtrlOrCmd && key === '?') {
      event.preventDefault()
      setShowShortcuts(true)
    }

    // Ctrl/Cmd + S - Save (prevent default browser save)
    if (isCtrlOrCmd && key === 's') {
      event.preventDefault()
      // Trigger save by updating a dummy state
      saveFinancialData({})
    }

    // Ctrl/Cmd + A - Auto balance
    if (isCtrlOrCmd && key === 'a') {
      event.preventDefault()
      // Trigger auto balance
      setFinanceState(prev => ({ ...prev, selectedTemplateKey: 'auto-balance' }))
    }

    // Escape - Close shortcuts help
    if (key === 'Escape') {
      setShowShortcuts(false)
    }
  }, [saveFinancialData])

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts)
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts)
    }
  }, [handleKeyboardShortcuts])

  // Calculate totals - use consistent data sources
  const totalSalary = earners.reduce((sum, earner) => sum + earner.salary, 0)
  const totalTargets = bankAccounts.reduce((sum, account) => sum + (account.target || 0), 0)
  const autoSavingsTarget = (totalSalary * savingsPct) / 100
  const totalPersonalKeep = earners.reduce((sum, earner) => sum + earner.keep, 0)
  
  // Calculate if the whole pool is accounted for
  const totalAllocated = autoSavingsTarget + totalTargets + totalPersonalKeep
  const unallocatedAmount = totalSalary - totalAllocated
  const isFullyAllocated = Math.abs(unallocatedAmount) < 0.01 // Account for floating point precision
  const allocationPercentage = totalSalary > 0 ? (totalAllocated / totalSalary) * 100 : 0
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

  // Format currency for input (removes currency symbols)
  const formatCurrencyForInput = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.-]/g, '')
    return numericValue
  }

  // Parse currency from input
  const parseCurrency = (value: string) => {
    const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''))
    return isNaN(numericValue) ? 0 : numericValue
  }

  // Format currency for display in input
  const formatCurrencyInput = (value: number) => {
    if (value === 0) return ''
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  // Currency Input Component with validation
  const CurrencyInput = ({ 
    value, 
    onChange, 
    placeholder, 
    className = "",
    max,
    min = 0,
    showSuggestions = false,
    suggestions = []
  }: {
    value: number
    onChange: (value: number) => void
    placeholder?: string
    className?: string
    max?: number
    min?: number
    showSuggestions?: boolean
    suggestions?: number[]
  }) => {
    const [displayValue, setDisplayValue] = useState(formatCurrencyInput(value))
    const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false)
    const [isValid, setIsValid] = useState(true)
    const [validationMessage, setValidationMessage] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const [pendingValue, setPendingValue] = useState<number | null>(null)

    // Only update displayValue from external value when not focused
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatCurrencyInput(value))
      }
    }, [value, isFocused])

    const validateValue = (val: number) => {
      if (max !== undefined && val > max) {
        setIsValid(false)
        setValidationMessage(`Maximum allowed: ${formatCurrency(max)}`)
        return false
      }
      if (val < min) {
        setIsValid(false)
        setValidationMessage(`Minimum allowed: ${formatCurrency(min)}`)
        return false
      }
      setIsValid(true)
      setValidationMessage('')
      return true
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numericValue = parseCurrency(inputValue)
      
      // Update display value immediately for responsive UI
      setDisplayValue(inputValue)
      validateValue(numericValue)
      
      // Store the pending value but don't call onChange yet
      setPendingValue(numericValue)
    }

    const handleBlur = () => {
      setIsFocused(false)
      setDisplayValue(formatCurrencyInput(value))
      setShowSuggestionDropdown(false)
      
      // Call onChange with the pending value if it exists
      if (pendingValue !== null) {
        onChange(pendingValue)
        setPendingValue(null)
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
      if (showSuggestions && suggestions.length > 0) {
        setShowSuggestionDropdown(true)
      }
    }

    const handleSuggestionClick = (suggestion: number) => {
      setDisplayValue(formatCurrencyInput(suggestion))
      setPendingValue(suggestion)
      setShowSuggestionDropdown(false)
      // Call onChange immediately for suggestions since user explicitly selected it
      onChange(suggestion)
    }


    return (
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder || "0"}
          className={`${className} ${!isValid ? 'border-red-300 bg-red-50' : ''}`}
        />
        {!isValid && (
          <p className="text-xs text-red-600 mt-1">{validationMessage}</p>
        )}
        {showSuggestionDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-cozy-gray-200 rounded-md shadow-lg z-10 mt-1">
            <div className="p-2">
              <p className="text-xs text-cozy-text-muted mb-2">Suggestions:</p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-cozy-gray-50 rounded"
                >
                  {formatCurrency(suggestion)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Finances">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your financial plan...</p>
            <div className="mt-4 space-y-2">
              <div className="h-2 bg-cozy-gray-200 rounded-full w-48 mx-auto">
                <div className="h-2 bg-cozy-primary rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-cozy-text-muted">Setting up your financial planning workspace</p>
            </div>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <ModernAppShell title="Finances">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Authentication Required</h2>
            <p className="text-cozy-text-muted mb-4">
              You need to be logged in to access your financial planning tools. This ensures your financial data remains secure and private.
            </p>
            <Button 
              onClick={() => window.location.href = '/api/auth/signin'}
              className="bg-cozy-primary hover:bg-cozy-primary/90 text-white"
            >
              Sign In to Continue
            </Button>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (!householdId) {
    return (
      <ModernAppShell title="Finances">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Setting Up Your Household</h2>
            <p className="text-cozy-text-muted mb-4">
              We&apos;re creating or locating your household workspace. This may take a moment while we set up your financial planning environment.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-cozy-text-muted">
              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Initializing...</span>
            </div>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  // Handle page state errors
  if (psError) {
    return (
      <ModernAppShell title="Finances">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Unable to Load Financial Data</h2>
            <p className="text-cozy-text-muted mb-4">
              We encountered an issue while loading your financial planning data. This might be a temporary network issue.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()}
                className="bg-cozy-primary hover:bg-cozy-primary/90 text-white mr-2"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
            <p className="text-xs text-cozy-text-muted mt-4">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  // Tab configuration
  const tabs = [
    { 
      id: 'budget', 
      label: 'Budget Planning', 
      icon: BarChart3,
      badge: financeState?.earners?.length > 0 ? financeState.earners.length : undefined
    },
    { 
      id: 'accounts', 
      label: 'Bank Accounts', 
      icon: CreditCard,
      badge: financeState?.bankAccounts?.length > 0 ? financeState.bankAccounts.length : undefined
    },
    { 
      id: 'goals', 
      label: 'Financial Goals', 
      icon: Target
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText
    }
  ]

  return (
    <ModernAppShell title="Finances">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-cozy-text mb-2 flex items-center gap-3">
            <span className="animate-cozy-wiggle">💰</span>Financial Planning
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-cozy-text-muted">
                  <div className="w-3 h-3 border border-cozy-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              )}
              {saveStatus === 'saved' && lastSaved && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Saved {lastSaved.toLocaleTimeString()}</span>
                  <span className="sm:hidden">Saved</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>Save failed</span>
                </div>
              )}
              {saveStatus === 'unsaved' && (
                <div className="flex items-center gap-2 text-orange-600">
                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                  <span className="hidden sm:inline">Unsaved changes</span>
                  <span className="sm:hidden">Unsaved</span>
                </div>
              )}
            </div>
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-cozy-text-muted">Plan your household finances with love and care</p>
            <div className="flex items-center gap-2">
              <Button
                onClick={exportFinancialPlan}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <span className="hidden sm:inline">Export Plan</span>
                <span className="sm:hidden">📤</span>
              </Button>
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <span className="hidden sm:inline">Import Plan</span>
                <span className="sm:hidden">📥</span>
              </Button>
              <Button
                onClick={() => setShowShortcuts(true)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <span className="hidden sm:inline">Keyboard Shortcuts</span>
                <span className="sm:hidden">⌨️</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pills"
          className="mb-6"
        />

        {/* Tab Content */}
        {activeTab === 'budget' && (
          <TabPanel>
            <div className="text-center py-8">
              <p className="text-cozy-text-muted">Budget Planning content will be organized here</p>
            </div>
          </TabPanel>
        )}

        {activeTab === 'accounts' && (
          <TabPanel>
            <div className="text-center py-8">
              <p className="text-cozy-text-muted">Bank Accounts content will be organized here</p>
            </div>
          </TabPanel>
        )}

        {activeTab === 'goals' && (
          <TabPanel>
            <div className="text-center py-8">
              <p className="text-cozy-text-muted">Financial Goals content will be organized here</p>
            </div>
          </TabPanel>
        )}

        {activeTab === 'reports' && (
          <TabPanel>
            <div className="text-center py-8">
              <p className="text-cozy-text-muted">Reports content will be organized here</p>
            </div>
          </TabPanel>
        )}

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-cozy-text">Keyboard Shortcuts</h2>
                <Button
                  onClick={() => setShowShortcuts(false)}
                  variant="outline"
                  size="sm"
                >
                  ✕
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cozy-text-muted">Show shortcuts help</span>
                  <kbd className="px-2 py-1 bg-cozy-gray-100 rounded text-xs">Ctrl + ?</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cozy-text-muted">Save changes</span>
                  <kbd className="px-2 py-1 bg-cozy-gray-100 rounded text-xs">Ctrl + S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cozy-text-muted">Auto balance budget</span>
                  <kbd className="px-2 py-1 bg-cozy-gray-100 rounded text-xs">Ctrl + A</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cozy-text-muted">Close this dialog</span>
                  <kbd className="px-2 py-1 bg-cozy-gray-100 rounded text-xs">Esc</kbd>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-cozy-gray-200">
                <p className="text-xs text-cozy-text-muted">
                  💡 Tip: Use <kbd className="px-1 py-0.5 bg-cozy-gray-100 rounded text-xs">Cmd</kbd> instead of <kbd className="px-1 py-0.5 bg-cozy-gray-100 rounded text-xs">Ctrl</kbd> on Mac
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-cozy-text">Import Financial Plan</h2>
                <Button
                  onClick={() => setShowImportModal(false)}
                  variant="outline"
                  size="sm"
                >
                  ✕
                </Button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-cozy-text-muted">
                  Select a financial plan file (.json) to import. This will replace your current plan.
                </p>
                <div className="border-2 border-dashed border-cozy-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importFinancialPlan}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <div className="w-12 h-12 bg-cozy-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-cozy-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-cozy-text">Choose File</span>
                    <span className="text-xs text-cozy-text-muted">or drag and drop</span>
                  </label>
                </div>
                <div className="text-xs text-cozy-text-muted">
                  <p className="font-medium mb-1">Supported formats:</p>
                  <p>• JSON files exported from this app</p>
                  <p>• Files must contain valid financial plan data</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Goal Creation Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-cozy-text">Create Financial Goal</h2>
                <Button
                  onClick={() => setShowGoalModal(false)}
                  variant="outline"
                  size="sm"
                >
                  ✕
                </Button>
              </div>
              <GoalForm
                onSubmit={(goal) => {
                  addGoal(goal)
                  setShowGoalModal(false)
                }}
                onCancel={() => setShowGoalModal(false)}
              />
            </div>
          </div>
        )}

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
                  <p className="text-2xl font-bold text-cozy-primary">{savingsPct.toFixed(2)}%</p>
                </div>
                <PiggyBank className="h-8 w-8 text-cozy-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${isFullyAllocated ? 'border-l-green-500' : 'border-l-orange-500'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Allocation</p>
                  <p className={`text-2xl font-bold ${isFullyAllocated ? 'text-green-600' : 'text-orange-600'}`}>
                    {allocationPercentage.toFixed(0)}%
                  </p>
                </div>
                {isFullyAllocated ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Allocation Status */}
        <Card className={isFullyAllocated ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isFullyAllocated ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              Income Allocation Status
            </CardTitle>
            <CardDescription>
              {isFullyAllocated 
                ? 'Perfect! All income is properly allocated across savings, expenses, and personal allowances.'
                : 'Your income allocation needs attention. Some money is not yet assigned to specific purposes.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Allocation Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-cozy-text-muted">Total Income:</span>
                    <span className="font-semibold">{formatCurrency(totalSalary)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-cozy-text-muted">Auto Savings ({savingsPct.toFixed(2)}%):</span>
                    <span className="font-semibold text-green-600">{formatCurrency(autoSavingsTarget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-cozy-text-muted">Bank Account Targets:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(totalTargets)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-cozy-text-muted">Personal Allowances:</span>
                    <span className="font-semibold text-purple-600">{formatCurrency(totalPersonalKeep)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Allocated:</span>
                    <span className={isFullyAllocated ? 'text-green-600' : 'text-orange-600'}>
                      {formatCurrency(totalAllocated)}
                    </span>
                  </div>
                  {!isFullyAllocated && (
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Unallocated:</span>
                      <span className="text-red-600">{formatCurrency(unallocatedAmount)}</span>
                    </div>
                  )}
                  
                  {/* Smart Suggestions */}
                  {!isFullyAllocated && totalSalary > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-semibold text-blue-800 mb-2">💡 Smart Suggestions:</div>
                      <div className="space-y-1 text-xs text-blue-700">
                        {unallocatedAmount > 0 ? (
                          <>
                            <div>• Max savings rate: {Math.min(50, ((autoSavingsTarget + unallocatedAmount) / totalSalary) * 100).toFixed(2)}%</div>
                            <div>• Max per account: {formatCurrency((totalTargets + unallocatedAmount) / bankAccounts.length)}</div>
                            <div>• Max per earner: {formatCurrency((totalPersonalKeep + unallocatedAmount) / earners.length)}</div>
                          </>
                        ) : (
                          <>
                            <div>• Min savings rate: {Math.max(5, ((autoSavingsTarget + unallocatedAmount) / totalSalary) * 100).toFixed(2)}%</div>
                            <div>• Max per account: {formatCurrency(Math.max(0, (totalTargets + unallocatedAmount) / bankAccounts.length))}</div>
                            <div>• Max per earner: {formatCurrency(Math.max(0, (totalPersonalKeep + unallocatedAmount) / earners.length))}</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Visual Progress Bar */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-cozy-text">Allocation Progress</div>
                  <div className="w-full bg-cozy-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        isFullyAllocated 
                          ? 'bg-gradient-to-r from-green-500 to-green-600' 
                          : 'bg-gradient-to-r from-orange-500 to-orange-600'
                      }`}
                      style={{ width: `${Math.min(allocationPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-cozy-text-muted">
                    {allocationPercentage.toFixed(1)}% of income allocated
                  </div>
                </div>
              </div>

              {/* Smart Allocation Actions */}
              {!isFullyAllocated && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h5 className="font-semibold text-orange-800 mb-3">Smart Allocation Options:</h5>
                  
                  {unallocatedAmount > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm text-orange-700 mb-3">
                        You have {formatCurrency(unallocatedAmount)} unallocated. Choose how to distribute it:
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Auto-distribute to savings */}
                        <Button
                          onClick={() => {
                            const newSavingsPct = Math.min(50, ((autoSavingsTarget + unallocatedAmount) / totalSalary) * 100)
                            setFinanceState(prev => ({ 
                              ...prev, 
                              savingsPct: newSavingsPct,
                              selectedTemplateKey: 'custom'
                            }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Add to Savings</div>
                            <div className="text-xs text-orange-600">Increase savings rate to {Math.min(50, ((autoSavingsTarget + unallocatedAmount) / totalSalary) * 100).toFixed(2)}%</div>
                          </div>
                        </Button>

                        {/* Auto-distribute to bank accounts */}
                        <Button
                          onClick={() => {
                            const newAccounts = bankAccounts.map(account => ({
                              ...account,
                              target: account.target + (unallocatedAmount / bankAccounts.length)
                            }))
                            setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Split Between Accounts</div>
                            <div className="text-xs text-orange-600">Add {formatCurrency(unallocatedAmount / bankAccounts.length)} to each account</div>
                          </div>
                        </Button>

                        {/* Auto-distribute to personal allowances */}
                        <Button
                          onClick={() => {
                            const newEarners = earners.map(earner => ({
                              ...earner,
                              keep: earner.keep + (unallocatedAmount / earners.length)
                            }))
                            setFinanceState(prev => ({ ...prev, earners: newEarners }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Add to Personal Allowances</div>
                            <div className="text-xs text-orange-600">Add {formatCurrency(unallocatedAmount / earners.length)} to each earner</div>
                          </div>
                        </Button>

                        {/* Smart proportional distribution */}
                        <Button
                          onClick={() => {
                            const currentAllocation = autoSavingsTarget + totalTargets + totalPersonalKeep
                            const savingsRatio = autoSavingsTarget / currentAllocation
                            const accountsRatio = totalTargets / currentAllocation
                            const personalRatio = totalPersonalKeep / currentAllocation

                            const newSavingsPct = Math.min(50, ((autoSavingsTarget + unallocatedAmount * savingsRatio) / totalSalary) * 100)
                            const newAccounts = bankAccounts.map(account => ({
                              ...account,
                              target: account.target + (unallocatedAmount * accountsRatio / bankAccounts.length)
                            }))
                            const newEarners = earners.map(earner => ({
                              ...earner,
                              keep: earner.keep + (unallocatedAmount * personalRatio / earners.length)
                            }))

                            setFinanceState(prev => ({ 
                              ...prev,
                              savingsPct: newSavingsPct,
                              selectedTemplateKey: 'custom',
                              bankAccounts: newAccounts,
                              earners: newEarners
                            }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Smart Proportional</div>
                            <div className="text-xs text-orange-600">Distribute proportionally based on current allocation</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-orange-700 mb-3">
                        You&apos;re over-allocated by {formatCurrency(Math.abs(unallocatedAmount))}. Choose how to reduce:
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Reduce savings */}
                        <Button
                          onClick={() => {
                            const newSavingsPct = Math.max(5, ((autoSavingsTarget + unallocatedAmount) / totalSalary) * 100)
                            setFinanceState(prev => ({ 
                              ...prev, 
                              savingsPct: newSavingsPct,
                              selectedTemplateKey: 'custom'
                            }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Reduce Savings</div>
                            <div className="text-xs text-orange-600">Lower savings rate to {Math.max(5, ((autoSavingsTarget + unallocatedAmount) / totalSalary) * 100).toFixed(2)}%</div>
                          </div>
                        </Button>

                        {/* Reduce bank accounts proportionally */}
                        <Button
                          onClick={() => {
                            const reductionPerAccount = Math.abs(unallocatedAmount) / bankAccounts.length
                            const newAccounts = bankAccounts.map(account => ({
                              ...account,
                              target: Math.max(0, account.target - reductionPerAccount)
                            }))
                            setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Reduce Account Targets</div>
                            <div className="text-xs text-orange-600">Reduce each account by {formatCurrency(Math.abs(unallocatedAmount) / bankAccounts.length)}</div>
                          </div>
                        </Button>

                        {/* Reduce personal allowances */}
                        <Button
                          onClick={() => {
                            const reductionPerEarner = Math.abs(unallocatedAmount) / earners.length
                            const newEarners = earners.map(earner => ({
                              ...earner,
                              keep: Math.max(0, earner.keep - reductionPerEarner)
                            }))
                            setFinanceState(prev => ({ ...prev, earners: newEarners }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Reduce Personal Allowances</div>
                            <div className="text-xs text-orange-600">Reduce each earner by {formatCurrency(Math.abs(unallocatedAmount) / earners.length)}</div>
                          </div>
                        </Button>

                        {/* Smart proportional reduction */}
                        <Button
                          onClick={() => {
                            const currentAllocation = autoSavingsTarget + totalTargets + totalPersonalKeep
                            const savingsRatio = autoSavingsTarget / currentAllocation
                            const accountsRatio = totalTargets / currentAllocation
                            const personalRatio = totalPersonalKeep / currentAllocation

                            const newSavingsPct = Math.max(5, ((autoSavingsTarget + unallocatedAmount * savingsRatio) / totalSalary) * 100)
                            const newAccounts = bankAccounts.map(account => ({
                              ...account,
                              target: Math.max(0, account.target + (unallocatedAmount * accountsRatio / bankAccounts.length))
                            }))
                            const newEarners = earners.map(earner => ({
                              ...earner,
                              keep: Math.max(0, earner.keep + (unallocatedAmount * personalRatio / earners.length))
                            }))

                            setFinanceState(prev => ({ 
                              ...prev,
                              savingsPct: newSavingsPct,
                              selectedTemplateKey: 'custom',
                              bankAccounts: newAccounts,
                              earners: newEarners
                            }))
                            markAsChanged()
                          }}
                          variant="outline"
                          className="text-left justify-start h-auto p-3 border-orange-300 hover:bg-orange-100"
                        >
                          <div>
                            <div className="font-semibold text-orange-800">Smart Proportional</div>
                            <div className="text-xs text-orange-600">Reduce proportionally based on current allocation</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {isFullyAllocated && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-semibold text-green-800 mb-2">Great job! 🎉</h5>
                  <div className="text-sm text-green-700">
                    Your budget is perfectly balanced. Every euro has a purpose and your financial plan is complete.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Earners Section */}
        <CollapsibleSection
          id="income-earners"
          title="Income Earners"
          icon={<Users className="h-5 w-5" />}
          badge={earners.length}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-cozy-text-muted">
                Define who contributes to the household income
              </p>
              <Button
                onClick={() => {
                  const newEarner = {
                    id: Date.now().toString(),
                    name: `Earner ${earners.length + 1}`,
                    salary: 0,
                    keep: 0
                  }
                  const newEarners = [...earners, newEarner]
                  setFinanceState(prev => ({ ...prev, earners: newEarners }))
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Earner
              </Button>
            </div>
            <div className="space-y-4">
              {earners.map((earner, index) => (
                <div key={`earner-${earner.id}-${index}`} className="p-4 border rounded-lg">
                  {/* Mobile-first responsive layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                    {/* Name field - full width on mobile, 1 column on desktop */}
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">
                        Name
                      </label>
                      <Input
                        ref={(el) => {
                          inputRefs.current[`earner-name-${index}`] = el
                        }}
                        defaultValue={earners[index]?.name || ''}
                        onChange={(e) => {
                          // Store the value in ref without causing re-renders
                          nameInputRefs.current[`earner-name-${index}`] = e.target.value
                        }}
                        onBlur={(e) => {
                          // Only update state when user finishes editing
                          const newEarners = earners.map((ear, i) => 
                            i === index ? { ...ear, name: e.target.value } : ear
                          )
                          setFinanceState(prev => ({ ...prev, earners: newEarners }))
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
                      <CurrencyInput
                        value={earners[index]?.salary || 0}
                        onChange={(value) => {
                          const newEarners = earners.map((ear, i) => 
                            i === index ? { ...ear, salary: value } : ear
                          )
                          setFinanceState(prev => ({ ...prev, earners: newEarners }))
                        }}
                        placeholder="Salary"
                        className="w-full"
                        showSuggestions={true}
                        suggestions={[2500, 3000, 3500, 4000, 5000, 6000, 7500, 10000, 15000, 20000, 25000, 50000, 75000, 100000, 150000, 200000]}
                        max={200000}
                      />
                    </div>
                    
                    {/* Keep field */}
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1 sm:hidden">
                        Personal Keep (€)
                      </label>
                      <CurrencyInput
                        value={earners[index]?.keep || 0}
                        onChange={(value) => {
                          const newEarners = earners.map((ear, i) => 
                            i === index ? { ...ear, keep: value } : ear
                          )
                          setFinanceState(prev => ({ ...prev, earners: newEarners }))
                        }}
                        placeholder="Keep"
                        className={(() => {
                          const newTotalPersonalKeep = earners.reduce((sum, ear, i) => 
                            sum + (i === index ? (ear.keep || 0) : ear.keep), 0
                          )
                          const newTotalAllocated = autoSavingsTarget + totalTargets + newTotalPersonalKeep
                          const newUnallocated = totalSalary - newTotalAllocated
                          return newUnallocated < 0 ? 'border-red-300 bg-red-50' : ''
                        })()}
                        showSuggestions={true}
                        suggestions={[
                          Math.round(earner.salary * 0.1), // 10% of salary
                          Math.round(earner.salary * 0.15), // 15% of salary
                          Math.round(earner.salary * 0.2), // 20% of salary
                          Math.round(earner.salary * 0.25), // 25% of salary
                          500, 1000, 1500, 2000
                        ].filter((val, index, arr) => val > 0 && arr.indexOf(val) === index)}
                        max={earner.salary * 0.5} // Max 50% of salary
                      />
                    </div>
                    
                    {/* Remove button */}
                    <div className="sm:col-span-1 flex justify-end">
                      {earners.length > 1 && (
                        <Button
                          onClick={() => {
                            const newEarners = earners.filter((_, i) => i !== index)
                            setFinanceState(prev => ({ ...prev, earners: newEarners }))
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
          </div>
        </CollapsibleSection>

        {/* Savings Templates */}
        <CollapsibleSection
          id="savings-methods"
          title="Popular Savings Methods"
          icon={<Target className="h-5 w-5" />}
          badge={6}
        >
          <div className="space-y-4">
            <p className="text-sm text-cozy-text-muted">
              Choose from proven savings strategies
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  key: 'fifty-thirty-twenty',
                  name: '50/30/20 Rule',
                  description: '50% needs, 30% wants, 20% savings',
                  savingsPct: 20,
                  tip: 'Allocate 50% for needs, 30% for wants, and 20% for savings and debt repayment.'
                },
                {
                  key: 'pay-yourself-first',
                  name: 'Pay Yourself First',
                  description: 'Set aside savings before any expenses',
                  savingsPct: 15,
                  tip: 'Automatically transfer a fixed percentage to savings before paying other bills.'
                },
                {
                  key: 'envelope-method',
                  name: 'Envelope Method',
                  description: 'Allocate specific amounts to categories',
                  savingsPct: 10,
                  tip: 'Use separate accounts or virtual envelopes for different spending categories.'
                },
                {
                  key: 'zero-based',
                  name: 'Zero-Based Budgeting',
                  description: 'Every euro has a purpose',
                  savingsPct: 25,
                  tip: 'Plan every euro before the month starts. Income minus expenses should equal zero.'
                },
                {
                  key: 'eighty-twenty',
                  name: '80/20 Rule',
                  description: '80% living, 20% savings',
                  savingsPct: 20,
                  tip: 'Simple rule: 80% for living expenses, 20% for savings and investments.'
                },
                {
                  key: 'auto-balance',
                  name: 'Smart Auto Balance',
                  description: 'Automatically balance your entire budget',
                  savingsPct: 'auto',
                  tip: 'Intelligently distributes all income across savings, accounts, and personal allowances to achieve perfect balance.'
                }
              ].map((template) => (
                <div
                  key={template.key}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    template.key === 'auto-balance'
                      ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100'
                      : selectedTemplateKey === template.key
                      ? 'border-cozy-primary bg-cozy-primary/5'
                      : 'border-cozy-gray-200 hover:border-cozy-primary/50'
                  }`}
                  onClick={() => {
                    setFinanceState(prev => ({ ...prev, selectedTemplateKey: template.key }))
                    
                    if (template.key === 'auto-balance') {
                      // Auto-balance logic
                      if (unallocatedAmount > 0) {
                        // Distribute unallocated amount proportionally
                        const currentAllocation = autoSavingsTarget + totalTargets + totalPersonalKeep
                        const savingsRatio = autoSavingsTarget / currentAllocation
                        const accountsRatio = totalTargets / currentAllocation
                        const personalRatio = totalPersonalKeep / currentAllocation

                        const newSavingsPct = Math.min(50, ((autoSavingsTarget + unallocatedAmount * savingsRatio) / totalSalary) * 100)
                        const newAccounts = bankAccounts.map(account => ({
                          ...account,
                          target: account.target + (unallocatedAmount * accountsRatio / bankAccounts.length)
                        }))
                        const newEarners = earners.map(earner => ({
                          ...earner,
                          keep: earner.keep + (unallocatedAmount * personalRatio / earners.length)
                        }))

                        setFinanceState(prev => ({ 
                          ...prev,
                          selectedTemplateKey: template.key,
                          savingsPct: newSavingsPct,
                          bankAccounts: newAccounts,
                          earners: newEarners
                        }))
                        markAsChanged()
                      } else if (unallocatedAmount < 0) {
                        // Reduce over-allocation proportionally
                        const currentAllocation = autoSavingsTarget + totalTargets + totalPersonalKeep
                        const savingsRatio = autoSavingsTarget / currentAllocation
                        const accountsRatio = totalTargets / currentAllocation
                        const personalRatio = totalPersonalKeep / currentAllocation

                        const newSavingsPct = Math.max(5, ((autoSavingsTarget + unallocatedAmount * savingsRatio) / totalSalary) * 100)
                        const newAccounts = bankAccounts.map(account => ({
                          ...account,
                          target: Math.max(0, account.target + (unallocatedAmount * accountsRatio / bankAccounts.length))
                        }))
                        const newEarners = earners.map(earner => ({
                          ...earner,
                          keep: Math.max(0, earner.keep + (unallocatedAmount * personalRatio / earners.length))
                        }))

                        setFinanceState(prev => ({ 
                          ...prev,
                          selectedTemplateKey: template.key,
                          savingsPct: newSavingsPct,
                          bankAccounts: newAccounts,
                          earners: newEarners
                        }))
                        markAsChanged()
                      } else {
                        // Already balanced, just set the template
                        setFinanceState(prev => ({ 
                          ...prev,
                          selectedTemplateKey: template.key
                        }))
                        markAsChanged()
                      }
                    } else {
                      // Regular template logic
                      setFinanceState(prev => ({ 
                        ...prev,
                        selectedTemplateKey: template.key,
                        savingsPct: template.savingsPct as number
                      }))
                      markAsChanged()
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {template.key === 'auto-balance' && (
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Target className="w-3 h-3 text-blue-600" />
                        </div>
                      )}
                      <h3 className="font-semibold text-cozy-text">{template.name}</h3>
                    </div>
                    <Badge variant={selectedTemplateKey === template.key ? 'default' : 'outline'}>
                      {template.savingsPct === 'auto' ? 'Auto' : `${template.savingsPct}%`}
                    </Badge>
                  </div>
                  <p className="text-sm text-cozy-text-muted mb-2">{template.description}</p>
                  <p className="text-xs text-cozy-text-muted">{template.tip}</p>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Savings Projections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Savings Projections
            </CardTitle>
            <CardDescription>See how your savings will grow over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Savings Input */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-cozy-text mb-2">
                    Current Savings Balance
                  </label>
                  <CurrencyInput
                    value={currentSavings || 0}
                    onChange={(value) => {
                      setFinanceState(prev => ({ ...prev, currentSavings: value }))
                      markAsChanged()
                    }}
                    placeholder="Enter your current savings"
                    className="text-lg font-semibold"
                  />
                </div>
                <div className="text-sm text-cozy-text-muted">
                  <div>Monthly Savings: €{autoSavingsTarget.toFixed(0)}</div>
                  <div>Annual Savings: €{(autoSavingsTarget * 12).toFixed(0)}</div>
                </div>
              </div>

              {/* Projections Chart */}
              {currentSavings > 0 && autoSavingsTarget > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-cozy-text">5-Year Projection</h4>
                  
                  {/* Simple Bar Chart */}
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((year) => {
                      const projectedSavings = currentSavings + (autoSavingsTarget * 12 * year)
                      const maxSavings = currentSavings + (autoSavingsTarget * 12 * 5)
                      const percentage = (projectedSavings / maxSavings) * 100
                      
                      return (
                        <div key={year} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Year {year}</span>
                            <span className="text-cozy-primary font-semibold">
                              €{projectedSavings.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-cozy-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-cozy-primary to-cozy-accent h-3 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Key Milestones */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 bg-cozy-cream rounded-lg">
                      <div className="text-2xl font-bold text-cozy-primary">
                        €{(currentSavings + autoSavingsTarget * 12).toLocaleString()}
                      </div>
                      <div className="text-sm text-cozy-text-muted">After 1 Year</div>
                    </div>
                    <div className="p-4 bg-cozy-cream rounded-lg">
                      <div className="text-2xl font-bold text-cozy-primary">
                        €{(currentSavings + autoSavingsTarget * 12 * 3).toLocaleString()}
                      </div>
                      <div className="text-sm text-cozy-text-muted">After 3 Years</div>
                    </div>
                    <div className="p-4 bg-cozy-cream rounded-lg">
                      <div className="text-2xl font-bold text-cozy-primary">
                        €{(currentSavings + autoSavingsTarget * 12 * 5).toLocaleString()}
                      </div>
                      <div className="text-sm text-cozy-text-muted">After 5 Years</div>
                    </div>
                  </div>

                  {/* Growth Insights */}
                  <div className="p-4 bg-gradient-to-r from-cozy-primary/10 to-cozy-accent/10 rounded-lg">
                    <h5 className="font-semibold text-cozy-text mb-2">Growth Insights</h5>
                    <div className="space-y-1 text-sm text-cozy-text-muted">
                      <div>• You&apos;ll save €{(autoSavingsTarget * 12).toLocaleString()} per year</div>
                      <div>• Total growth over 5 years: €{(autoSavingsTarget * 12 * 5).toLocaleString()}</div>
                      <div>• Your savings will {currentSavings > 0 ? 'grow by' : 'reach'} {((autoSavingsTarget * 12 * 5) / currentSavings * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {(!currentSavings || !autoSavingsTarget) && (
                <div className="text-center py-8 text-cozy-text-muted">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Enter your current savings balance to see projections</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Goals Section */}
        <CollapsibleSection
          id="financial-goals"
          title="Financial Goals"
          icon={<Target className="h-5 w-5" />}
          badge={financialGoals.length}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-cozy-text-muted">
                Set and track your specific financial goals
              </p>
              <Button
                onClick={() => setShowGoalModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Goal
              </Button>
            </div>
            
            {financialGoals.length === 0 ? (
              <div className="text-center py-8 text-cozy-text-muted">
                <Target className="w-12 h-12 mx-auto mb-4 text-cozy-gray-400" />
                <p className="text-lg font-medium mb-2">No goals set yet</p>
                <p className="text-sm">Create your first financial goal to start tracking your progress</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {financialGoals.map((goal) => {
                  const progress = getGoalProgress(goal)
                  const monthlyContribution = getMonthlyContribution(goal)
                  const priorityColors = {
                    low: 'border-green-200 bg-green-50',
                    medium: 'border-yellow-200 bg-yellow-50',
                    high: 'border-red-200 bg-red-50'
                  }
                  
                  return (
                    <Card key={goal.id} className={`border-l-4 ${priorityColors[goal.priority]}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-cozy-text">{goal.name}</h3>
                            <p className="text-sm text-cozy-text-muted capitalize">{goal.category}</p>
                          </div>
                          <Button
                            onClick={() => deleteGoal(goal.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-cozy-gray-200 rounded-full h-2">
                              <div 
                                className="bg-cozy-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-cozy-text-muted">Current</p>
                              <p className="font-semibold">{formatCurrency(goal.currentAmount)}</p>
                            </div>
                            <div>
                              <p className="text-cozy-text-muted">Target</p>
                              <p className="font-semibold">{formatCurrency(goal.targetAmount)}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-cozy-text-muted">Target Date</p>
                              <p className="font-semibold">{new Date(goal.targetDate).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-cozy-text-muted">Monthly Need</p>
                              <p className="font-semibold text-green-600">{formatCurrency(monthlyContribution)}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                const newAmount = goal.currentAmount + 100
                                updateGoal(goal.id, { currentAmount: newAmount })
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              +€100
                            </Button>
                            <Button
                              onClick={() => {
                                const newAmount = Math.max(0, goal.currentAmount - 100)
                                updateGoal(goal.id, { currentAmount: newAmount })
                              }}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              -€100
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Bank Accounts Section */}
        <CollapsibleSection
          id="bank-accounts"
          title="Bank Accounts"
          icon={<CreditCard className="h-5 w-5" />}
          badge={bankAccounts.length}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-cozy-text-muted">
                Manage your bank accounts and known expenses
              </p>
              <Button
                onClick={() => {
                  const newAccount: BankAccount = {
                    id: Date.now().toString(),
                    name: `Account ${bankAccounts.length + 1}`,
                    type: 'checking',
                    target: 0,
                    knownExpenses: []
                  }
                  const newAccounts = [...bankAccounts, newAccount]
                  setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                  markAsChanged()
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </div>
            <div className="space-y-6">
              {bankAccounts.map((account, index) => (
                <div key={account.id} className="p-4 border rounded-lg space-y-4">
                  {/* Account Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Input
                        ref={(el) => {
                          inputRefs.current[`account-name-${index}`] = el
                        }}
                        defaultValue={account.name}
                        onChange={(e) => {
                          // Store the value in ref without causing re-renders
                          nameInputRefs.current[`account-name-${index}`] = e.target.value
                        }}
                        onBlur={(e) => {
                          // Only update state when user finishes editing
                          const newAccounts = bankAccounts.map((acc, i) => 
                            i === index ? { ...acc, name: e.target.value } : acc
                          )
                          setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                        }}
                        className="font-medium w-full"
                        placeholder="Account name"
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <select
                        value={account.type}
                        onChange={(e) => {
                          const newAccounts = bankAccounts.map((acc, i) => 
                            i === index ? { ...acc, type: e.target.value as BankAccount['type'] } : acc
                          )
                          setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                          markAsChanged()
                        }}
                        className="w-full px-3 py-2 border border-cozy-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cozy-primary"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="credit">Credit</option>
                        <option value="investment">Investment</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-32">
                      <CurrencyInput
                        value={account.target || 0}
                        onChange={(value) => {
                          const newAccounts = bankAccounts.map((acc, i) => 
                            i === index ? { ...acc, target: value } : acc
                          )
                          setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                        }}
                        placeholder="Target"
                        className={(() => {
                          const newTotalTargets = bankAccounts.reduce((sum, acc, i) => 
                            sum + (i === index ? (acc.target || 0) : acc.target), 0
                          )
                          const newTotalAllocated = autoSavingsTarget + newTotalTargets + totalPersonalKeep
                          const newUnallocated = totalSalary - newTotalAllocated
                          return newUnallocated < 0 ? 'border-red-300 bg-red-50' : ''
                        })()}
                        showSuggestions={true}
                        suggestions={[
                          Math.round(totalSalary * 0.1), // 10% of total income
                          Math.round(totalSalary * 0.15), // 15% of total income
                          Math.round(totalSalary * 0.2), // 20% of total income
                          Math.round(totalSalary * 0.25), // 25% of total income
                          1000, 1500, 2000, 3000, 5000
                        ].filter((val, index, arr) => val > 0 && arr.indexOf(val) === index)}
                        max={totalSalary * 0.8} // Max 80% of total income
                      />
                    </div>
                    {bankAccounts.length > 1 && (
                      <Button
                        onClick={() => {
                          const newAccounts = bankAccounts.filter((_, i) => i !== index)
                          setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                          markAsChanged()
                        }}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Known Expenses */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-cozy-text">Known Expenses</h4>
                      <Button
                        onClick={() => {
                          const newExpense: KnownExpense = {
                            id: Date.now().toString(),
                            name: '',
                            amount: 0,
                            frequency: 'monthly',
                            category: 'Other'
                          }
                          const newAccounts = bankAccounts.map((acc, i) => 
                            i === index 
                              ? { ...acc, knownExpenses: [...acc.knownExpenses, newExpense] }
                              : acc
                          )
                          setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                          markAsChanged()
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Expense
                      </Button>
                    </div>
                    
                    {account.knownExpenses.map((expense, expenseIndex) => (
                      <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-cozy-cream rounded-lg">
                        <div className="flex-1 min-w-0">
                          <Input
                            ref={(el) => {
                              inputRefs.current[`expense-name-${index}-${expenseIndex}`] = el
                            }}
                            defaultValue={expense.name}
                            onChange={(e) => {
                              // Store the value in ref without causing re-renders
                              nameInputRefs.current[`expense-name-${index}-${expenseIndex}`] = e.target.value
                            }}
                            onBlur={(e) => {
                              // Only update state when user finishes editing
                              const newAccounts = bankAccounts.map((acc, i) => 
                                i === index 
                                  ? { 
                                      ...acc, 
                                      knownExpenses: acc.knownExpenses.map((exp, expIdx) => 
                                        expIdx === expenseIndex ? { ...exp, name: e.target.value } : exp
                                      )
                                    } 
                                  : acc
                              )
                              setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                            }}
                            placeholder="Expense name"
                            className="text-sm w-full"
                          />
                        </div>
                        <div className="w-full sm:w-24">
                          <CurrencyInput
                            value={expense.amount || 0}
                            onChange={(value) => {
                              const newAccounts = bankAccounts.map((acc, i) => 
                                i === index 
                                  ? { 
                                      ...acc, 
                                      knownExpenses: acc.knownExpenses.map((exp, expIdx) => 
                                        expIdx === expenseIndex ? { ...exp, amount: value } : exp
                                      )
                                    } 
                                  : acc
                              )
                              setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                              markAsChanged()
                            }}
                            placeholder="Amount"
                            className="text-sm w-full"
                          />
                        </div>
                        <div className="w-full sm:w-28">
                          <select
                            value={expense.frequency}
                            onChange={(e) => {
                              const newAccounts = bankAccounts.map((acc, i) => 
                                i === index 
                                  ? { 
                                      ...acc, 
                                      knownExpenses: acc.knownExpenses.map((exp, expIdx) => 
                                        expIdx === expenseIndex ? { ...exp, frequency: e.target.value as KnownExpense['frequency'] } : exp
                                      )
                                    } 
                                  : acc
                              )
                              setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                              markAsChanged()
                            }}
                            className="w-full px-2 py-1 text-sm border border-cozy-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cozy-primary"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                            <option value="one-time">One-time</option>
                          </select>
                        </div>
                        <Button
                          onClick={() => {
                            const newAccounts = bankAccounts.map((acc, i) => 
                              i === index 
                                ? { ...acc, knownExpenses: acc.knownExpenses.filter((_, expIdx) => expIdx !== expenseIndex) }
                                : acc
                            )
                            setFinanceState(prev => ({ ...prev, bankAccounts: newAccounts }))
                            markAsChanged()
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

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
                    setFinanceState(prev => ({ ...prev, splitMethod: method.key as SplitMethod }))
                    markAsChanged()
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
              accounts={bankAccounts}
              earners={earners}
              split={calculateSplit}
              autoSavingsTarget={autoSavingsTarget}
              savingsPct={savingsPct}
            />
            <ContribCardsMobile
              accounts={bankAccounts}
              earners={earners}
              split={calculateSplit}
              autoSavingsTarget={autoSavingsTarget}
              savingsPct={savingsPct}
            />
          </CardContent>
        </Card>

      </div>
    </ModernAppShell>
  )
}