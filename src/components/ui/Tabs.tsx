import React from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
}

export default function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'default',
  size = 'md'
}: TabsProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const getVariantClasses = (isActive: boolean) => {
    switch (variant) {
      case 'pills':
        return isActive
          ? 'bg-cozy-primary text-white shadow-cozy-sm'
          : 'bg-cozy-surface text-cozy-text hover:bg-cozy-cream border border-cozy-gray-300'
      case 'underline':
        return isActive
          ? 'text-cozy-primary border-b-2 border-cozy-primary'
          : 'text-cozy-text-muted hover:text-cozy-text border-b-2 border-transparent'
      default:
        return isActive
          ? 'bg-cozy-primary text-white shadow-cozy-sm'
          : 'bg-cozy-surface text-cozy-text hover:bg-cozy-cream border border-cozy-gray-300'
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div className={cn(
        'flex',
        variant === 'underline' ? 'border-b border-cozy-gray-200' : 'rounded-xl border border-cozy-gray-300 overflow-hidden'
      )}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                'flex items-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cozy-primary focus:ring-offset-2',
                sizeClasses[size],
                getVariantClasses(isActive),
                tab.disabled && 'opacity-50 cursor-not-allowed',
                variant === 'default' && index !== tabs.length - 1 && 'border-r border-cozy-gray-300',
                variant === 'pills' && 'rounded-lg mx-1 my-1'
              )}
              aria-pressed={isActive}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={cn(
                  'px-1.5 py-0.5 text-xs rounded-full',
                  isActive ? 'bg-white/20 text-white' : 'bg-cozy-primary text-white'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface TabPanelProps {
  children: React.ReactNode
  className?: string
}

export function TabPanel({ children, className = '' }: TabPanelProps) {
  return (
    <div className={cn('mt-6', className)}>
      {children}
    </div>
  )
}
