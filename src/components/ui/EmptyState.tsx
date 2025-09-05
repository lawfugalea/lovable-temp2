import React from 'react'
import FunButton from './FunButton'

interface EmptyStateProps {
  title: string
  description: string
  emoji?: string
  actionLabel?: string
  onAction?: () => void
  illustration?: 'shopping' | 'finances' | 'general' | 'celebration'
}

export default function EmptyState({
  title,
  description,
  emoji = '🌸',
  actionLabel,
  onAction,
  illustration = 'general'
}: EmptyStateProps) {
  const illustrations = {
    shopping: (
      <div className="relative">
        <div className="text-6xl animate-cozy-float">{emoji}</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-cozy-bounce-in animation-delay-300">✨</div>
        <div className="absolute -bottom-1 -left-2 text-xl animate-cozy-wiggle animation-delay-500">🛒</div>
      </div>
    ),
    finances: (
      <div className="relative">
        <div className="text-6xl animate-cozy-glow">{emoji}</div>
        <div className="absolute -top-3 -right-1 text-2xl animate-cozy-float animation-delay-200">💫</div>
        <div className="absolute -bottom-2 -left-3 text-xl animate-cozy-bounce-in animation-delay-400">📊</div>
      </div>
    ),
    celebration: (
      <div className="relative">
        <div className="text-6xl animate-cozy-bounce-in">{emoji}</div>
        <div className="absolute -top-4 -right-2 text-2xl animate-cozy-confetti animation-delay-100">🎉</div>
        <div className="absolute -top-2 -left-4 text-xl animate-cozy-confetti animation-delay-300">🎊</div>
        <div className="absolute -bottom-3 right-0 text-lg animate-cozy-confetti animation-delay-500">✨</div>
      </div>
    ),
    general: (
      <div className="relative">
        <div className="text-6xl animate-cozy-float">{emoji}</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-cozy-pulse-gentle animation-delay-200">💝</div>
      </div>
    )
  }

  return (
    <div className="cozy-card p-12 text-center animate-cozy-bounce-in">
      <div className="mb-6 flex justify-center">
        {illustrations[illustration]}
      </div>
      
      <h3 className="text-xl font-bold text-cozy-text mb-3">
        {title}
      </h3>
      
      <p className="text-cozy-text-muted mb-6 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <FunButton
          onClick={onAction}
          variant="primary"
          emoji="✨"
          celebration
        >
          {actionLabel}
        </FunButton>
      )}
      
      <div className="mt-8 flex justify-center gap-4">
        <div className="w-2 h-2 bg-cozy-primary-soft rounded-full animate-cozy-bounce animation-delay-100"></div>
        <div className="w-2 h-2 bg-cozy-sage-soft rounded-full animate-cozy-bounce animation-delay-200"></div>
        <div className="w-2 h-2 bg-cozy-cream rounded-full animate-cozy-bounce animation-delay-300"></div>
      </div>
    </div>
  )
}