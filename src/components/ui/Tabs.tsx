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
  const [isDragging, setIsDragging] = useState(false)
  const [scrollStart, setScrollStart] = useState<number | null>(null)

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  // Minimum distance for a swipe gesture
  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    setTouchStart(touch.clientX)
    setTouchEnd(null)
    setIsDragging(false)
    
    // Store initial scroll position
    if (containerRef.current) {
      setScrollStart(containerRef.current.scrollLeft)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    setTouchEnd(touch.clientX)
    
    // Determine if this is a horizontal drag for scrolling tabs
    if (touchStart !== null && containerRef.current) {
      const deltaX = Math.abs(touch.clientX - touchStart)
      const deltaY = Math.abs(touch.clientY - (e.targetTouches[0].clientY))
      
      // If horizontal movement is greater than vertical, allow scrolling
      if (deltaX > deltaY && deltaX > 10) {
        setIsDragging(true)
        e.preventDefault() // Prevent default scrolling behavior
        
        // Manual scroll implementation
        const scrollDelta = touchStart - touch.clientX
        const newScrollLeft = (scrollStart || 0) + scrollDelta
        containerRef.current.scrollLeft = newScrollLeft
      }
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !isDragging) {
      setIsDragging(false)
      setTouchStart(null)
      setTouchEnd(null)
      setScrollStart(null)
      return
    }
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    // Only change tabs if it's a clear swipe gesture and not just scrolling
    if ((isLeftSwipe || isRightSwipe) && Math.abs(distance) > minSwipeDistance) {
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
    
    setIsDragging(false)
    setTouchStart(null)
    setTouchEnd(null)
    setScrollStart(null)
  }

  // Auto-scroll to active tab
  useEffect(() => {
    if (containerRef.current && !isDragging) {
      const activeTabElement = containerRef.current.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        })
      }
    }
  }, [activeTab, isDragging])

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
          // Enhanced mobile scrolling
          'touch-pan-x', // Enable horizontal panning
          'overscroll-x-contain', // Prevent overscroll
          'scroll-smooth', // Smooth scrolling
          // Better touch targets
          'min-h-[44px]', // Minimum touch target height
          variant === 'underline' ? 'border-b border-cozy-gray-200' : 'rounded-xl border border-cozy-gray-300 overflow-hidden'
        )}
        style={{
          WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
          scrollBehavior: 'smooth'
        }}
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
                // Enhanced mobile optimizations
                'touch-manipulation', // Better touch response
                'min-h-[44px]', // Minimum touch target size
                'min-w-[44px]', // Minimum touch target width
                'px-3 py-2', // Better touch padding
                'text-sm', // Consistent text size
                'active:scale-95', // Touch feedback
                'select-none', // Prevent text selection on touch
                // Ensure tabs don't shrink too much
                'whitespace-nowrap'
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
