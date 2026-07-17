import React from 'react'

interface FunLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  type?: 'dance' | 'float' | 'wiggle' | 'bounce'
}

export default function FunLoading({ 
  message = "Getting things cozy...", 
  size = 'md',
  type = 'dance' 
}: FunLoadingProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl', 
    lg: 'text-6xl'
  }

  const animationClasses = {
    dance: 'animate-cozy-loading-dance',
    float: 'animate-cozy-float',
    wiggle: 'animate-cozy-wiggle', 
    bounce: 'animate-cozy-bounce-in'
  }

  const loadingEmojis = ['🏠', '🫖', '✨', '🌸', '🎀', '🧸', '🍯', '🌺']
  const randomEmoji = loadingEmojis[message.length % loadingEmojis.length]

  return (
    <div className="min-h-[50vh] grid place-items-center text-center p-6">
      <div className="cozy-card p-8 max-w-sm">
        <div className={`${sizeClasses[size]} ${animationClasses[type]} mb-4 inline-block`}>
          {randomEmoji}
        </div>
        <div className="text-cozy-text font-medium mb-2">
          {message}
        </div>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-cozy-primary rounded-full animate-cozy-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function FunLoadingInline({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 text-cozy-text-muted">
      <div className="text-lg animate-cozy-loading-dance">🌸</div>
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function FunLoadingSkeleton() {
  return (
    <div className="cozy-card p-6 animate-cozy-bounce-in">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-cozy bg-cozy-gray-200 animate-cozy-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-cozy-gray-200 rounded-cozy animate-cozy-pulse" />
          <div className="h-3 bg-cozy-gray-200 rounded-cozy w-2/3 animate-cozy-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-cozy-gray-200 rounded-cozy animate-cozy-pulse" />
        <div className="h-3 bg-cozy-gray-200 rounded-cozy w-4/5 animate-cozy-pulse" />
        <div className="h-3 bg-cozy-gray-200 rounded-cozy w-3/5 animate-cozy-pulse" />
      </div>
    </div>
  )
}
