import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useHouseholdId } from '@/lib/useHouseholdId'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { 
  Plus, 
  Calendar, 
  Clock, 
  Pill, 
  Baby, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Bell,
  User
} from 'lucide-react'
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns'
import FeverJournal from '../components/FeverJournal'

interface Child {
  id: string
  name: string
  dateOfBirth: string
  notes?: string
  isActive: boolean
}

interface Medicine {
  id: string
  childId: string
  name: string
  description?: string
  dosage: string
  frequency: string
  startDate: string
  endDate?: string
  isActive: boolean
  notes?: string
}

interface MedicineDose {
  id: string
  childId: string
  medicineId: string
  takenAt: string
  dosage: string
  notes?: string
  takenBy?: string
}

interface MedicineReminder {
  id: string
  childId: string
  medicineId: string
  scheduledAt: string
  reminderType: 'FIFTEEN_MINUTES' | 'FIVE_MINUTES' | 'DUE_NOW'
  isActive: boolean
}

export default function MedicinePage() {
  const { data: session } = useSession()
  const { householdId, loading: householdLoading } = useHouseholdId()
  
  // State
  const [children, setChildren] = useState<Child[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [doses, setDoses] = useState<MedicineDose[]>([])
  const [reminders, setReminders] = useState<MedicineReminder[]>([])
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [showAddChild, setShowAddChild] = useState(false)
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [showDoseModal, setShowDoseModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  
  // Form states
  const [newChild, setNewChild] = useState({ name: '', dateOfBirth: '', notes: '' })
  const [newMedicine, setNewMedicine] = useState({ 
    childId: '', 
    name: '', 
    description: '', 
    dosage: '', 
    frequency: '', 
    startDate: '', 
    endDate: '', 
    notes: '' 
  })
  const [newDose, setNewDose] = useState({ 
    childId: '',
    medicineId: '', 
    dosage: '', 
    notes: '', 
    takenAt: new Date().toISOString().slice(0, 16) 
  })
  const [reportDates, setReportDates] = useState({ 
    startDate: '', 
    endDate: '' 
  })

  // Load data
  useEffect(() => {
    if (householdId && !householdLoading) {
      loadChildren()
      loadMedicines()
      loadDoses()
      loadReminders()
    }
  }, [householdId, householdLoading])

  // Check for due medicines every minute
  useEffect(() => {
    const interval = setInterval(() => {
      checkDueMedicines()
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [medicines])

  const loadChildren = async () => {
    try {
      const response = await fetch(`/api/medicine/children?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setChildren(data)
      }
    } catch (error) {
      console.error('Failed to load children:', error)
    }
  }

  const loadMedicines = async () => {
    try {
      const response = await fetch(`/api/medicine/medicines?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setMedicines(data)
      }
    } catch (error) {
      console.error('Failed to load medicines:', error)
    }
  }

  const loadDoses = async () => {
    try {
      const response = await fetch(`/api/medicine/doses?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setDoses(data)
      }
    } catch (error) {
      console.error('Failed to load doses:', error)
    }
  }

  const loadReminders = async () => {
    try {
      const response = await fetch(`/api/medicine/reminders?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setReminders(data)
      }
    } catch (error) {
      console.error('Failed to load reminders:', error)
    }
  }

  const checkDueMedicines = () => {
    const now = new Date()
    const dueMedicines = medicines.filter(medicine => {
      if (!medicine.isActive) return false
      
      const lastDose = doses
        .filter(dose => dose.medicineId === medicine.id)
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
      
      if (!lastDose) return true // No doses taken yet
      
      // Calculate next dose time based on frequency
      const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
      return now >= nextDoseTime
    })

    if (dueMedicines.length > 0) {
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Medicine Reminder', {
          body: `${dueMedicines.length} medicine(s) are due`,
          icon: '/logo.png'
        })
      }
    }
  }

  const calculateNextDoseTime = (frequency: string, lastDoseTime: Date): Date => {
    const now = new Date()
    
    switch (frequency) {
      case 'every 2 hours':
        return new Date(lastDoseTime.getTime() + 2 * 60 * 60 * 1000)
      case 'every 4 hours':
        return new Date(lastDoseTime.getTime() + 4 * 60 * 60 * 1000)
      case 'every 6 hours':
        return new Date(lastDoseTime.getTime() + 6 * 60 * 60 * 1000)
      case 'every 8 hours':
        return new Date(lastDoseTime.getTime() + 8 * 60 * 60 * 1000)
      case 'every 12 hours':
        return new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
      case 'twice daily':
        return new Date(lastDoseTime.getTime() + 12 * 60 * 60 * 1000)
      case 'once daily':
        return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
      case 'as needed':
        return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000) // Default to 24 hours for "as needed"
      default:
        // Fallback for any custom frequencies
        if (frequency.includes('hour')) {
          const hours = parseInt(frequency.match(/\d+/)?.[0] || '6')
          return new Date(lastDoseTime.getTime() + hours * 60 * 60 * 1000)
        } else if (frequency.includes('daily')) {
          return new Date(lastDoseTime.getTime() + 24 * 60 * 60 * 1000)
        }
        return now
    }
  }

  const getNextDoseInfo = (medicine: any) => {
    const lastDose = doses
      .filter(d => d.medicineId === medicine.id)
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
    
    if (!lastDose) {
      return {
        nextDoseTime: new Date(medicine.startDate),
        isOverdue: new Date() > new Date(medicine.startDate),
        timeUntilNext: null
      }
    }

    const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
    const now = new Date()
    const isOverdue = now > nextDoseTime
    const timeUntilNext = nextDoseTime > now ? nextDoseTime.getTime() - now.getTime() : 0

    return {
      nextDoseTime,
      isOverdue,
      timeUntilNext,
      lastDoseTime: new Date(lastDose.takenAt)
    }
  }

  const formatTimeUntilNext = (milliseconds: number) => {
    if (milliseconds <= 0) return 'Overdue'
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const addChild = async () => {
    if (!newChild.name || !newChild.dateOfBirth) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/medicine/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          ...newChild
        })
      })
      
      if (response.ok) {
        setNewChild({ name: '', dateOfBirth: '', notes: '' })
        setShowAddChild(false)
        loadChildren()
      }
    } catch (error) {
      console.error('Failed to add child:', error)
    } finally {
      setLoading(false)
    }
  }

  const addMedicine = async () => {
    if (!newMedicine.childId || !newMedicine.name || !newMedicine.dosage || !newMedicine.frequency) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/medicine/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMedicine,
          startDate: newMedicine.startDate || new Date().toISOString()
        })
      })
      
      if (response.ok) {
        setNewMedicine({ 
          childId: '', 
          name: '', 
          description: '', 
          dosage: '', 
          frequency: '', 
          startDate: '', 
          endDate: '', 
          notes: '' 
        })
        setShowAddMedicine(false)
        loadMedicines()
      }
    } catch (error) {
      console.error('Failed to add medicine:', error)
    } finally {
      setLoading(false)
    }
  }

  const recordDose = async () => {
    if (!newDose.medicineId || !newDose.dosage) return
    
    // Get the childId from the selected medicine
    const selectedMedicine = medicines.find(m => m.id === newDose.medicineId)
    if (!selectedMedicine) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/medicine/doses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDose,
          childId: selectedMedicine.childId,
          takenBy: session?.user?.id
        })
      })
      
      if (response.ok) {
        setNewDose({ 
          childId: '',
          medicineId: '', 
          dosage: '', 
          notes: '', 
          takenAt: new Date().toISOString().slice(0, 16) 
        })
        setShowDoseModal(false)
        loadDoses()
      } else {
        const errorData = await response.json()
        console.error('Failed to record dose:', errorData.error)
      }
    } catch (error) {
      console.error('Failed to record dose:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!reportDates.startDate || !reportDates.endDate) return
    
    try {
      const response = await fetch(`/api/medicine/report?householdId=${householdId}&startDate=${reportDates.startDate}&endDate=${reportDates.endDate}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `medicine-report-${reportDates.startDate}-to-${reportDates.endDate}.txt`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    }
  }

  const getChildAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth)
    const now = new Date()
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    
    if (ageInMonths < 12) {
      return `${ageInMonths} months`
    } else {
      const years = Math.floor(ageInMonths / 12)
      const months = ageInMonths % 12
      return months > 0 ? `${years}y ${months}m` : `${years} years`
    }
  }

  const getDueMedicines = () => {
    const now = new Date()
    return medicines.filter(medicine => {
      if (!medicine.isActive) return false
      
      const lastDose = doses
        .filter(dose => dose.medicineId === medicine.id)
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
      
      if (!lastDose) return true
      
      const nextDoseTime = calculateNextDoseTime(medicine.frequency, new Date(lastDose.takenAt))
      return now >= nextDoseTime
    })
  }

  const getTodaysDoses = () => {
    const today = new Date().toISOString().split('T')[0]
    return doses.filter(dose => dose.takenAt.startsWith(today))
  }

  if (!session) {
    return <div>Please sign in to access medicine tracking.</div>
  }

  if (householdLoading) {
    return (
      <ModernAppShell title="Medicine">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading medicine tracking...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Medicine">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-cozy-text mb-2">Kids Medicine Control</h1>
          <p className="text-cozy-text-muted">Track and manage your children's medications</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Baby className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Children</p>
                  <p className="text-2xl font-bold text-cozy-text">{children.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Pill className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Active Medicines</p>
                  <p className="text-2xl font-bold text-cozy-text">{medicines.filter(m => m.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Due Now</p>
                  <p className="text-2xl font-bold text-cozy-text">{getDueMedicines().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-cozy-text-muted">Today's Doses</p>
                  <p className="text-2xl font-bold text-cozy-text">{getTodaysDoses().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => setShowAddChild(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Child
          </Button>
          <Button onClick={() => setShowAddMedicine(true)} variant="outline" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Add Medicine
          </Button>
          <Button onClick={() => setShowDoseModal(true)} variant="outline" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Record Dose
          </Button>
          <Button onClick={() => setShowReportModal(true)} variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {/* Due Medicines Alert */}
        {getDueMedicines().length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <div>
                  <h3 className="font-semibold text-orange-800">Medicines Due</h3>
                  <p className="text-orange-700">
                    {getDueMedicines().length} medicine(s) are due for administration
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Children and Medicines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Children */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5" />
                Children
              </CardTitle>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <div className="text-center py-8 text-cozy-text-muted">
                  <Baby className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No children added yet</p>
                  <Button 
                    onClick={() => setShowAddChild(true)} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Add First Child
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {children.map(child => (
                    <div key={child.id} className="flex items-center justify-between p-4 border border-cozy-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-cozy-text">{child.name}</h3>
                        <p className="text-sm text-cozy-text-muted">
                          {getChildAge(child.dateOfBirth)} • Born {format(new Date(child.dateOfBirth), 'MMM dd, yyyy')}
                        </p>
                        {child.notes && (
                          <p className="text-sm text-cozy-text-muted mt-1">{child.notes}</p>
                        )}
                      </div>
                      <Badge variant={child.isActive ? "default" : "secondary"}>
                        {child.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Medicines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Active Medicines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medicines.filter(m => m.isActive).length === 0 ? (
                <div className="text-center py-8 text-cozy-text-muted">
                  <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active medicines</p>
                  <Button 
                    onClick={() => setShowAddMedicine(true)} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Add First Medicine
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicines.filter(m => m.isActive).map(medicine => {
                    const child = children.find(c => c.id === medicine.childId)
                    const lastDose = doses
                      .filter(dose => dose.medicineId === medicine.id)
                      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())[0]
                    
                    const isDue = getDueMedicines().some(m => m.id === medicine.id)
                    const nextDoseInfo = getNextDoseInfo(medicine)
                    
                    return (
                      <div key={medicine.id} className={`p-4 border rounded-lg ${isDue ? 'border-orange-200 bg-orange-50' : 'border-cozy-gray-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-cozy-text">{medicine.name}</h3>
                            <p className="text-sm text-cozy-text-muted">
                              {child?.name} • {medicine.dosage} • {medicine.frequency}
                            </p>
                            {medicine.description && (
                              <p className="text-sm text-cozy-text-muted mt-1">{medicine.description}</p>
                            )}
                            {lastDose && (
                              <p className="text-xs text-cozy-text-muted mt-1">
                                Last dose: {format(new Date(lastDose.takenAt), 'MMM dd, HH:mm')}
                              </p>
                            )}
                            <div className="mt-2">
                              {nextDoseInfo.timeUntilNext !== null ? (
                                <p className={`text-xs font-medium ${nextDoseInfo.isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                                  {nextDoseInfo.isOverdue ? 'Overdue' : 'Next dose in'} {nextDoseInfo.timeUntilNext > 0 ? formatTimeUntilNext(nextDoseInfo.timeUntilNext) : 'now'}
                                </p>
                              ) : (
                                <p className="text-xs text-cozy-text-muted">
                                  Next dose: {format(nextDoseInfo.nextDoseTime, 'MMM dd, HH:mm')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDue && (
                              <Badge variant="destructive">Due</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNewDose({
                                  ...newDose,
                                  childId: medicine.childId,
                                  medicineId: medicine.id,
                                  dosage: medicine.dosage,
                                  takenAt: new Date().toISOString().slice(0, 16)
                                })
                                setShowDoseModal(true)
                              }}
                              className="text-xs"
                            >
                              Record Dose
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Doses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Doses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {doses.length === 0 ? (
              <div className="text-center py-8 text-cozy-text-muted">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No doses recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {doses
                  .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
                  .slice(0, 10)
                  .map(dose => {
                    const medicine = medicines.find(m => m.id === dose.medicineId)
                    const child = children.find(c => c.id === dose.childId)
                    
                    return (
                      <div key={dose.id} className="flex items-center justify-between p-4 border border-cozy-gray-200 rounded-lg">
                        <div>
                          <h3 className="font-semibold text-cozy-text">{medicine?.name}</h3>
                          <p className="text-sm text-cozy-text-muted">
                            {child?.name} • {dose.dosage} • {format(new Date(dose.takenAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                          {dose.notes && (
                            <p className="text-sm text-cozy-text-muted mt-1">{dose.notes}</p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {isToday(new Date(dose.takenAt)) ? 'Today' : 
                           isTomorrow(new Date(dose.takenAt)) ? 'Tomorrow' : 
                           format(new Date(dose.takenAt), 'MMM dd')}
                        </Badge>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Child Modal */}
      {showAddChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Child</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Child's name"
                value={newChild.name}
                onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Date of birth"
                value={newChild.dateOfBirth}
                onChange={(e) => setNewChild({ ...newChild, dateOfBirth: e.target.value })}
              />
              <Input
                placeholder="Notes (optional)"
                value={newChild.notes}
                onChange={(e) => setNewChild({ ...newChild, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={addChild} disabled={loading} className="flex-1">
                  Add Child
                </Button>
                <Button onClick={() => setShowAddChild(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Medicine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="w-full p-2 border border-cozy-gray-300 rounded-md"
                value={newMedicine.childId}
                onChange={(e) => setNewMedicine({ ...newMedicine, childId: e.target.value })}
              >
                <option value="">Select child</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
              <Input
                placeholder="Medicine name"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
              />
              <Input
                placeholder="Description (optional)"
                value={newMedicine.description}
                onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
              />
              <Input
                placeholder="Dosage (e.g., 5ml, 1 tablet)"
                value={newMedicine.dosage}
                onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })}
              />
              <select
                className="w-full p-2 border border-cozy-gray-300 rounded-md"
                value={newMedicine.frequency}
                onChange={(e) => setNewMedicine({ ...newMedicine, frequency: e.target.value })}
              >
                <option value="">Select frequency</option>
                <option value="every 2 hours">Every 2 hours</option>
                <option value="every 4 hours">Every 4 hours</option>
                <option value="every 6 hours">Every 6 hours</option>
                <option value="every 8 hours">Every 8 hours</option>
                <option value="every 12 hours">Every 12 hours</option>
                <option value="twice daily">Twice daily</option>
                <option value="once daily">Once daily</option>
                <option value="as needed">As needed</option>
              </select>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Treatment Start Date *
                </label>
                <Input
                  type="date"
                  value={newMedicine.startDate}
                  onChange={(e) => setNewMedicine({ ...newMedicine, startDate: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  Treatment End Date (optional)
                </label>
                <Input
                  type="date"
                  value={newMedicine.endDate}
                  onChange={(e) => setNewMedicine({ ...newMedicine, endDate: e.target.value })}
                  className="w-full"
                />
                <p className="text-xs text-cozy-text-muted mt-1">
                  Leave empty for ongoing treatment
                </p>
              </div>
              <Input
                placeholder="Notes (optional)"
                value={newMedicine.notes}
                onChange={(e) => setNewMedicine({ ...newMedicine, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={addMedicine} disabled={loading} className="flex-1">
                  Add Medicine
                </Button>
                <Button onClick={() => setShowAddMedicine(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Dose Modal */}
      {showDoseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Record Dose</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="w-full p-2 border border-cozy-gray-300 rounded-md"
                value={newDose.medicineId}
                onChange={(e) => setNewDose({ ...newDose, medicineId: e.target.value })}
              >
                <option value="">Select medicine</option>
                {medicines.filter(m => m.isActive).map(medicine => {
                  const child = children.find(c => c.id === medicine.childId)
                  return (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} - {child?.name}
                    </option>
                  )
                })}
              </select>
              <Input
                placeholder="Dosage taken"
                value={newDose.dosage}
                onChange={(e) => setNewDose({ ...newDose, dosage: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium text-cozy-text mb-1">
                  When was this dose taken?
                </label>
                <Input
                  type="datetime-local"
                  value={newDose.takenAt}
                  onChange={(e) => setNewDose({ ...newDose, takenAt: e.target.value })}
                  className="w-full"
                />
              </div>
              <Input
                placeholder="Notes (optional)"
                value={newDose.notes}
                onChange={(e) => setNewDose({ ...newDose, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={recordDose} disabled={loading} className="flex-1">
                  Record Dose
                </Button>
                <Button onClick={() => setShowDoseModal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fever Journal Section */}
      {householdId && (
        <FeverJournal householdId={householdId} children={children} />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="date"
                placeholder="Start date"
                value={reportDates.startDate}
                onChange={(e) => setReportDates({ ...reportDates, startDate: e.target.value })}
              />
              <Input
                type="date"
                placeholder="End date"
                value={reportDates.endDate}
                onChange={(e) => setReportDates({ ...reportDates, endDate: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={generateReport} disabled={loading} className="flex-1">
                  Generate Report
                </Button>
                <Button onClick={() => setShowReportModal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ModernAppShell>
  )
}
