import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { 
  Thermometer, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Filter,
  BarChart3
} from 'lucide-react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

interface Child {
  id: string
  name: string
  dateOfBirth: string
}

interface FeverReading {
  id: string
  childId: string
  temperature: number
  unit: string
  method: string
  takenAt: string
  notes?: string
  takenBy?: string
  child: Child
}

interface FeverJournalProps {
  householdId: string
  kids: Child[]
  triggerAddModal?: boolean
  onAddModalTriggered?: () => void
}

const TEMPERATURE_METHODS = [
  { value: 'oral', label: 'Oral', icon: '👄' },
  { value: 'rectal', label: 'Rectal', icon: '🌡️' },
  { value: 'axillary', label: 'Underarm', icon: '🤗' },
  { value: 'ear', label: 'Ear', icon: '👂' },
  { value: 'forehead', label: 'Forehead', icon: '🤒' }
]

const getFeverLevel = (temp: number, unit: string) => {
  const celsius = unit === 'F' ? (temp - 32) * 5/9 : temp
  
  if (celsius >= 40) return { level: 'high', color: 'bg-red-100 text-red-800', label: 'High Fever' }
  if (celsius >= 38.5) return { level: 'moderate', color: 'bg-orange-100 text-orange-800', label: 'Moderate Fever' }
  if (celsius >= 37.5) return { level: 'low', color: 'bg-yellow-100 text-yellow-800', label: 'Low Fever' }
  return { level: 'normal', color: 'bg-green-100 text-green-800', label: 'Normal' }
}

const formatTemperature = (temp: number, unit: string) => {
  return `${temp.toFixed(1)}°${unit}`
}

const getAgeInMonths = (dateOfBirth: string) => {
  const birth = parseISO(dateOfBirth)
  const now = new Date()
  const diffInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  return diffInMonths
}

const getCurrentLocalTime = () => {
  const now = new Date()
  
  // Create a new Date object and format it for datetime-local input
  // This ensures we get the exact current local time
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  // Return in the format expected by datetime-local input: YYYY-MM-DDTHH:MM
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Helper function to convert stored date to local datetime-local format
const dateToLocalDatetimeString = (dateString: string) => {
  // Parse the date string and create a new Date object
  const date = new Date(dateString)
  
  // The issue is that when we store a local time (e.g., 20:15), it gets stored as UTC in the database
  // When we retrieve it, we need to convert it back to the original local time
  // We do this by adjusting for the timezone offset
  
  // Get the timezone offset in minutes (positive means behind UTC, negative means ahead)
  const timezoneOffset = date.getTimezoneOffset()
  
  // Create a new date adjusted for the timezone offset
  // This gives us the original local time that was entered
  const localDate = new Date(date.getTime() - (timezoneOffset * 60000))
  
  const year = localDate.getUTCFullYear()
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(localDate.getUTCDate()).padStart(2, '0')
  const hours = String(localDate.getUTCHours()).padStart(2, '0')
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Modern Interactive Temperature Chart Component
const TemperatureChart = ({ readings }: { readings: FeverReading[] }) => {
  // Sort readings by date
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
  )

  if (sortedReadings.length === 0) return null

  // Prepare chart data
  const chartData = {
    labels: sortedReadings.map(reading => new Date(reading.takenAt)),
    datasets: [
      {
        label: 'Temperature',
        data: sortedReadings.map(reading => ({
          x: new Date(reading.takenAt),
          y: reading.temperature,
          childName: reading.child.name,
          feverLevel: getFeverLevel(reading.temperature, reading.unit),
          method: reading.method,
          notes: reading.notes
        })),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: sortedReadings.map(reading => {
          const feverLevel = getFeverLevel(reading.temperature, reading.unit)
          return feverLevel.level === 'high' ? '#ef4444' : 
                 feverLevel.level === 'moderate' ? '#f59e0b' : 
                 feverLevel.level === 'low' ? '#eab308' : '#22c55e'
        }),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
        pointHoverBackgroundColor: sortedReadings.map(reading => {
          const feverLevel = getFeverLevel(reading.temperature, reading.unit)
          return feverLevel.level === 'high' ? '#dc2626' : 
                 feverLevel.level === 'moderate' ? '#d97706' : 
                 feverLevel.level === 'low' ? '#ca8a04' : '#16a34a'
        }),
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      }
    ]
  }

  // Chart options with modern styling
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#ef4444',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 12
        },
        padding: 12,
        callbacks: {
          title: (context: any) => {
            const dataPoint = context[0].raw
            return `${dataPoint.childName} - ${format(new Date(dataPoint.x), 'MMM d, h:mm a')}`
          },
          label: (context: any) => {
            const dataPoint = context.raw
            const feverLevel = dataPoint.feverLevel
            return [
              `Temperature: ${formatTemperature(dataPoint.y, 'C')}`,
              `Status: ${feverLevel.label}`,
              `Method: ${TEMPERATURE_METHODS.find(m => m.value === dataPoint.method)?.label}`,
              ...(dataPoint.notes ? [`Notes: ${dataPoint.notes}`] : [])
            ]
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'MMM d, h:mm a',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          }
        }
      },
      y: {
        min: 35,
        max: 41,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11
          },
          callback: function(value: any) {
            return value + '°C'
          }
        }
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: '#ffffff'
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const
    }
  }

  return (
    <div className="w-full">
      {/* Chart Container */}
      <div className="relative h-80 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>
      
      {/* Modern Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
          <span className="text-xs font-medium text-gray-700">Normal (36-37.5°C)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
          <span className="text-xs font-medium text-gray-700">Low Fever (37.5-38.5°C)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></div>
          <span className="text-xs font-medium text-gray-700">Moderate (38.5-40°C)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
          <span className="text-xs font-medium text-gray-700">High Fever (40°C+)</span>
        </div>
      </div>
      
      {/* Chart Info */}
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          💡 Hover over data points for detailed information • Click and drag to zoom
        </p>
      </div>
    </div>
  )
}

