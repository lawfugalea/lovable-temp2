import React, { useState } from 'react'

interface FunButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'celebration' | 'wiggle'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  emoji?: string
  celebration?: boolean
  className?: string
  type?: 'button' | 'submit'
}

export default function FunButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  emoji,
  celebration = false,
  className = '',
  type = 'button'
}: FunButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const handleClick = () => {
    if (disabled) return
    
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 150)
    
    if (celebration) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 600)
    }
    
    onClick?.()
  }

  const baseClasses = "font-medium transition-all duration-200 relative overflow-hidden"
  
  const variantClasses = {
    primary: "cozy-btn-primary",
    secondary: "cozy-btn-secondary", 
    celebration: "cozy-btn-primary animate-cozy-glow",
    wiggle: "cozy-btn-secondary hover:animate-cozy-wiggle"
  }

  const sizeClasses = {
    sm: "px-3 py-2 text-sm rounded-lg",
    md: "px-4 py-3 text-sm rounded-cozy",
    lg: "px-6 py-4 text-base rounded-cozy-lg"
  }

  const pressedClass = isPressed ? "cozy-btn-press" : ""
  const celebrationClass = showCelebration ? "cozy-celebrate" : ""

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${pressedClass} ${celebrationClass} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="flex items-center gap-2">
        {emoji && (
          <span className="cozy-emoji text-lg">
            {emoji}
          </span>
        )}
        {children}
      </span>
    </button>
  )
}

export function FunIconButton({
  icon,
  onClick,
  className = '',
  size = 'md',
  ...props
}: {
  icon: string
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  }

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-cozy bg-cozy-surface border border-cozy-gray-200 hover:bg-cozy-cream hover:border-cozy-primary-soft transition-all duration-200 hover:animate-cozy-wiggle cozy-emoji ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}