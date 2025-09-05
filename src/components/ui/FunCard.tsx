import React, { useState } from 'react'

interface FunCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  bounce?: boolean
  float?: boolean
  onClick?: () => void
}

export default function FunCard({
  children,
  className = '',
  hover = true,
  glow = false,
  bounce = false,
  float = false,
  onClick
}: FunCardProps) {
  const [isClicked, setIsClicked] = useState(false)

  const handleClick = () => {
    if (!onClick) return
    
    setIsClicked(true)
    setTimeout(() => setIsClicked(false), 200)
    onClick()
  }

  const baseClasses = "cozy-card transition-all duration-300"
  const hoverClasses = hover ? "hover:shadow-cozy-lg hover:scale-105" : ""
  const glowClasses = glow ? "animate-cozy-glow" : ""
  const bounceClasses = bounce ? "animate-cozy-bounce-in" : ""
  const floatClasses = float ? "animate-cozy-float" : ""
  const clickedClasses = isClicked ? "scale-95" : ""
  const cursorClasses = onClick ? "cursor-pointer" : ""

  return (
    <div
      onClick={handleClick}
      className={`${baseClasses} ${hoverClasses} ${glowClasses} ${bounceClasses} ${floatClasses} ${clickedClasses} ${cursorClasses} ${className}`}
    >
      {children}
    </div>
  )
}

export function FunStatsCard({
  icon,
  label,
  value,
  trend,
  color = 'primary'
}: {
  icon: string
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  color?: 'primary' | 'sage' | 'terracotta'
}) {
  const colorClasses = {
    primary: 'bg-cozy-primary-soft border-cozy-primary/30',
    sage: 'bg-cozy-sage-soft border-cozy-sage/30',
    terracotta: 'bg-cozy-terracotta/20 border-cozy-terracotta/30'
  }

  const trendEmojis = {
    up: '📈',
    down: '📉',
    neutral: '➡️'
  }

  return (
    <FunCard hover bounce className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`h-12 w-12 rounded-cozy ${colorClasses[color]} grid place-items-center text-2xl border cozy-emoji`}>
          {icon}
        </div>
        {trend && (
          <div className="text-xl animate-cozy-pulse-gentle">
            {trendEmojis[trend]}
          </div>
        )}
      </div>
      
      <div className="text-2xl font-bold text-cozy-text mb-1">
        {value}
      </div>
      
      <div className="text-sm text-cozy-text-muted">
        {label}
      </div>
    </FunCard>
  )
}