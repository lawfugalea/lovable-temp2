import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart, RadialBarChart, RadialBar
} from 'recharts'
import { 
  Calendar, Clock, TrendingUp, Users, Pill, 
  ChevronLeft, ChevronRight, Filter, Download, Activity, Zap, Target
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays } from 'date-fns'

interface MedicineDose {
  id: string
  takenAt: string
  dosage: string
  notes?: string
  takenBy?: string
  childId: string
  medicineId: string
  child: {
    id: string
    name: string
  }
  medicine: {
    id: string
    name: string
    medicineType?: string
  }
}

interface Child {
  id: string
  name: string
}

interface Medicine {
  id: string
  childId: string | null
  name: string
  description?: string
  dosage: string
  medicineType?: string
  frequency: string
  startDate: string
  endDate?: string
  isActive: boolean
  isTemplate: boolean
  nextDoseOverride?: string
  overrideReason?: string
}

interface MedicineAnalyticsProps {
  doses: MedicineDose[]
  children: Child[]
  medicines: Medicine[]
}

// Modern color palette
const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  orange: '#f97316',
  slate: '#64748b'
}

const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', 
  '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
]

const ModernMedicineAnalytics: React.FC<MedicineAnalyticsProps> = ({ doses, children, medicines }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months' | 'year'>('month')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedMedicine, setSelectedMedicine] = useState<string>('all')

  // Filter doses based on selected filters
  const filteredDoses = useMemo(() => {
    let filtered = doses

    // Filter by time range
    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case 'week':
        startDate = startOfWeek(now)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }

    filtered = filtered.filter(dose => new Date(dose.takenAt) >= startDate)

    // Filter by child
    if (selectedChild !== 'all') {
      filtered = filtered.filter(dose => dose.child.id === selectedChild)
    }

    // Filter by medicine
    if (selectedMedicine !== 'all') {
      filtered = filtered.filter(dose => dose.medicine.id === selectedMedicine)
    }

    return filtered
  }, [doses, timeRange, selectedChild, selectedMedicine])

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalDoses = filteredDoses.length
    const uniqueMedicines = new Set(filteredDoses.map(d => d.medicine.id)).size
    const uniqueChildren = new Set(filteredDoses.map(d => d.child.id)).size
    
    // Calculate adherence rate (simplified - assumes all scheduled doses were taken)
    const adherenceRate = totalDoses > 0 ? Math.min(100, (totalDoses / Math.max(1, uniqueMedicines * 30)) * 100) : 0
    
    // Calculate average daily doses
    const daysInRange = Math.max(1, Math.ceil((new Date().getTime() - new Date(filteredDoses[0]?.takenAt || new Date()).getTime()) / (1000 * 60 * 60 * 24)))
    const avgDailyDoses = totalDoses / daysInRange

    return {
      totalDoses,
      uniqueMedicines,
      uniqueChildren,
      adherenceRate: Math.round(adherenceRate),
      avgDailyDoses: Math.round(avgDailyDoses * 10) / 10
    }
  }, [filteredDoses])

  // Daily doses data for area chart
  const dailyDosesData = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: new Date()
    })

    return days.map(day => {
      const dayDoses = filteredDoses.filter(dose => 
        isSameDay(new Date(dose.takenAt), day)
      )
      
      return {
        date: format(day, 'MMM dd'),
        fullDate: format(day, 'yyyy-MM-dd'),
        doses: dayDoses.length,
        children: new Set(dayDoses.map(d => d.child.id)).size,
        medicines: new Set(dayDoses.map(d => d.medicine.id)).size
      }
    })
  }, [filteredDoses])

  // Medicine distribution data
  const medicineDistributionData = useMemo(() => {
    const medicineCounts = filteredDoses.reduce((acc, dose) => {
      const key = dose.medicine.name
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(medicineCounts)
      .map(([name, count], index) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        value: count,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 medicines
  }, [filteredDoses])

  // Child adherence data
  const childAdherenceData = useMemo(() => {
    return children.map(child => {
      const childDoses = filteredDoses.filter(dose => dose.child.id === child.id)
      const childMedicines = medicines.filter(med => med.childId === child.id && med.isActive)
      
      // Simplified adherence calculation
      const expectedDoses = childMedicines.length * 30 // Assume 30 doses per month per medicine
      const adherence = expectedDoses > 0 ? Math.min(100, (childDoses.length / expectedDoses) * 100) : 0
      
      return {
        name: child.name,
        adherence: Math.round(adherence),
        doses: childDoses.length,
        medicines: childMedicines.length
      }
    })
  }, [filteredDoses, children, medicines])

  // Time-based trend data
  const trendData = useMemo(() => {
    const weeks = []
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = subDays(start, i * 7)
      const weekEnd = addDays(weekStart, 6)
      
      const weekDoses = filteredDoses.filter(dose => {
        const doseDate = new Date(dose.takenAt)
        return doseDate >= weekStart && doseDate <= weekEnd
      })
      
      weeks.push({
        week: format(weekStart, 'MMM dd'),
        doses: weekDoses.length,
        adherence: Math.min(100, (weekDoses.length / Math.max(1, medicines.length * 7)) * 100)
      })
    }
    
    return weeks
  }, [filteredDoses, medicines])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medicine Analytics</h2>
          <p className="text-gray-600">Track adherence and medication patterns</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Doses</p>
                <p className="text-2xl font-bold text-blue-900">{metrics.totalDoses}</p>
              </div>
              <Pill className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Medicines</p>
                <p className="text-2xl font-bold text-purple-900">{metrics.uniqueMedicines}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Adherence</p>
                <p className="text-2xl font-bold text-green-900">{metrics.adherenceRate}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Daily Avg</p>
                <p className="text-2xl font-bold text-orange-900">{metrics.avgDailyDoses}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-700">Children</p>
                <p className="text-2xl font-bold text-pink-900">{metrics.uniqueChildren}</p>
              </div>
              <Users className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="year">This Year</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <select 
                value={selectedChild} 
                onChange={(e) => setSelectedChild(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Children</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-gray-500" />
              <select 
                value={selectedMedicine} 
                onChange={(e) => setSelectedMedicine(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Medicines</option>
                {medicines.map(medicine => (
                  <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Doses Trend */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Daily Medicine Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyDosesData}>
                  <defs>
                    <linearGradient id="dosesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="doses"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    fill="url(#dosesGradient)"
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Medicine Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Medicine Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={medicineDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {medicineDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Child Adherence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Child Adherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={childAdherenceData}>
                  <RadialBar
                    dataKey="adherence"
                    cornerRadius={10}
                    fill={COLORS.success}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Weekly Adherence Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="week" 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="adherence"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: COLORS.success, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ModernMedicineAnalytics