export default function FeverJournal({ householdId, kids, triggerAddModal, onAddModalTriggered }: FeverJournalProps) {
  const [readings, setReadings] = useState<FeverReading[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingReading, setEditingReading] = useState<FeverReading | null>(null)
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('chart')
  const [selectedDateRange, setSelectedDateRange] = useState<{start: Date | null, end: Date | null}>({start: null, end: null})

  // Handle external trigger to open add modal
  useEffect(() => {
    if (triggerAddModal) {
      setShowAddModal(true)
      onAddModalTriggered?.()
    }
  }, [triggerAddModal, onAddModalTriggered])

  const [newReading, setNewReading] = useState({
    childId: '',
    temperature: '',
    unit: 'C',
    method: 'oral',
    notes: '',
    takenBy: '',
    takenAt: getCurrentLocalTime()
  })

  useEffect(() => {
    loadReadings()
  }, [householdId])

  const loadReadings = async () => {
    try {
      console.log('Loading fever readings...')
      const response = await fetch(`/api/medicine/fever-readings?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded readings:', data.length, 'items')
        setReadings(data)
      } else {
        console.error('Failed to load readings:', response.status)
      }
    } catch (error) {
      console.error('Failed to load fever readings:', error)
    }
  }

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReading.childId || !newReading.temperature) return

    setLoading(true)
    try {
      const requestData = {
        ...newReading,
        householdId: householdId
      }
      console.log('Sending fever reading data:', requestData)
      
      const response = await fetch('/api/medicine/fever-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        await loadReadings()
        setShowAddModal(false)
        setNewReading({
          childId: '',
          temperature: '',
          unit: 'C',
          method: 'oral',
          notes: '',
          takenBy: '',
          takenAt: getCurrentLocalTime()
        })
      } else {
        const errorData = await response.json()
        console.error('Failed to add fever reading:', response.status, errorData)
      }
    } catch (error) {
      console.error('Failed to add fever reading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditReading = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReading || !newReading.childId || !newReading.temperature) return

    setLoading(true)
    try {
      const requestData = {
        id: editingReading.id,
        ...newReading,
        householdId: householdId
      }
      console.log('Updating fever reading data:', requestData)
      
      const response = await fetch('/api/medicine/fever-readings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        console.log('Update successful, refreshing readings...')
        await loadReadings()
        console.log('Readings refreshed')
        setEditingReading(null)
        setNewReading({
          childId: '',
          temperature: '',
          unit: 'C',
          method: 'oral',
          notes: '',
          takenBy: '',
          takenAt: getCurrentLocalTime()
        })
      } else {
        const errorData = await response.json()
        console.error('Failed to update fever reading:', response.status, errorData)
      }
    } catch (error) {
      console.error('Failed to update fever reading:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (reading: FeverReading) => {
    setEditingReading(reading)
    setNewReading({
      childId: reading.childId,
      temperature: reading.temperature.toString(),
      unit: reading.unit,
      method: reading.method,
      notes: reading.notes || '',
      takenBy: reading.takenBy || '',
      takenAt: dateToLocalDatetimeString(reading.takenAt)
    })
  }

  const cancelEdit = () => {
    setEditingReading(null)
    setNewReading({
      childId: '',
      temperature: '',
      unit: 'C',
      method: 'oral',
      notes: '',
      takenBy: '',
      takenAt: getCurrentLocalTime()
    })
  }

  const clearDateRange = () => {
    setSelectedDateRange({ start: null, end: null })
  }

  // Filter readings based on child filter and date range
  const filteredReadings = readings.filter(reading => {
    const childMatch = selectedChildFilter === 'all' || reading.childId === selectedChildFilter
    const dateMatch = !selectedDateRange.start || !selectedDateRange.end || 
      (parseISO(reading.takenAt) >= selectedDateRange.start && parseISO(reading.takenAt) <= selectedDateRange.end)
    return childMatch && dateMatch
  })

  const handleDeleteReading = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) return

    try {
      const response = await fetch(`/api/medicine/fever-readings?id=${id}&householdId=${householdId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadReadings()
      } else {
        const errorData = await response.json()
        console.error('Failed to delete fever reading:', response.status, errorData)
        alert('Failed to delete fever reading. Please try again.')
      }
    } catch (error) {
      console.error('Failed to delete fever reading:', error)
      alert('Failed to delete fever reading. Please try again.')
    }
  }

  const getRecentTrend = (childId: string) => {
    const childReadings = readings
      .filter(r => r.childId === childId)
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
      .slice(0, 2)

    if (childReadings.length < 2) return null

    const [latest, previous] = childReadings
    const diff = latest.temperature - previous.temperature
    
    if (Math.abs(diff) < 0.1) return { trend: 'stable', icon: Activity, color: 'text-gray-500' }
    if (diff > 0) return { trend: 'rising', icon: TrendingUp, color: 'text-red-500' }
    return { trend: 'falling', icon: TrendingDown, color: 'text-green-500' }
  }

  const groupReadingsByDate = (readings: FeverReading[]) => {
    const groups: { [key: string]: FeverReading[] } = {}
    
    readings.forEach(reading => {
      const date = format(parseISO(reading.takenAt), 'yyyy-MM-dd')
      if (!groups[date]) groups[date] = []
      groups[date].push(reading)
    })

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, readings]) => ({
        date,
        readings: readings.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
      }))
  }

  const groupedReadings = groupReadingsByDate(filteredReadings)

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded-l ${viewMode === 'list' ? 'bg-red-500 text-white' : 'bg-white text-gray-700'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-2 py-1 rounded-r ${viewMode === 'chart' ? 'bg-red-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Chart
            </button>
          </div>
          
          {/* Child Filter */}
          <select
            value={selectedChildFilter}
            onChange={(e) => setSelectedChildFilter(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">All Children</option>
            {kids.map(child => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>

          {/* Date Range Filter */}
          {selectedDateRange.start && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Filter className="h-3 w-3" />
              <span>
                {format(selectedDateRange.start, 'MMM d')}
                {selectedDateRange.end && ` - ${format(selectedDateRange.end, 'MMM d')}`}
              </span>
              <button
                onClick={clearDateRange}
                className="text-red-500 hover:text-red-700 ml-1"
                title="Clear date range"
              >
                ×
              </button>
            </div>
          )}
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          size="sm"
          className="flex items-center gap-1 text-xs"
        >
          <Plus className="h-3 w-3" />
          Add Reading
        </Button>
      </div>

      {/* Compact Quick Stats */}
      {readings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {kids.map(child => {
            const childReadings = readings.filter(r => r.childId === child.id)
            const latestReading = childReadings[0]
            const trend = getRecentTrend(child.id)
            
            if (!latestReading) return null

            const feverLevel = getFeverLevel(latestReading.temperature, latestReading.unit)
            const TrendIcon = trend?.icon

            return (
              <div key={child.id} className="p-2 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{child.name}</h3>
                    <p className="text-xs text-gray-600">
                      {formatTemperature(latestReading.temperature, latestReading.unit)}
                    </p>
                    <Badge className={`mt-1 text-xs ${feverLevel.color}`}>
                      {feverLevel.label}
                    </Badge>
                  </div>
                  {TrendIcon && (
                    <TrendIcon className={`h-4 w-4 ${trend.color} flex-shrink-0`} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Chart or List View */}
      {viewMode === 'chart' ? (
        <div className="space-y-3">
          {/* Chart Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Temperature Trends
            </h3>
            <div className="text-xs text-gray-500">
              {filteredReadings.length} readings
            </div>
          </div>

          {/* Chart Container */}
          {filteredReadings.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <TemperatureChart readings={filteredReadings} />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No temperature data to display</p>
              <p className="text-xs mt-1">Add some readings to see the chart</p>
            </div>
          )}
        </div>
      ) : (
        /* Complete Readings List - Show All Data */
        groupedReadings.length > 0 ? (
          <div className="space-y-2">
            {groupedReadings.map(({ date, readings }) => (
              <div key={date} className="border border-gray-200 rounded-lg">
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                  <h3 className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {isToday(parseISO(date)) ? 'Today' : 
                     isYesterday(parseISO(date)) ? 'Yesterday' : 
                     format(parseISO(date), 'MMM d')}
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  {readings.map(reading => {
                    const feverLevel = getFeverLevel(reading.temperature, reading.unit)
                    const ageInMonths = getAgeInMonths(reading.child.dateOfBirth)
                    
                    return (
                      <div key={reading.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Thermometer className="h-3 w-3 text-gray-500 flex-shrink-0" />
                          <span className="font-medium">
                            {formatTemperature(reading.temperature, reading.unit)}
                          </span>
                          <Badge className={`text-xs ${feverLevel.color}`}>
                            {feverLevel.label}
                          </Badge>
                          <span className="text-gray-600 truncate">
                            {reading.child.name} ({ageInMonths}mo)
                          </span>
                          <span className="text-gray-500">
                            {TEMPERATURE_METHODS.find(m => m.value === reading.method)?.icon}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gray-500">
                            {format(parseISO(reading.takenAt), 'h:mm a')}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(reading)}
                              className="text-blue-500 hover:text-blue-700 p-1 h-6 w-6"
                              title="Edit"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReading(reading.id)}
                              className="text-red-500 hover:text-red-700 p-1 h-6 w-6"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Thermometer className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No fever readings yet</p>
            <p className="text-xs mt-1">Start tracking your child's temperature</p>
          </div>
        )
      )}

      {/* Add/Edit Reading Modal */}
      {(showAddModal || editingReading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {editingReading ? 'Edit Reading' : 'Add Reading'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={editingReading ? handleEditReading : handleAddReading} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Child</label>
                  <select
                    value={newReading.childId}
                    onChange={(e) => setNewReading({ ...newReading, childId: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    required
                  >
                    <option value="">Select a child</option>
                    {kids.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name} ({getAgeInMonths(child.dateOfBirth)}mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Temperature</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newReading.temperature}
                      onChange={(e) => setNewReading({ ...newReading, temperature: e.target.value })}
                      placeholder="37.0"
                      className="text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Unit</label>
                    <select
                      value={newReading.unit}
                      onChange={(e) => setNewReading({ ...newReading, unit: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="C">°C</option>
                      <option value="F">°F</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Method</label>
                  <select
                    value={newReading.method}
                    onChange={(e) => setNewReading({ ...newReading, method: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {TEMPERATURE_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.icon} {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={newReading.takenAt}
                    onChange={(e) => setNewReading({ ...newReading, takenAt: e.target.value })}
                    className="text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Notes (optional)</label>
                  <Input
                    value={newReading.notes}
                    onChange={(e) => setNewReading({ ...newReading, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={editingReading ? cancelEdit : () => setShowAddModal(false)}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="flex-1 text-xs"
                  >
                    {loading 
                      ? (editingReading ? 'Updating...' : 'Adding...') 
                      : (editingReading ? 'Update' : 'Add')
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
