import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  Search,
  Settings,
  Users,
  Plus,
  FileText,
  User,
  Bell,
  Shield,
  Database,
  Command,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
  HelpCircle,
  Compass,
  ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { modules } from '@/lib/modules'
import { moduleHelp } from '@/lib/help-content'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { useOnboarding } from '@/components/onboarding/OnboardingProvider'
import { useTour } from '@/components/onboarding/TourProvider'

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
  const { data: session } = useSession()
  const { setTheme } = useTheme()
  const onboarding = useOnboarding()
  const tour = useTour()
  const hasHousehold = onboarding?.state?.household != null
  const checklistDismissed = onboarding?.state?.user.checklistDismissedAt != null
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands: CommandItem[] = [
    // Navigation — sourced from the shared module registry
    ...modules.map((module) => ({
      id: `nav-${module.key}`,
      title: `Go to ${module.name}`,
      description: moduleHelp[module.key].tagline,
      icon: module.icon,
      action: () => router.push(module.href),
      category: 'Navigation',
      keywords: moduleHelp[module.key].keywords,
    })),
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
    
    // Admin Panel (only for admin user)
    ...((session?.user as any)?.isAdmin === true ? [{
      id: 'nav-admin',
      title: 'Go to Admin Panel',
      description: 'Manage users, households, and view system statistics',
      icon: Shield,
      action: () => router.push('/admin'),
      category: 'Navigation',
      keywords: ['admin', 'management', 'users', 'statistics', 'system']
    }] : []),

    // Quick Actions
    {
      id: 'add-shopping-item',
      title: 'Add Shopping Item',
      description: 'Add a new item to your shopping list',
      icon: Plus,
      action: () => {
        router.push('/shopping')
        // Could trigger add item modal here
      },
      category: 'Quick Actions',
      keywords: ['add', 'shopping', 'item', 'new']
    },
    {
      id: 'add-note',
      title: 'Add New Note',
      description: 'Create a new personal or shared note',
      icon: FileText,
      action: () => {
        router.push('/notes')
        // Could trigger add note modal here
      },
      category: 'Quick Actions',
      keywords: ['add', 'note', 'writing', 'memo', 'personal', 'shared']
    },

    // Help
    {
      id: 'help-open',
      title: 'Open Help',
      description: 'How every area of ClanKeep works',
      icon: HelpCircle,
      action: () => router.push('/help'),
      category: 'Help',
      keywords: ['help', 'docs', 'guide', 'support', 'how', 'faq', 'questions'],
    },
    ...modules.map((module) => ({
      id: `help-${module.key}`,
      title: `Help: ${module.name}`,
      description: moduleHelp[module.key].summary,
      icon: HelpCircle,
      action: () => router.push(`/help#${module.key}`),
      category: 'Help',
      keywords: ['help', 'how', 'guide', ...moduleHelp[module.key].keywords],
    })),
    ...(tour && hasHousehold ? [{
      id: 'help-tour',
      title: 'Replay the product tour',
      description: 'A 90-second look around the app',
      icon: Compass,
      action: () => { void tour.startTour() },
      category: 'Help',
      keywords: ['tour', 'walkthrough', 'guide', 'onboarding', 'replay', 'intro'],
    }] : []),
    ...(checklistDismissed && hasHousehold ? [{
      id: 'help-checklist',
      title: 'Show the getting-started checklist',
      description: 'Bring back the setup steps on your overview',
      icon: ListChecks,
      action: () => {
        void onboarding?.update({ checklistDismissed: false }).catch(() => {})
        void router.push('/dashboard')
      },
      category: 'Help',
      keywords: ['checklist', 'getting started', 'setup', 'onboarding', 'steps'],
    }] : []),

    // Appearance
    {
      id: 'theme-light',
      title: 'Switch to Light theme',
      icon: Sun,
      action: () => setTheme('light'),
      category: 'Appearance',
      keywords: ['theme', 'light', 'appearance', 'bright']
    },
    {
      id: 'theme-dark',
      title: 'Switch to Dark theme',
      icon: Moon,
      action: () => setTheme('dark'),
      category: 'Appearance',
      keywords: ['theme', 'dark', 'appearance', 'night']
    },
    {
      id: 'theme-system',
      title: 'Use System theme',
      icon: Monitor,
      action: () => setTheme('system'),
      category: 'Appearance',
      keywords: ['theme', 'system', 'appearance', 'auto']
    },

    // Settings
    {
      id: 'profile-settings',
      title: 'Profile Settings',
      description: 'Edit your personal information',
      icon: User,
      action: () => router.push('/settings?tab=profile'),
      category: 'Settings',
      keywords: ['profile', 'personal', 'info', 'account']
    },
    {
      id: 'notification-settings',
      title: 'Notification Settings',
      description: 'Manage notification preferences',
      icon: Bell,
      action: () => router.push('/settings?tab=notifications'),
      category: 'Settings',
      keywords: ['notifications', 'alerts', 'preferences']
    },
    {
      id: 'privacy-settings',
      title: 'Privacy Settings',
      description: 'Control your privacy and security',
      icon: Shield,
      action: () => router.push('/settings?tab=privacy'),
      category: 'Settings',
      keywords: ['privacy', 'security', 'data']
    },
    {
      id: 'data-settings',
      title: 'Data Management',
      description: 'Export, import, or delete data',
      icon: Database,
      action: () => router.push('/settings?tab=data'),
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="top-[18vh] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0 max-sm:bottom-auto max-sm:top-0 max-sm:max-h-[calc(var(--viewport-height)_-_1rem)] max-sm:rounded-b-2xl max-sm:rounded-t-none max-sm:border-t-0 max-sm:border-x-0 max-sm:pb-0 max-sm:data-[state=open]:slide-in-from-top-6 max-sm:data-[state=closed]:slide-out-to-top-6">
        <DialogTitle className="sr-only">Search Clankeep</DialogTitle>
        <DialogDescription className="sr-only">Navigate to a page or choose a quick action.</DialogDescription>
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b px-4 py-3 pr-12">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="houseflow-command-results"
              aria-activedescendant={filteredCommands[selectedIndex] ? `command-${filteredCommands[selectedIndex].id}` : undefined}
              placeholder="Search pages and actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm"
            />
          </div>

          {/* Results */}
          <div 
            ref={listRef}
            id="houseflow-command-results"
            role="listbox"
            // Shrinks with the keyboard so results never sit under it.
            className="max-h-[min(24rem,calc(var(--viewport-height)_-_9rem))] overflow-y-auto overscroll-contain"
          >
            {Object.keys(groupedCommands).length === 0 ? (
              <div className="px-4 py-10 text-center text-muted-foreground">
                <Command className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, categoryCommands]) => (
                <div key={category}>
                  <div className="border-y bg-muted/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground first:border-t-0">
                    {category}
                  </div>
                  {categoryCommands.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command)
                    const Icon = command.icon
                    return (
                      <button
                        key={command.id}
                        id={`command-${command.id}`}
                        role="option"
                        aria-selected={globalIndex === selectedIndex}
                        data-index={globalIndex}
                        onClick={() => {
                          command.action()
                          onClose()
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          globalIndex === selectedIndex
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{command.title}</div>
                          {command.description && (
                            <div className={cn(
                              "text-sm truncate",
                              globalIndex === selectedIndex
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
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
          <div className="border-t bg-muted/55 px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-background px-1 py-0.5 text-xs">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-background px-1 py-0.5 text-xs">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-background px-1 py-0.5 text-xs">esc</kbd>
                  Close
                </span>
              </div>
              <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}
