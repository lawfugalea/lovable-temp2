import React, { useEffect, useState } from 'react'
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Users,
  Plus,
  ArrowRight,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

const stats = [
  {
    name: 'Shopping Items',
    value: '12',
    change: '+3 from last week',
    icon: ShoppingCart,
    color: 'text-cozy-sage',
    bgColor: 'bg-cozy-sage-soft',
    trend: 'up' as const,
  },
  {
    name: 'Monthly Budget',
    value: formatCurrency(3200),
    change: '+12% from last month',
    icon: DollarSign,
    color: 'text-cozy-primary',
    bgColor: 'bg-cozy-primary-soft',
    trend: 'up' as const,
  },
  {
    name: 'Savings',
    value: formatCurrency(640),
    change: '+8% from last month',
    icon: TrendingUp,
    color: 'text-cozy-terracotta',
    bgColor: 'bg-cozy-cream',
    trend: 'up' as const,
  },
  {
    name: 'Household Members',
    value: '2',
    change: 'Active members',
    icon: Users,
    color: 'text-cozy-sage',
    bgColor: 'bg-cozy-sage-soft',
    trend: 'neutral' as const,
  },
]

const recentActivity = [
  {
    id: 1,
    type: 'shopping',
    title: 'Added fresh milk to shopping list',
    time: '2 hours ago',
    icon: ShoppingCart,
    color: 'bg-cozy-sage-soft',
  },
  {
    id: 2,
    type: 'finance',
    title: 'Monthly rent payment processed',
    time: '1 day ago',
    icon: DollarSign,
    color: 'bg-cozy-primary-soft',
  },
  {
    id: 3,
    type: 'savings',
    title: 'Saved €200 for vacation fund',
    time: '3 days ago',
    icon: TrendingUp,
    color: 'bg-cozy-cream',
  },
]

const quickActions = [
  {
    title: 'Add Shopping Item',
    description: 'Quickly add items to your shopping list',
    href: '/shopping',
    icon: Plus,
    color: 'bg-cozy-sage hover:bg-cozy-sage/90',
  },
  {
    title: 'View Finances',
    description: 'Check your budget and expenses',
    href: '/finances',
    icon: DollarSign,
    color: 'bg-cozy-primary hover:bg-cozy-primary-deep',
  },
  {
    title: 'Manage Household',
    description: 'Invite members and manage settings',
    href: '/settings',
    icon: Users,
    color: 'bg-cozy-terracotta hover:bg-cozy-terracotta/90',
  },
]

export default function ModernDashboard() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cozy-text-muted">Setting up your cozy home...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-cozy-fade-in">
        <h1 className="text-3xl font-bold text-cozy-text mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-cozy-text-muted">
          Here's what's happening with your household today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={stat.name} className="animate-cozy-bounce-in" style={{ animationDelay: `${index * 100}ms` }}>
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
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 animate-cozy-bounce-in" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks to manage your household
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group block"
                >
                  <div className="p-4 rounded-lg border border-cozy-gray-200 hover:shadow-cozy-md transition-all duration-200 hover:-translate-y-1">
                    <div className={`inline-flex p-2 rounded-lg text-white ${action.color} mb-3`}>
                      <Icon className="w-5 h-5" />
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
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="animate-cozy-bounce-in" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest household updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activity.icon
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3"
                >
                  <div className={`p-2 ${activity.color} rounded-lg`}>
                    <Icon className="w-4 h-4 text-cozy-text" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cozy-text">
                      {activity.title}
                    </p>
                    <p className="text-xs text-cozy-text-muted">
                      {activity.time}
                    </p>
                  </div>
                </div>
              )
            })}
            <Button variant="outline" className="w-full mt-4">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Household Timeline */}
      <Card className="animate-cozy-bounce-in" style={{ animationDelay: '600ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="animate-cozy-pulse-gentle">🌟</span>
            Household Timeline
          </CardTitle>
          <CardDescription>
            Recent cozy moments and memories
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-cozy-gray-200">
            {[
              { 
                icon: '🥛', 
                title: 'Added fresh milk to shopping', 
                meta: 'Today, 2:30 PM', 
                color: 'cozy-sage-soft',
                celebration: '🌸'
              },
              { 
                icon: '🏠', 
                title: 'Paid monthly rent like a boss', 
                meta: 'Yesterday', 
                color: 'cozy-primary-soft',
                celebration: '✨'
              },
              { 
                icon: '💖', 
                title: 'Saved for family vacation dreams', 
                meta: '3 days ago', 
                color: 'cozy-cream',
                celebration: '🎉'
              },
              { 
                icon: '🧺', 
                title: 'Completed weekly grocery haul', 
                meta: '5 days ago', 
                color: 'cozy-sage-soft',
                celebration: '🎊'
              },
            ].map((row, i) => (
              <div key={i} className="px-6 py-4 hover:bg-cozy-cream/50 transition-all duration-300 group">
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-cozy bg-${row.color} grid place-items-center mr-4 shadow-cozy-sm border border-cozy-gray-200 group-hover:animate-cozy-wiggle`}>
                    <span className="text-xl">{row.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-cozy-text font-medium truncate">{row.title}</div>
                    <div className="text-xs text-cozy-text-muted">{row.meta}</div>
                  </div>
                  <div className="text-lg animate-cozy-pulse-gentle">
                    {row.celebration}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Cute footer */}
          <div className="px-6 py-4 bg-cozy-warm border-t border-cozy-gray-200 text-center">
            <div className="text-sm text-cozy-text-muted flex items-center justify-center gap-2">
              <span className="animate-cozy-pulse-gentle">💫</span>
              <span>Your household is thriving with love!</span>  
              <span className="animate-cozy-pulse-gentle">💝</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
