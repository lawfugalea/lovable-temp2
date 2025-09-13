import React, { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Download, X, Smartphone, Monitor, Share, Plus } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install prompt after a delay if not dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 5000) // Show after 5 seconds
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      localStorage.removeItem('pwa-install-dismissed')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show iOS instructions
      if (isIOS) {
        setShowIOSInstructions(true)
      }
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('Error showing install prompt:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setShowIOSInstructions(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed or in standalone mode
  if (isStandalone) {
    return null
  }

  return (
    <>
      {/* Install Prompt for Android/Desktop */}
      {showInstallPrompt && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">Install Houseflow</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Install our app for a better experience with offline access and faster loading.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstallClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Install
                  </Button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Install Houseflow</h3>
                <p className="text-sm text-gray-600">Add to your home screen</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">1</span>
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium">Tap the Share button</p>
                  <p className="text-xs text-gray-600">Look for the share icon in your browser's toolbar</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">2</span>
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium">Select "Add to Home Screen"</p>
                  <p className="text-xs text-gray-600">Scroll down and tap this option</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-blue-600">3</span>
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium">Tap "Add"</p>
                  <p className="text-xs text-gray-600">Confirm to install the app</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Install Button (for iOS when beforeinstallprompt is not available) */}
      {isIOS && !deferredPrompt && !isStandalone && !showInstallPrompt && (
        <button
          onClick={() => setShowIOSInstructions(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-all duration-200 hover:scale-105"
          title="Install app"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </>
  )
}

