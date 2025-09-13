import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface MobileOptimizedLayoutProps {
  children: React.ReactNode
  className?: string
}

export default function MobileOptimizedLayout({ children, className = '' }: MobileOptimizedLayoutProps) {
  const [viewportHeight, setViewportHeight] = useState('100vh')
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Handle viewport height changes (keyboard, orientation, etc.)
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      setViewportHeight(`${window.innerHeight}px`)
      
      // Detect if keyboard is open (rough estimation)
      const initialHeight = window.screen.height
      const currentHeight = window.innerHeight
      const heightDifference = initialHeight - currentHeight
      
      // If height difference is significant, keyboard is likely open
      setIsKeyboardOpen(heightDifference > 150)
    }

    // Initial setup
    updateViewportHeight()

    // Listen for resize events
    window.addEventListener('resize', updateViewportHeight)
    window.addEventListener('orientationchange', updateViewportHeight)

    // Listen for visual viewport changes (better keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight)
    }

    // Handle focus events to detect keyboard
    const handleFocusIn = () => {
      setTimeout(updateViewportHeight, 300) // Delay to allow keyboard to open
    }

    const handleFocusOut = () => {
      setTimeout(updateViewportHeight, 300) // Delay to allow keyboard to close
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight)
      }
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  // Add CSS custom properties for safe areas
  useEffect(() => {
    const root = document.documentElement
    
    // Set CSS custom properties for safe areas
    const setSafeAreaInsets = () => {
      const computedStyle = getComputedStyle(root)
      const safeAreaTop = computedStyle.getPropertyValue('--safe-area-inset-top') || '0px'
      const safeAreaBottom = computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0px'
      const safeAreaLeft = computedStyle.getPropertyValue('--safe-area-inset-left') || '0px'
      const safeAreaRight = computedStyle.getPropertyValue('--safe-area-inset-right') || '0px'
      
      root.style.setProperty('--safe-area-inset-top', safeAreaTop)
      root.style.setProperty('--safe-area-inset-bottom', safeAreaBottom)
      root.style.setProperty('--safe-area-inset-left', safeAreaLeft)
      root.style.setProperty('--safe-area-inset-right', safeAreaRight)
    }

    setSafeAreaInsets()
    
    // Update on orientation change
    window.addEventListener('orientationchange', setSafeAreaInsets)
    
    return () => {
      window.removeEventListener('orientationchange', setSafeAreaInsets)
    }
  }, [])

  return (
    <div 
      className={`mobile-optimized-layout ${className}`}
      style={{
        minHeight: viewportHeight,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: isKeyboardOpen ? '0px' : 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {children}
    </div>
  )
}

// CSS-in-JS styles for mobile optimization
const mobileOptimizationStyles = `
  .mobile-optimized-layout {
    /* Prevent zoom on input focus */
    input, textarea, select {
      font-size: 16px !important;
    }
    
    /* Smooth scrolling */
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    
    /* Prevent pull-to-refresh */
    overscroll-behavior: contain;
    
    /* Better touch targets */
    button, a, input, textarea, select {
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Prevent text selection on UI elements */
    button, .no-select {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    /* Better focus indicators */
    button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    
    /* Prevent horizontal scroll */
    overflow-x: hidden;
    
    /* Better text rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  
  /* Mobile-specific adjustments */
  @media (max-width: 768px) {
    .mobile-optimized-layout {
      /* Reduce padding on mobile */
      padding-left: max(env(safe-area-inset-left), 1rem);
      padding-right: max(env(safe-area-inset-right), 1rem);
    }
    
    /* Better touch targets on mobile */
    button, a, input, textarea, select {
      min-height: 48px;
    }
    
    /* Prevent zoom on double tap */
    * {
      touch-action: manipulation;
    }
  }
  
  /* Landscape orientation adjustments */
  @media (orientation: landscape) and (max-height: 500px) {
    .mobile-optimized-layout {
      /* Reduce vertical padding in landscape */
      padding-top: max(env(safe-area-inset-top), 0.5rem);
      padding-bottom: max(env(safe-area-inset-bottom), 0.5rem);
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .mobile-optimized-layout {
      color-scheme: dark;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .mobile-optimized-layout * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = mobileOptimizationStyles
  document.head.appendChild(styleSheet)
}

