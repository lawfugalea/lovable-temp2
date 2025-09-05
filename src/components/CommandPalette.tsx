import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { 
  Search, 
  Home, 
  ShoppingCart, 
  DollarSign, 
  Settings, 
  Users,
  Plus,
  TrendingUp,
  Calendar,
  FileText,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Command,
  ArrowRight,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  category: string
  keywords: string[]
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'View your home dashboard',
      icon: Home,
      action: () => router.push('/dashboard'),
      category: 'Navigation',
      keywords: ['dashboard', 'home', 'main']
    },
    {
      id: 'nav-shopping',
      title: 'Go to Shopping',
      description: 'Manage your shopping lists',
      icon: ShoppingCart,
      action: () => router.push('/shopping'),
      category: 'Navigation',
      keywords: ['shopping', 'lists', 'groceries']
    },
    {
      id: 'nav-finances',
      title: 'Go to Finances',
      description: 'Track income and expenses',
      icon: DollarSign,
      action: () => router.push('/finances'),
      category: 'Navigation',
      keywords: ['finances', 'money', 'budget', 'expenses']
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      description: 'Manage your preferences',
      icon: Settings,
      action: () => router.push('/settings'),
      category: 'Navigation',
      keywords: ['settings', 'preferences', 'config']
    },
    {
      id: 'nav-household',
      title: 'Go to Household',
      description: 'Manage household members',
      icon: Users,
      action: () => router.push('/household'),
      category: 'Navigation',
      keywords: ['household', 'members', 'family']
    },

    // Quick Actions
    {
      id: 'add-shopping-item',
      title: 'Add Shopping Item',
      description: 'Add a new item to your shopping list',
      icon: Plus,
      action: () => {
        navigate('/shopping')
        // Could trigger add item modal here
      },
      category: 'Quick Actions',
      keywords: ['add', 'shopping', 'item', 'new']
    },
    {
      id: 'add-expense',
      title: 'Add Expense',
      description: 'Record a new expense',
      icon: TrendingUp,
      action: () => {
        router.push('/finances')
        // Could trigger add expense modal here
      },
      category: 'Quick Actions',
      keywords: ['add', 'expense', 'spending', 'cost']
    },
    {
      id: 'add-income',
      title: 'Add Income',
      description: 'Record a new income source',
      icon: DollarSign,
      action: () => {
        router.push('/finances')
        // Could trigger add income modal here
      },
      category: 'Quick Actions',
      keywords: ['add', 'income', 'salary', 'money']
    },

    // Settings
    {
      id: 'profile-settings',
      title: 'Profile Settings',
      description: 'Edit your personal information',
      icon: User,
      action: () => navigate('/settings?tab=profile'),
      category: 'Settings',
      keywords: ['profile', 'personal', 'info', 'account']
    },
    {
      id: 'notification-settings',
      title: 'Notification Settings',
      description: 'Manage notification preferences',
      icon: Bell,
      action: () => navigate('/settings?tab=notifications'),
      category: 'Settings',
      keywords: ['notifications', 'alerts', 'preferences']
    },
    {
      id: 'privacy-settings',
      title: 'Privacy Settings',
      description: 'Control your privacy and security',
      icon: Shield,
      action: () => navigate('/settings?tab=privacy'),
      category: 'Settings',
      keywords: ['privacy', 'security', 'data']
    },
    {
      id: 'appearance-settings',
      title: 'Appearance Settings',
      description: 'Customize the app appearance',
      icon: Palette,
      action: () => navigate('/settings?tab=appearance'),
      category: 'Settings',
      keywords: ['appearance', 'theme', 'colors', 'design']
    },
    {
      id: 'data-settings',
      title: 'Data Management',
      description: 'Export, import, or delete data',
      icon: Database,
      action: () => navigate('/settings?tab=data'),
      category: 'Settings',
      keywords: ['data', 'export', 'import', 'backup']
    }
  ]

  const filteredCommands = commands.filter(command => {
    if (!query) return true
    const searchTerm = query.toLowerCase()
    return (
      command.title.toLowerCase().includes(searchTerm) ||
      command.description?.toLowerCase().includes(searchTerm) ||
      command.keywords.some(keyword => keyword.includes(searchTerm))
    )
  })

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = []
    }
    acc[command.category].push(command)
    return acc
  }, {} as Record<string, CommandItem[]>)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
            onClose()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onClose])

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-cozy-surface border border-cozy-gray-300 rounded-lg shadow-cozy-lg overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-cozy-gray-300">
            <Search className="w-5 h-5 text-cozy-text-muted" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-cozy-text placeholder:text-cozy-text-muted focus:outline-none"
            />
            <div className="flex items-center gap-1 text-xs text-cozy-text-muted">
              <kbd className="px-2 py-1 bg-cozy-gray-200 rounded text-xs">⌘</kbd>
              <kbd className="px-2 py-1 bg-cozy-gray-200 rounded text-xs">K</kbd>
            </div>
          </div>

          {/* Results */}
          <div 
            ref={listRef}
            className="max-h-96 overflow-y-auto"
          >
            {Object.keys(groupedCommands).length === 0 ? (
              <div className="px-4 py-8 text-center text-cozy-text-muted">
                <Command className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                <div key={category}>
                  <div className="px-4 py-2 bg-cozy-cream text-xs font-semibold text-cozy-text-muted uppercase tracking-wide">
                    {category}
                  </div>
                  {categoryCommands.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command)
                    const Icon = command.icon
                    return (
                      <button
                        key={command.id}
                        data-index={globalIndex}
                        onClick={() => {
                          command.action()
                          onClose()
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          globalIndex === selectedIndex
                            ? "bg-cozy-primary text-white"
                            : "text-cozy-text hover:bg-cozy-cream"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{command.title}</div>
                          {command.description && (
                            <div className={cn(
                              "text-sm truncate",
                              globalIndex === selectedIndex
                                ? "text-white/80"
                                : "text-cozy-text-muted"
                            )}>
                              {command.description}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-50" />
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-cozy-cream border-t border-cozy-gray-300 text-xs text-cozy-text-muted">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-cozy-gray-200 rounded text-xs">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-cozy-gray-200 rounded text-xs">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-cozy-gray-200 rounded text-xs">esc</kbd>
                  Close
                </span>
              </div>
              <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
