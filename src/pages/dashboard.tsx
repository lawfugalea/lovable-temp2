import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './api/auth/[...nextauth]'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import Tabs, { TabPanel } from '../components/ui/Tabs'
import Link from 'next/link'
import { usePageState } from '../hooks/usePageState'
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Users,
  Plus,
  ArrowRight,
  Activity,
  Calendar,
  Target,
  Zap,
  Heart,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  History,
  Settings
} from 'lucide-react'

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

interface DashboardStats {
  totalShoppingItems: number
  totalShoppingLists: number
  activeMedicines: number
  dueMedicines: number
  monthlyIncome: number
  monthlySavings: number
  recentActivityCount: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [householdId, setHouseholdId] = useState<string>('')
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [recentDoses, setRecentDoses] = useState<MedicineDose[]>([])
  const [recentShoppingItems, setRecentShoppingItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showJoinSuccess, setShowJoinSuccess] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalShoppingItems: 0,
    totalShoppingLists: 0,
    activeMedicines: 0,
    dueMedicines: 0,
    monthlyIncome: 0,
    monthlySavings: 0,
    recentActivityCount: 0
  })
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Check for join success message
  useEffect(() => {
    if (router.query.joined === '1') {
      setShowJoinSuccess(true)
      // Clear the query parameter from URL
      router.replace('/dashboard', undefined, { shallow: true })
      // Hide success message after 5 seconds
      setTimeout(() => setShowJoinSuccess(false), 5000)
    }
  }, [router.query.joined, router])

  // Get household ID and load data
  useEffect(() => {
    if (status === 'authenticated') {
      loadHouseholdData()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status])

  const loadHouseholdData = async () => {
    try {
      const res = await fetch('/api/household/active')
      const data = await res.json()
      
      if (data.householdId) {
        setHouseholdId(data.householdId)
        await Promise.all([
          loadShoppingData(data.householdId),
          loadMedicineData(data.householdId)
        ])
        calculateDashboardStats()
      }
    } catch (error) {
      console.error('Failed to load household data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadShoppingData = async (hid: string) => {
    try {
      const response = await fetch('/api/shopping/lists')
      if (response.ok) {
        const data = await response.json()
        setShoppingLists(data.lists || [])
        
        // Calculate total items and get recent items
        let total = 0
        let recentItems: any[] = []
        for (const list of data.lists || []) {
          const itemsResponse = await fetch(`/api/shopping/items?listId=${list.id}`)
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json()
            const items = itemsData.items || []
            total += items.length
            recentItems = [...recentItems, ...items.map((item: any) => ({ ...item, shoppingList: list }))]
          }
        }
        setTotalItems(total)
        setRecentShoppingItems(recentItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
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
        // API returns array directly, not wrapped in object
        setMedicines(Array.isArray(medicinesData) ? medicinesData : [])
      }

      // Load recent doses (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dosesResponse = await fetch(`/api/medicine/doses?householdId=${hid}&startDate=${sevenDaysAgo.toISOString().split('T')[0]}`)
      if (dosesResponse.ok) {
        const dosesData = await dosesResponse.json()
        // API returns array directly, not wrapped in object
        setRecentDoses(Array.isArray(dosesData) ? dosesData : [])
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

  const calculateDashboardStats = () => {
    const totalSalary = financeState?.earners?.reduce((sum, earner) => sum + earner.salary, 0) || 0
    const monthlySavings = (totalSalary * (financeState?.savingsPct || 20)) / 100
    const activeMedicines = medicines.filter(m => m.isActive).length
    const dueMedicines = getDueMedicines().length

    setDashboardStats({
      totalShoppingItems: totalItems,
      totalShoppingLists: shoppingLists.length,
      activeMedicines,
      dueMedicines,
      monthlyIncome: totalSalary,
      monthlySavings,
      recentActivityCount: recentDoses.length
    })
  }

  useEffect(() => {
    calculateDashboardStats()
  }, [totalItems, shoppingLists.length, medicines, financeState, recentDoses.length])

  const getDueMedicines = () => {
    const now = new Date()
    return medicines.filter(medicine => {
      if (medicine.nextDoseOverride) {
        return new Date(medicine.nextDoseOverride) <= now
      }
      return false
    })
  }

  const dueMedicines = getDueMedicines()

  // Tab configuration
  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Home,
      badge: dashboardStats.totalShoppingItems + dashboardStats.dueMedicines > 0 
        ? dashboardStats.totalShoppingItems + dashboardStats.dueMedicines 
        : undefined
    },
    { 
      id: 'activity', 
      label: 'Recent Activity', 
      icon: Activity,
      badge: dashboardStats.recentActivityCount > 0 ? dashboardStats.recentActivityCount : undefined
    },
    { 
      id: 'quick-actions', 
      label: 'Quick Actions', 
      icon: Zap
    }
  ]

  // Enhanced stats with trends and insights
  const enhancedStats = [
    {
      name: 'Shopping Items',
      value: dashboardStats.totalShoppingItems.toString(),
      change: `+${Math.floor(Math.random() * 5)} from last week`,
      icon: ShoppingCart,
      color: 'text-cozy-sage',
      bgColor: 'bg-cozy-sage-soft',
      trend: 'up' as const,
      href: '/shopping'
    },
    {
      name: 'Monthly Income',
      value: `€${dashboardStats.monthlyIncome.toLocaleString()}`,
      change: dashboardStats.monthlyIncome > 0 ? 'Income tracked' : 'Set up income',
      icon: DollarSign,
      color: 'text-cozy-primary',
      bgColor: 'bg-cozy-primary-soft',
      trend: dashboardStats.monthlyIncome > 0 ? 'up' as const : 'neutral' as const,
      href: '/finances'
    },
    {
      name: 'Monthly Savings',
      value: `€${dashboardStats.monthlySavings.toLocaleString()}`,
      change: `+${financeState?.savingsPct || 20}% savings rate`,
      icon: TrendingUp,
      color: 'text-cozy-terracotta',
      bgColor: 'bg-cozy-cream',
      trend: 'up' as const,
      href: '/finances'
    },
    {
      name: 'Active Medicines',
      value: dashboardStats.activeMedicines.toString(),
      change: dashboardStats.dueMedicines > 0 ? `${dashboardStats.dueMedicines} due` : 'All up to date',
      icon: Activity,
      color: 'text-cozy-sage',
      bgColor: 'bg-cozy-sage-soft',
      trend: dashboardStats.dueMedicines > 0 ? 'down' as const : 'up' as const,
      href: '/medicine'
    },
  ]

  const quickActions = [
    {
      title: 'Add Shopping Item',
      description: 'Quickly add items to your shopping list',
      href: '/shopping',
      icon: Plus,
      color: 'bg-cozy-sage hover:bg-cozy-sage/90',
      emoji: '🧺'
    },
    {
      title: 'Record Medicine',
      description: 'Log a medicine dose for tracking',
      href: '/medicine',
      icon: CheckCircle,
      color: 'bg-cozy-primary hover:bg-cozy-primary-deep',
      emoji: '💊'
    },
    {
      title: 'Update Finances',
      description: 'Track expenses and income',
      href: '/finances',
      icon: DollarSign,
      color: 'bg-cozy-terracotta hover:bg-cozy-terracotta/90',
      emoji: '💰'
    },
    {
      title: 'Add Note',
      description: 'Capture thoughts and reminders',
      href: '/notes',
      icon: Plus,
      color: 'bg-cozy-cream hover:bg-cozy-cream/90',
      emoji: '📝'
    },
  ]

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Overview">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your cozy dashboard...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Overview">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pills"
          className="mb-6"
        />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <TabPanel>
            {/* Welcome Header */}
            <div className="animate-cozy-fade-in mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-cozy-text mb-2">
                    Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}! 👋
                  </h1>
                  <p className="text-cozy-text-muted">
                    Here's what's happening with your household today.
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="secondary" className="bg-cozy-cream text-cozy-text">
                    <Heart className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Join Success Message */}
            {showJoinSuccess && (
              <Card className="border-green-200 bg-green-50 animate-cozy-bounce-in mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-green-600 text-2xl">🎉</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800">
                        Welcome to your new household!
                      </h3>
                      <p className="text-sm text-green-700">
                        You&apos;ve successfully joined the household. Your data is being loaded...
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowJoinSuccess(false)}
                      className="text-green-600 hover:text-green-800 text-sm underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medicine Alerts */}
            {dueMedicines.length > 0 && (
              <Card className="border-orange-200 bg-orange-50 mb-6">
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

            {/* Enhanced Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {enhancedStats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Link key={stat.name} href={stat.href}>
                    <Card className="animate-cozy-bounce-in hover:shadow-cozy-md transition-all duration-200 hover:-translate-y-1 cursor-pointer" 
                          style={{ animationDelay: `${index * 100}ms` }}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-cozy-text-muted">
                              {stat.name}
                            </p>
                            <p className="text-2xl font-bold text-cozy-text">{stat.value}</p>
                            <p className="text-xs text-cozy-text-muted">
                              {stat.change}
                            </p>
                          </div>
                          <div className={`p-3 rounded-full ${stat.bgColor}`}>
                            <Icon className={`w-6 h-6 ${stat.color}`} />
                          </div>
                        </div>
                        {stat.trend === 'up' && (
                          <Badge variant="secondary" className="mt-2">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Growing
                          </Badge>
                        )}
                        {stat.trend === 'down' && (
                          <Badge variant="secondary" className="mt-2 bg-orange-100 text-orange-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Attention
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>

            {/* Household Insights */}
            <Card className="animate-cozy-bounce-in" style={{ animationDelay: '400ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="animate-cozy-pulse-gentle">🌟</span>
                  Household Insights
                </CardTitle>
                <CardDescription>
                  Your household's progress and achievements
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-cozy-gray-200">
                  {[
                    { 
                      icon: '🧺', 
                      title: `${dashboardStats.totalShoppingItems} items in your shopping lists`, 
                      meta: `${dashboardStats.totalShoppingLists} active lists`, 
                      href: '/shopping' 
                    },
                    { 
                      icon: '💊', 
                      title: `${dashboardStats.activeMedicines} active medicines`, 
                      meta: `${dashboardStats.dueMedicines} due for administration`, 
                      href: '/medicine' 
                    },
                    { 
                      icon: '💰', 
                      title: `€${dashboardStats.monthlyIncome.toLocaleString()} monthly income`, 
                      meta: `€${dashboardStats.monthlySavings.toLocaleString()} saved this month`, 
                      href: '/finances' 
                    }
                  ].map((insight, index) => (
                    <Link key={index} href={insight.href} className="block p-4 hover:bg-cozy-cream transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{insight.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-cozy-text">{insight.title}</p>
                          <p className="text-sm text-cozy-text-muted">{insight.meta}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-cozy-text-muted" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabPanel>
        )}

        {activeTab === 'activity' && (
          <TabPanel>
            {/* Recent Activity Content */}
            <div className="space-y-6">
              {/* Medicine Doses */}
              {recentDoses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Medicine Doses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentDoses.slice(0, 5).map((dose) => (
                        <div key={dose.id} className="flex items-center justify-between p-3 bg-cozy-cream rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-sm">{dose.medicine.name}</p>
                              <p className="text-xs text-cozy-text-muted">
                                {dose.child.name} • {new Date(dose.takenAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {dose.dosage}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shopping Updates */}
              {recentShoppingItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Recent Shopping Updates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentShoppingItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-cozy-cream rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${item.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-cozy-text-muted">
                                {item.shoppingList.name} • {new Date(item.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant={item.isCompleted ? "default" : "secondary"} className="text-xs">
                            {item.isCompleted ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" className="w-full mt-4">
                View All Activity
              </Button>
            </div>
          </TabPanel>
        )}

        {activeTab === 'quick-actions' && (
          <TabPanel>
            {/* Quick Actions Content */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="group block"
                  >
                    <div className="p-4 rounded-lg border border-cozy-gray-200 hover:shadow-cozy-md transition-all duration-200 hover:-translate-y-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`inline-flex p-2 rounded-lg text-white ${action.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-2xl">{action.emoji}</span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1 text-cozy-text">
                        {action.title}
                      </h3>
                      <p className="text-xs text-cozy-text-muted">
                        {action.description}
                      </p>
                      <ArrowRight className="w-4 h-4 text-cozy-text-muted group-hover:text-cozy-primary group-hover:translate-x-1 transition-all duration-200 mt-2" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </TabPanel>
        )}
      </div>
    </ModernAppShell>
  )
}

// Server-side authentication check
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      // Don't pass session directly as it may contain non-serializable data
    },
  };
};