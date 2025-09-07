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
  Activity
} from 'lucide-react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'

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
  children: Child[]
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

export default function FeverJournal({ householdId, children }: FeverJournalProps) {
  const [readings, setReadings] = useState<FeverReading[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingReading, setEditingReading] = useState<FeverReading | null>(null)
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all')
  const [newReading, setNewReading] = useState({
    childId: '',
    temperature: '',
    unit: 'C',
    method: 'oral',
    notes: '',
    takenBy: '',
    takenAt: new Date().toISOString().slice(0, 16)
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
          takenAt: new Date().toISOString().slice(0, 16)
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
          takenAt: new Date().toISOString().slice(0, 16)
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
      takenAt: new Date(reading.takenAt).toISOString().slice(0, 16)
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
      takenAt: new Date().toISOString().slice(0, 16)
    })
  }

  const filteredReadings = selectedChildFilter === 'all' 
    ? readings 
    : readings.filter(reading => reading.childId === selectedChildFilter)

  const handleDeleteReading = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) return

    try {
      const response = await fetch(`/api/medicine/fever-readings?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadReadings()
      }
    } catch (error) {
      console.error('Failed to delete fever reading:', error)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <Thermometer className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Fever Journal</h2>
            <p className="text-sm text-gray-600">Track your child's temperature readings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Child Filter */}
          <select
            value={selectedChildFilter}
            onChange={(e) => setSelectedChildFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Children</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Reading
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {readings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {children.map(child => {
            const childReadings = readings.filter(r => r.childId === child.id)
            const latestReading = childReadings[0]
            const trend = getRecentTrend(child.id)
            
            if (!latestReading) return null

            const feverLevel = getFeverLevel(latestReading.temperature, latestReading.unit)
            const TrendIcon = trend?.icon

            return (
              <Card key={child.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{child.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatTemperature(latestReading.temperature, latestReading.unit)}
                    </p>
                    <Badge className={`mt-1 ${feverLevel.color}`}>
                      {feverLevel.label}
                    </Badge>
                  </div>
                  {TrendIcon && (
                    <TrendIcon className={`h-5 w-5 ${trend.color}`} />
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Readings List */}
      {groupedReadings.length > 0 ? (
        <div className="space-y-4">
          {groupedReadings.map(({ date, readings }) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {isToday(parseISO(date)) ? 'Today' : 
                   isYesterday(parseISO(date)) ? 'Yesterday' : 
                   format(parseISO(date), 'EEEE, MMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {readings.map(reading => {
                  const feverLevel = getFeverLevel(reading.temperature, reading.unit)
                  const ageInMonths = getAgeInMonths(reading.child.dateOfBirth)
                  
                  return (
                    <div key={reading.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {formatTemperature(reading.temperature, reading.unit)}
                          </span>
                        </div>
                        <Badge className={feverLevel.color}>
                          {feverLevel.label}
                        </Badge>
                        <div className="text-sm text-gray-600">
                          {reading.child.name} ({ageInMonths}mo)
                        </div>
                        <div className="text-sm text-gray-500">
                          {TEMPERATURE_METHODS.find(m => m.value === reading.method)?.icon} {TEMPERATURE_METHODS.find(m => m.value === reading.method)?.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(reading.takenAt), 'h:mm a')}
                        </div>
                        {reading.notes && (
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {reading.notes}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(reading)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit reading"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReading(reading.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete reading"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Thermometer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No fever readings yet</h3>
            <p className="text-gray-600 mb-4">Start tracking your child's temperature to monitor their health</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Reading
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Reading Modal */}
      {(showAddModal || editingReading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingReading ? 'Edit Temperature Reading' : 'Add Temperature Reading'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingReading ? handleEditReading : handleAddReading} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Child</label>
                  <select
                    value={newReading.childId}
                    onChange={(e) => setNewReading({ ...newReading, childId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select a child</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name} ({getAgeInMonths(child.dateOfBirth)}mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Temperature</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newReading.temperature}
                      onChange={(e) => setNewReading({ ...newReading, temperature: e.target.value })}
                      placeholder="37.0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unit</label>
                    <select
                      value={newReading.unit}
                      onChange={(e) => setNewReading({ ...newReading, unit: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="C">Celsius (°C)</option>
                      <option value="F">Fahrenheit (°F)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Method</label>
                  <select
                    value={newReading.method}
                    onChange={(e) => setNewReading({ ...newReading, method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {TEMPERATURE_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.icon} {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={newReading.takenAt}
                    onChange={(e) => setNewReading({ ...newReading, takenAt: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                  <Input
                    value={newReading.notes}
                    onChange={(e) => setNewReading({ ...newReading, notes: e.target.value })}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Taken by (optional)</label>
                  <Input
                    value={newReading.takenBy}
                    onChange={(e) => setNewReading({ ...newReading, takenBy: e.target.value })}
                    placeholder="Parent, caregiver, etc."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={editingReading ? cancelEdit : () => setShowAddModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading 
                      ? (editingReading ? 'Updating...' : 'Adding...') 
                      : (editingReading ? 'Update Reading' : 'Add Reading')
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
