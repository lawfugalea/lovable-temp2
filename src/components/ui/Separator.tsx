import React from 'react'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({ orientation = 'horizontal', className = '' }: SeparatorProps) {
  if (orientation === 'vertical') {
    return <div className={`w-px bg-gray-300 ${className}`} />
  }
  
  return <div className={`h-px bg-gray-300 ${className}`} />
}
