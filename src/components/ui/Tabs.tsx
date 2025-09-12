import React, { useRef, useState, useEffect } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  // Minimum distance for a swipe gesture
  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsScrolling(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
    // Check if user is scrolling vertically (not swiping horizontally)
    const touchY = e.targetTouches[0].clientY
    const touchX = e.targetTouches[0].clientX
    if (touchStart && Math.abs(touchY - touchStart) > Math.abs(touchX - touchStart)) {
      setIsScrolling(true)
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || isScrolling) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
      let newIndex = currentIndex

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        newIndex = currentIndex + 1
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right - go to previous tab
        newIndex = currentIndex - 1
      }

      if (newIndex !== currentIndex && !tabs[newIndex]?.disabled) {
        onTabChange(tabs[newIndex].id)
      }
    }
  }

  // Auto-scroll to active tab
  useEffect(() => {
    if (containerRef.current) {
      const activeTabElement = containerRef.current.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        })
      }
    }
  }, [activeTab])

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
      <div 
        ref={containerRef}
        className={cn(
          'flex overflow-x-auto scrollbar-hide',
          variant === 'underline' ? 'border-b border-cozy-gray-200' : 'rounded-xl border border-cozy-gray-300 overflow-hidden'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                'flex items-center gap-1.5 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cozy-primary focus:ring-offset-2 flex-shrink-0 min-w-0',
                sizeClasses[size],
                getVariantClasses(isActive),
                tab.disabled && 'opacity-50 cursor-not-allowed',
                variant === 'default' && index !== tabs.length - 1 && 'border-r border-cozy-gray-300',
                variant === 'pills' && 'rounded-lg mx-0.5 my-1',
                // Mobile optimizations
                'touch-manipulation', // Better touch response
                'min-h-[44px]', // Minimum touch target size
                'px-2 sm:px-3', // Responsive padding
                'text-xs sm:text-sm' // Responsive text size
              )}
              aria-pressed={isActive}
            >
              {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span className={cn(
                  'px-1 py-0.5 text-xs rounded-full flex-shrink-0',
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
  isActive?: boolean
}

export function TabPanel({ children, className = '', isActive = true }: TabPanelProps) {
  if (!isActive) return null
  
  return (
    <div className={cn('mt-6', className)}>
      {children}
    </div>
  )
}
