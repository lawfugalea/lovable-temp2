import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import Tabs, { TabPanel } from '../components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Home, Activity, Zap } from 'lucide-react'

export default function DashboardTest() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: Home,
      badge: 5
    },
    { 
      id: 'activity', 
      label: 'Recent Activity', 
      icon: Activity,
      badge: 3
    },
    { 
      id: 'quick-actions', 
      label: 'Quick Actions', 
      icon: Zap
    }
  ]

  return (
    <ModernAppShell title="Dashboard Test">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard Test Page</h1>
        
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
            <Card>
              <CardHeader>
                <CardTitle>Overview Tab</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the overview tab content.</p>
                <p>Welcome, {session?.user?.name || 'User'}!</p>
              </CardContent>
            </Card>
          </TabPanel>
        )}

        {activeTab === 'activity' && (
          <TabPanel>
            <Card>
              <CardHeader>
                <CardTitle>Activity Tab</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the activity tab content.</p>
              </CardContent>
            </Card>
          </TabPanel>
        )}

        {activeTab === 'quick-actions' && (
          <TabPanel>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions Tab</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the quick actions tab content.</p>
              </CardContent>
            </Card>
          </TabPanel>
        )}
      </div>
    </ModernAppShell>
  )
}
