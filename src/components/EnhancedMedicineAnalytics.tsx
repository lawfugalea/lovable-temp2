import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts'
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns'
import { 
  calculateAdherenceMetrics, 
  getAdherenceInsights,
  type MedicineDose,
  type Medicine,
  type Child,
  type AdherenceMetrics
} from '@/lib/medicineAnalytics'

interface EnhancedMedicineAnalyticsProps {
  doses: MedicineDose[]
  children: Child[]
  medicines: Medicine[]
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6'
}

const CHART_COLORS = [
  COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, 
  COLORS.info, COLORS.purple, '#ec4899', '#14b8a6'
]

const EnhancedMedicineAnalytics: React.FC<EnhancedMedicineAnalyticsProps> = ({ 
  doses, 
  children, 
  medicines 
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months' | 'year'>('month')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedMedicine, setSelectedMedicine] = useState<string>('all')

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const endDate = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'week':
        startDate = subWeeks(endDate, 1)
        break
      case 'month':
        startDate = subMonths(endDate, 1)
        break
      case '3months':
        startDate = subMonths(endDate, 3)
        break
      case 'year':
        startDate = subMonths(endDate, 12)
        break
      default:
        startDate = subMonths(endDate, 1)
    }

    return { startDate, endDate }
  }, [timeRange])

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filteredDoses = doses.filter(dose => {
      const doseDate = new Date(dose.takenAt)
      return doseDate >= dateRange.startDate && doseDate <= dateRange.endDate
    })

    let filteredMedicines = medicines.filter(medicine => {
      if (selectedChild !== 'all' && medicine.childId !== selectedChild) return false
      if (selectedMedicine !== 'all' && medicine.id !== selectedMedicine) return false
      return true
    })

    // Filter doses to only include those from filtered medicines
    const filteredMedicineIds = new Set(filteredMedicines.map(m => m.id))
    filteredDoses = filteredDoses.filter(dose => filteredMedicineIds.has(dose.medicineId))

    return { doses: filteredDoses, medicines: filteredMedicines }
  }, [doses, medicines, selectedChild, selectedMedicine, dateRange])

  // Calculate enhanced adherence metrics
  const adherenceMetrics = useMemo(() => {
    return calculateAdherenceMetrics(
      filteredData.medicines,
      filteredData.doses,
      children,
      dateRange.startDate,
      dateRange.endDate
    )
  }, [filteredData, children, dateRange])

  // Get insights and recommendations
  const insights = useMemo(() => {
    return getAdherenceInsights(adherenceMetrics)
  }, [adherenceMetrics])

  // Prepare chart data
  const dailyAdherenceData = useMemo(() => {
    return adherenceMetrics.dailyAdherence.map(day => ({
      date: format(new Date(day.date), 'MMM dd'),
      adherence: day.adherence,
      expected: day.expectedDoses,
      actual: day.actualDoses,
      missed: day.expectedDoses - day.actualDoses
    }))
  }, [adherenceMetrics.dailyAdherence])

  const medicineAdherenceData = useMemo(() => {
    return adherenceMetrics.medicineAdherence
      .sort((a, b) => b.adherence - a.adherence)
      .slice(0, 8) // Top 8 medicines
      .map((medicine, index) => ({
        name: medicine.medicineName,
        adherence: medicine.adherence,
        expected: medicine.expectedDoses,
        actual: medicine.actualDoses,
        missed: medicine.missedDoses,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
  }, [adherenceMetrics.medicineAdherence])

  const childAdherenceData = useMemo(() => {
    return adherenceMetrics.childAdherence.map((child, index) => ({
      name: child.childName,
      adherence: child.adherence,
      expected: child.totalExpected,
      actual: child.totalActual,
      missed: child.totalMissed,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
  }, [adherenceMetrics.childAdherence])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Medicine Analytics</h2>
          <p className="text-gray-600">Comprehensive adherence tracking and insights</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex gap-2">
              {(['week', 'month', '3months', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === '3months' ? '3 Months' : range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>

            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Children</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>

            <select
              value={selectedMedicine}
              onChange={(e) => setSelectedMedicine(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Medicines</option>
              {medicines.map(medicine => (
                <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Overall Adherence</p>
                <p className="text-2xl font-bold text-blue-900">{adherenceMetrics.overallAdherence}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Doses</p>
                <p className="text-2xl font-bold text-green-900">
                  {adherenceMetrics.medicineAdherence.reduce((sum, m) => sum + m.actualDoses, 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Missed Doses</p>
                <p className="text-2xl font-bold text-orange-900">
                  {adherenceMetrics.medicineAdherence.reduce((sum, m) => sum + m.missedDoses, 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br border ${getRiskLevelColor(insights.riskLevel)}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Risk Level</p>
                <p className="text-2xl font-bold capitalize">{insights.riskLevel}</p>
              </div>
              <Activity className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Adherence Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Adherence Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyAdherenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="adherence"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Medicine Adherence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Medicine Adherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={medicineAdherenceData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="adherence" fill={COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Child Adherence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={childAdherenceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="adherence"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {childAdherenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Medicine Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Medicine Adherence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Medicine</th>
                  <th className="text-left p-2">Child</th>
                  <th className="text-right p-2">Adherence</th>
                  <th className="text-right p-2">Expected</th>
                  <th className="text-right p-2">Actual</th>
                  <th className="text-right p-2">Missed</th>
                  <th className="text-center p-2">Period</th>
                </tr>
              </thead>
              <tbody>
                {adherenceMetrics.medicineAdherence.map((medicine) => (
                  <tr key={medicine.medicineId} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{medicine.medicineName}</td>
                    <td className="p-2">{medicine.childName}</td>
                    <td className="p-2 text-right">
                      <Badge 
                        variant={medicine.adherence >= 90 ? 'default' : medicine.adherence >= 70 ? 'secondary' : 'destructive'}
                      >
                        {medicine.adherence}%
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{medicine.expectedDoses}</td>
                    <td className="p-2 text-right text-green-600">{medicine.actualDoses}</td>
                    <td className="p-2 text-right text-red-600">{medicine.missedDoses}</td>
                    <td className="p-2 text-center text-xs text-gray-500">
                      {medicine.period.days} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnhancedMedicineAnalytics
