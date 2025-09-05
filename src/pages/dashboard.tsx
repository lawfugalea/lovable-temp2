import React, { useEffect, useState } from 'react'
import FunLoading from '../components/ui/FunLoading'
import FunButton from '../components/ui/FunButton'
import FunCard, { FunStatsCard } from '../components/ui/FunCard'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    activeItems: 12,
    completedItems: 8,
    monthlyIncome: 3200,
    monthlySavings: 640
  })

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000)
  }, [])

  if (isLoading) {
    return <FunLoading message="Setting up your cozy home..." type="dance" />
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="text-center animate-cozy-bounce-in">
        <h1 className="text-3xl font-bold text-cozy-text mb-2 flex items-center justify-center gap-3">
          <span className="animate-cozy-wiggle">🏠</span>
          Welcome home!
          <span className="animate-cozy-pulse-gentle">✨</span>
        </h1>
        <p className="text-cozy-text-muted">Here's what's happening in your cozy household</p>
      </div>

      {/* Fun stats overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <FunStatsCard
          icon="🛒"
          label="Items to buy"
          value={stats.activeItems}
          trend={stats.activeItems > 0 ? 'up' : 'neutral'}
          color="sage"
        />
        <FunStatsCard
          icon="✅"
          label="Items done"
          value={stats.completedItems}
          trend={stats.completedItems > stats.activeItems ? 'up' : 'neutral'}
          color="primary"
        />
        <FunStatsCard
          icon="💰"
          label="Monthly income"
          value={`€${stats.monthlyIncome}`}
          trend="up"
          color="terracotta"
        />
        <FunStatsCard
          icon="🏦"
          label="Savings this month"
          value={`€${stats.monthlySavings}`}
          trend="up"
          color="primary"
        />
      </div>

      {/* Main action cards */}
      <div className="grid gap-5 md:grid-cols-2">
        <FunCard hover bounce className="p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-cozy bg-cozy-sage-soft grid place-items-center text-2xl border border-cozy-sage/30 cozy-emoji">
                🧺
              </div>
              <div>
                <div className="font-bold text-cozy-text text-lg">Shopping Adventure</div>
                <div className="text-sm text-cozy-text-muted">
                  {stats.activeItems} cozy items await you! 🛍️
                </div>
              </div>
            </div>
            <Link to="/shopping" className="animate-cozy-bounce-in">
              <FunButton variant="primary" size="sm" emoji="✨">
                Add Item
              </FunButton>
            </Link>
          </div>
          <Link to="/shopping">
            <FunButton variant="secondary" className="w-full group-hover:animate-cozy-wiggle" emoji="🛒">
              <span>Quick Shopping</span>
              <span className="text-cozy-primary ml-2 transition-transform group-hover:translate-x-1">→</span>
            </FunButton>
          </Link>
        </FunCard>

        <FunCard hover bounce className="p-6 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-cozy bg-cozy-primary-soft grid place-items-center text-2xl border border-cozy-primary/30 cozy-emoji animate-cozy-glow">
                💎
              </div>
              <div>
                <div className="font-bold text-cozy-text text-lg">Financial Wellness</div>
                <div className="text-sm text-cozy-text-muted">€{stats.monthlyIncome} earned • €{stats.monthlySavings} saved with love 💝</div>
              </div>
            </div>
            <Link to="/finances" className="animate-cozy-bounce-in animation-delay-200">
              <FunButton variant="primary" size="sm" emoji="📊">
                Manage
              </FunButton>
            </Link>
          </div>
          <Link to="/finances">
            <FunButton variant="secondary" className="w-full group-hover:animate-cozy-wiggle" emoji="💰">
              <span>View Budget Magic</span>
              <span className="text-cozy-primary ml-2 transition-transform group-hover:translate-x-1">→</span>
            </FunButton>
          </Link>
        </FunCard>
      </div>

      {/* Household Timeline */}
      <div className="animate-cozy-bounce-in animation-delay-400">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-cozy-text mb-2 flex items-center gap-2">
            <span className="animate-cozy-pulse-gentle">🌟</span>
            Household Timeline
          </h2>
          <p className="text-cozy-text-muted">Recent cozy moments and memories.</p>
        </div>
        
        <FunCard className="p-0">
          <ul className="divide-y divide-cozy-gray-200">
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
              <li key={i} className="px-6 py-4 hover:bg-cozy-cream/50 transition-all duration-300 group animate-cozy-bounce-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-cozy bg-${row.color} grid place-items-center mr-4 shadow-cozy-sm border border-cozy-gray-200 cozy-emoji group-hover:animate-cozy-wiggle`}>
                    {row.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-cozy-text font-medium truncate">{row.title}</div>
                    <div className="text-xs text-cozy-text-muted">{row.meta}</div>
                  </div>
                  <div className="text-lg animate-cozy-pulse-gentle">
                    {row.celebration}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {/* Cute footer */}
          <div className="px-6 py-4 bg-cozy-warm border-t border-cozy-gray-200 text-center">
            <div className="text-sm text-cozy-text-muted flex items-center justify-center gap-2">
              <span className="animate-cozy-pulse-gentle">💫</span>
              <span>Your household is thriving with love!</span>  
              <span className="animate-cozy-pulse-gentle animation-delay-500">💝</span>
            </div>
          </div>
        </FunCard>
      </div>
    </div>
  )
}