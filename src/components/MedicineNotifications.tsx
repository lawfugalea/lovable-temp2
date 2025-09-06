import React, { useState, useEffect } from 'react'
import { useHouseholdId } from '@/lib/useHouseholdId'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  AlertTriangle, 
  Clock, 
  Pill, 
  Baby, 
  X,
  Bell
} from 'lucide-react'
import { format } from 'date-fns'

interface Medicine {
  id: string
  name: string
  dosage: string
  frequency: string
  child: {
    id: string
    name: string
  }
}

interface MedicineNotifications {
  dueNow: Medicine[]
  dueIn5Minutes: Medicine[]
  dueIn15Minutes: Medicine[]
}

export default function MedicineNotifications() {
  const { householdId, loading: householdLoading } = useHouseholdId()
  const [notifications, setNotifications] = useState<MedicineNotifications>({
    dueNow: [],
    dueIn5Minutes: [],
    dueIn15Minutes: []
  })
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    if (!householdId || householdLoading) return
    
    // Ensure householdId is a string
    const householdIdStr = typeof householdId === 'string' ? householdId : String(householdId)
    if (!householdIdStr || householdIdStr === 'undefined' || householdIdStr === 'null') return

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/medicine/notifications?householdId=${encodeURIComponent(householdIdStr)}`)
        if (response.ok) {
          const data = await response.json()
          setNotifications(data)
          
          // Show notifications if there are any
          const hasNotifications = data.dueNow.length > 0 || 
                                 data.dueIn5Minutes.length > 0 || 
                                 data.dueIn15Minutes.length > 0
          setIsVisible(hasNotifications)
        }
      } catch (error) {
        console.error('Failed to fetch medicine notifications:', error)
      }
    }

    // Fetch immediately
    fetchNotifications()

    // Set up interval to check every minute
    const interval = setInterval(fetchNotifications, 60000)

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => clearInterval(interval)
  }, [householdId, householdLoading])

  // Show browser notifications
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const showBrowserNotification = (medicines: Medicine[], type: string) => {
      medicines.forEach(medicine => {
        const notificationId = `${medicine.id}-${type}`
        if (dismissed.includes(notificationId)) return

        const notification = new Notification('Medicine Reminder', {
          body: `${medicine.child.name} needs ${medicine.name} (${medicine.dosage})`,
          icon: '/logo.png',
          tag: notificationId
        })

        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      })
    }

    if (notifications.dueNow.length > 0) {
      showBrowserNotification(notifications.dueNow, 'due-now')
    }
    if (notifications.dueIn5Minutes.length > 0) {
      showBrowserNotification(notifications.dueIn5Minutes, 'due-5min')
    }
    if (notifications.dueIn15Minutes.length > 0) {
      showBrowserNotification(notifications.dueIn15Minutes, 'due-15min')
    }
  }, [notifications, dismissed])

  const dismissNotification = (medicineId: string, type: string) => {
    const notificationId = `${medicineId}-${type}`
    setDismissed(prev => [...prev, notificationId])
  }

  const dismissAll = () => {
    const allIds = [
      ...notifications.dueNow.map(m => `${m.id}-due-now`),
      ...notifications.dueIn5Minutes.map(m => `${m.id}-due-5min`),
      ...notifications.dueIn15Minutes.map(m => `${m.id}-due-15min`)
    ]
    setDismissed(prev => [...prev, ...allIds])
    setIsVisible(false)
  }

  if (!isVisible) return null

  const totalNotifications = notifications.dueNow.length + 
                           notifications.dueIn5Minutes.length + 
                           notifications.dueIn15Minutes.length

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50">
      <Card className="border-orange-200 bg-orange-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Medicine Reminders</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissAll}
              className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Due Now */}
            {notifications.dueNow.map(medicine => {
              const notificationId = `${medicine.id}-due-now`
              if (dismissed.includes(notificationId)) return null
              
              return (
                <div key={medicine.id} className="flex items-center justify-between p-3 bg-red-100 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">{medicine.name}</p>
                      <p className="text-sm text-red-600">
                        {medicine.child.name} • {medicine.dosage}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Due Now</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(medicine.id, 'due-now')}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {/* Due in 5 minutes */}
            {notifications.dueIn5Minutes.map(medicine => {
              const notificationId = `${medicine.id}-due-5min`
              if (dismissed.includes(notificationId)) return null
              
              return (
                <div key={medicine.id} className="flex items-center justify-between p-3 bg-orange-100 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">{medicine.name}</p>
                      <p className="text-sm text-orange-600">
                        {medicine.child.name} • {medicine.dosage}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-200 text-orange-800">5 min</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(medicine.id, 'due-5min')}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {/* Due in 15 minutes */}
            {notifications.dueIn15Minutes.map(medicine => {
              const notificationId = `${medicine.id}-due-15min`
              if (dismissed.includes(notificationId)) return null
              
              return (
                <div key={medicine.id} className="flex items-center justify-between p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Pill className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">{medicine.name}</p>
                      <p className="text-sm text-yellow-600">
                        {medicine.child.name} • {medicine.dosage}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">15 min</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(medicine.id, 'due-15min')}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalNotifications > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-orange-600 border-orange-300 hover:bg-orange-100"
                onClick={() => window.location.href = '/medicine'}
              >
                Go to Medicine Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
