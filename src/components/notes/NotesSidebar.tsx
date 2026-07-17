import React from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { NotesTab } from './types'

interface NotesSidebarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeTab: NotesTab
  onTabChange: (tab: NotesTab) => void
  onCreateNote: () => void
  showCreateButton?: boolean
}

export default function NotesSidebar({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onCreateNote,
  showCreateButton = true,
}: NotesSidebarProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as NotesTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
          <TabsTrigger value="archived">Archive</TabsTrigger>
        </TabsList>
      </Tabs>

      {showCreateButton && (
        <Button onClick={onCreateNote} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      )}
    </div>
  )
}
