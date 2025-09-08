import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { 
  Home, 
  ShoppingCart, 
  DollarSign, 
  Settings, 
  Users,
  Search,
  Bell,
  Menu,
  X,
  Command,
  Pill
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import CommandPalette from './CommandPalette'
import MedicineNotifications from './MedicineNotifications'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Shopping', href: '/shopping', icon: ShoppingCart },
  { name: 'Finances', href: '/finances', icon: DollarSign },
  { name: 'Medicine', href: '/medicine', icon: Pill },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Household', href: '/household', icon: Users },
]

interface ModernAppShellProps {
  children: React.ReactNode
  title?: string
}

export default function ModernAppShell({ children, title }: ModernAppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  const currentPath = router.pathname

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-cozy-bg lg:flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-cozy-surface border-r border-cozy-gray-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto",
          "lg:flex lg:flex-col lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-6 border-b border-cozy-gray-200">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-cozy-primary rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-cozy-text">Houseflow</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = currentPath === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cozy-primary text-white shadow-cozy-sm"
                    : "text-cozy-text-muted hover:text-cozy-text hover:bg-cozy-cream"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-cozy-gray-200">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-cozy-cream">
            <div className="w-8 h-8 bg-cozy-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cozy-text truncate">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-cozy-text-muted truncate">
                {session?.user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 lg:flex lg:flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-cozy-surface/80 backdrop-blur-xl border-b border-cozy-gray-200 w-full">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 max-w-full">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              {title && (
                <h1 className="text-xl font-semibold text-cozy-text">
                  {title}
                </h1>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Search...
                <kbd className="ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-cozy-cream px-1.5 font-mono text-[10px] font-medium text-cozy-text-muted opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 pt-2 pb-6 sm:px-6 max-w-full overflow-x-hidden lg:flex-1">
          <div className="animate-cozy-fade-in w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />

      {/* Medicine Notifications */}
      <MedicineNotifications />
    </div>
  )
}
