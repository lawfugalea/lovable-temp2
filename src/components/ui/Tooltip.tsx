import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement>
}

const TooltipContext = createContext<TooltipContextType | null>(null)

const useTooltip = () => {
  const context = useContext(TooltipContext)
  if (!context) {
    throw new Error('useTooltip must be used within a Tooltip')
  }
  return context
}

interface TooltipProps {
  children: React.ReactNode
  delay?: number
}

export function Tooltip({ children, delay = 500 }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

interface TooltipTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

export function TooltipTrigger({ asChild, children }: TooltipTriggerProps) {
  const { triggerRef } = useTooltip()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
    } as any)
  }

  return <span ref={triggerRef}>{children}</span>
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
}

export function TooltipContent({ children, className = '' }: TooltipContentProps) {
  const { isOpen, triggerRef } = useTooltip()
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX + rect.width / 2,
      })
    }
  }, [isOpen, triggerRef])

  if (!isOpen) return null

  return createPortal(
    <div
      className={`absolute z-50 rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg ${className}`}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
    >
      {children}
      <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
    </div>,
    document.body
  )
}

interface TooltipProviderProps {
  children: React.ReactNode
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}
