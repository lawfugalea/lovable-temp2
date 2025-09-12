import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import { 
  Calendar, Clock, TrendingUp, Users, Pill, 
  ChevronLeft, ChevronRight, Filter, Download
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

const MedicineAnalytics: React.FC<MedicineAnalyticsProps> = ({ doses, children, medicines }) => {
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

  // Prepare data for timeline chart - show actual dates, not aggregated hours
  const timelineData = useMemo(() => {
    const data: { [key: string]: { doses: number, details: any[] } } = {}
    
    filteredDoses.forEach(dose => {
      const date = format(new Date(dose.takenAt), 'yyyy-MM-dd')
      if (!data[date]) {
        data[date] = { doses: 0, details: [] }
      }
      data[date].doses += 1
      data[date].details.push({
        child: dose.child.name,
        medicine: dose.medicine.name,
        time: format(new Date(dose.takenAt), 'HH:mm'),
        dosage: dose.dosage
      })
    })

    // Create array of dates with counts and details
    const startDate = timeRange === 'week' ? startOfWeek(new Date()) : 
                     timeRange === 'month' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) :
                     timeRange === '3months' ? new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1) :
                     new Date(new Date().getFullYear(), 0, 1)
    
    const endDate = new Date()
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    
    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayData = data[dateKey] || { doses: 0, details: [] }
      return {
        date: format(day, 'MMM dd'),
        fullDate: dateKey,
        doses: dayData.doses,
        details: dayData.details
      }
    })
  }, [filteredDoses, timeRange])

  // Prepare data for medicine adherence chart
  const adherenceData = useMemo(() => {
    const medicineStats: { [key: string]: { name: string, total: number, given: number, type: string } } = {}
    
    // Count total expected doses for each medicine
    medicines.forEach(medicine => {
      if (medicine.medicineType === 'course' && medicine.childId) {
        // For courses, estimate expected doses based on frequency
        const frequency = medicine.frequency || 'daily'
        let expectedPerDay = 1
        if (frequency.includes('twice')) expectedPerDay = 2
        if (frequency.includes('three')) expectedPerDay = 3
        if (frequency.includes('four')) expectedPerDay = 4
        
        const daysSinceStart = medicine.startDate ? 
          Math.ceil((new Date().getTime() - new Date(medicine.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 30
        
        medicineStats[medicine.id] = {
          name: medicine.name,
          total: Math.max(1, expectedPerDay * daysSinceStart),
          given: 0,
          type: medicine.medicineType || 'unknown'
        }
      }
    })
    
    // Count actual doses given
    filteredDoses.forEach(dose => {
      if (medicineStats[dose.medicine.id]) {
        medicineStats[dose.medicine.id].given++
      }
    })
    
    return Object.values(medicineStats).map(stat => ({
      name: stat.name,
      adherence: Math.round((stat.given / stat.total) * 100),
      given: stat.given,
      total: stat.total,
      type: stat.type
    }))
  }, [filteredDoses, medicines])

  // Prepare data for child comparison
  const childData = useMemo(() => {
    const childStats: { [key: string]: { name: string, doses: number, medicines: Set<string> } } = {}
    
    children.forEach(child => {
      childStats[child.id] = {
        name: child.name,
        doses: 0,
        medicines: new Set()
      }
    })
    
    filteredDoses.forEach(dose => {
      if (childStats[dose.child.id]) {
        childStats[dose.child.id].doses++
        childStats[dose.child.id].medicines.add(dose.medicine.id)
      }
    })
    
    return Object.values(childStats).map(stat => ({
      name: stat.name,
      doses: stat.doses,
      medicines: stat.medicines.size
    }))
  }, [filteredDoses, children])

  // Prepare data for time pattern analysis - show actual dose times with details
  const timePatternData = useMemo(() => {
    const hourlyData: { [key: number]: { count: number, doses: any[] } } = {}
    
    filteredDoses.forEach(dose => {
      const hour = new Date(dose.takenAt).getHours()
      if (!hourlyData[hour]) {
        hourlyData[hour] = { count: 0, doses: [] }
      }
      hourlyData[hour].count += 1
      hourlyData[hour].doses.push({
        child: dose.child.name,
        medicine: dose.medicine.name,
        time: format(new Date(dose.takenAt), 'HH:mm'),
        date: format(new Date(dose.takenAt), 'MMM dd'),
        dosage: dose.dosage
      })
    })
    
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      doses: hourlyData[i]?.count || 0,
      details: hourlyData[i]?.doses || []
    }))
  }, [filteredDoses])

  // Calculate summary stats
  const totalDoses = filteredDoses.length
  const uniqueMedicines = new Set(filteredDoses.map(d => d.medicine.id)).size
  const uniqueChildren = new Set(filteredDoses.map(d => d.child.id)).size
  const averageAdherence = adherenceData.length > 0 ? 
    Math.round(adherenceData.reduce((sum, item) => sum + item.adherence, 0) / adherenceData.length) : 0

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Medicine Analytics
              </CardTitle>
              <p className="text-sm text-cozy-text-muted mt-1">
                Track medicine administration patterns and adherence
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Time range filter */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cozy-text-muted" />
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="text-sm border border-cozy-gray-200 rounded-md px-2 py-1"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              
              {/* Child filter */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cozy-text-muted" />
                <select 
                  value={selectedChild} 
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="text-sm border border-cozy-gray-200 rounded-md px-2 py-1"
                >
                  <option value="all">All Children</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Medicine filter */}
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-cozy-text-muted" />
                <select 
                  value={selectedMedicine} 
                  onChange={(e) => setSelectedMedicine(e.target.value)}
                  className="text-sm border border-cozy-gray-200 rounded-md px-2 py-1"
                >
                  <option value="all">All Medicines</option>
                  {medicines.map(medicine => (
                    <option key={medicine.id} value={medicine.id}>{medicine.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Pill className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cozy-text">{totalDoses}</p>
                <p className="text-sm text-cozy-text-muted">Total Doses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cozy-text">{averageAdherence}%</p>
                <p className="text-sm text-cozy-text-muted">Avg Adherence</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Pill className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cozy-text">{uniqueMedicines}</p>
                <p className="text-sm text-cozy-text-muted">Medicines Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cozy-text">{uniqueChildren}</p>
                <p className="text-sm text-cozy-text-muted">Children</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Explanations */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Understanding Your Charts</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Dose Timeline:</strong> Shows how many doses were given each day - hover to see details</p>
                <p><strong>Time Patterns:</strong> Shows when during the day medicines are typically given - hover to see which specific doses</p>
                <p><strong>Child Comparison:</strong> Compares how many doses each child has received</p>
                <p><strong>Medicine Adherence:</strong> Shows completion rates for each medicine</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dose Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dose Timeline</CardTitle>
            <p className="text-sm text-cozy-text-muted">Medicine doses given by date</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const details = props.payload.details || []
                      if (details.length === 0) return [value, 'Doses']
                      
                      return [
                        `${value} doses on ${props.payload.fullDate}`,
                        details.map((detail: any) => 
                          `${detail.child}: ${detail.medicine} (${detail.dosage}) at ${detail.time}`
                        ).join('\n')
                      ]
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="doses" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Medicine Adherence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Medicine Adherence</CardTitle>
            <p className="text-sm text-cozy-text-muted">Completion rates by medicine</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'Adherence']} />
                  <Bar dataKey="adherence" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Child Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Child Comparison</CardTitle>
            <p className="text-sm text-cozy-text-muted">Doses given by child</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={childData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="doses" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time Pattern Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time Patterns</CardTitle>
            <p className="text-sm text-cozy-text-muted">When medicines are typically given throughout the day</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timePatternData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const details = props.payload.details || []
                      if (details.length === 0) return [value, 'Doses']
                      
                      return [
                        `${value} doses at ${props.payload.hour}`,
                        details.map((detail: any) => 
                          `${detail.child}: ${detail.medicine} (${detail.dosage}) on ${detail.date}`
                        ).join('\n')
                      ]
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="doses" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Doses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Doses</CardTitle>
          <p className="text-sm text-cozy-text-muted">Latest medicine administrations</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cozy-gray-200">
                  <th className="text-left py-2">Child</th>
                  <th className="text-left py-2">Medicine</th>
                  <th className="text-left py-2">Dosage</th>
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoses.slice(0, 10).map(dose => (
                  <tr key={dose.id} className="border-b border-cozy-gray-100">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {dose.child.name}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dose.medicine.name}</span>
                        {dose.medicine.medicineType && (
                          <Badge variant="secondary" className="text-xs">
                            {dose.medicine.medicineType}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2">{dose.dosage}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-cozy-text-muted" />
                        {format(new Date(dose.takenAt), 'MMM dd, HH:mm')}
                      </div>
                    </td>
                    <td className="py-2 text-cozy-text-muted">
                      {dose.notes || '-'}
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

export default MedicineAnalytics
