import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import ListPicker from '../components/ListPicker'
import { Plus, Check, Trash2, ShoppingCart, Search, Filter, X, FileText, Download, Save, List, Package, Template } from 'lucide-react'
import Tabs, { TabPanel } from '../components/ui/Tabs'

interface ShoppingItem {
  id: string
  title: string
  qty?: string
  notes?: string
  status: 'ACTIVE' | 'DONE'
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; email: string }
  doneBy?: { id: string; name: string; email: string }
}

interface ShoppingList {
  id: string
  name: string
  householdId: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

interface ShoppingTemplate {
  id: string
  name: string
  createdAt: string
  items: ShoppingTemplateItem[]
}

interface ShoppingTemplateItem {
  id: string
  name: string
  quantity: number
  note?: string
}

export default function ShoppingPage() {
  const { data: session, status } = useSession()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showPopularItems, setShowPopularItems] = useState(false)
  const [showAllResults, setShowAllResults] = useState(false)
  const [allSearchResults, setAllSearchResults] = useState<any[]>([])
  
  // Enhanced search functionality
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  
  // Tab state
  const [activeTab, setActiveTab] = useState('lists')
  const [searchCache, setSearchCache] = useState<Record<string, any[]>>({})
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [popularSearchTerms, setPopularSearchTerms] = useState<string[]>([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  
  // Popular search terms
  const popularSearches = ['milk', 'bread', 'eggs', 'chicken', 'pasta', 'rice', 'cheese', 'yogurt', 'apples', 'bananas']

  // Smart icon system for products without images
  const getProductIcon = (title: string) => {
    const titleLower = title.toLowerCase()
    
    // Dairy products
    if (titleLower.includes('milk') || titleLower.includes('cheese') || titleLower.includes('yogurt') || 
        titleLower.includes('butter') || titleLower.includes('cream') || titleLower.includes('dairy')) {
      return '🥛'
    }
    
    // Meat & Protein
    if (titleLower.includes('chicken') || titleLower.includes('beef') || titleLower.includes('pork') || 
        titleLower.includes('fish') || titleLower.includes('meat') || titleLower.includes('sausage') ||
        titleLower.includes('ham') || titleLower.includes('bacon')) {
      return '🥩'
    }
    
    // Fruits
    if (titleLower.includes('apple') || titleLower.includes('banana') || titleLower.includes('orange') || 
        titleLower.includes('grape') || titleLower.includes('berry') || titleLower.includes('fruit') ||
        titleLower.includes('lemon') || titleLower.includes('lime') || titleLower.includes('peach') ||
        titleLower.includes('pear') || titleLower.includes('strawberry')) {
      return '🍎'
    }
    
    // Vegetables
    if (titleLower.includes('tomato') || titleLower.includes('onion') || titleLower.includes('carrot') || 
        titleLower.includes('lettuce') || titleLower.includes('cucumber') || titleLower.includes('pepper') ||
        titleLower.includes('potato') || titleLower.includes('vegetable') || titleLower.includes('spinach') ||
        titleLower.includes('broccoli') || titleLower.includes('cabbage')) {
      return '🥕'
    }
    
    // Bread & Bakery
    if (titleLower.includes('bread') || titleLower.includes('roll') || titleLower.includes('bagel') || 
        titleLower.includes('croissant') || titleLower.includes('muffin') || titleLower.includes('cake') ||
        titleLower.includes('cookie') || titleLower.includes('pastry') || titleLower.includes('biscuit')) {
      return '🍞'
    }
    
    // Beverages
    if (titleLower.includes('water') || titleLower.includes('juice') || titleLower.includes('soda') || 
        titleLower.includes('coffee') || titleLower.includes('tea') || titleLower.includes('beer') ||
        titleLower.includes('wine') || titleLower.includes('drink') || titleLower.includes('coca') ||
        titleLower.includes('pepsi') || titleLower.includes('fanta')) {
      return '🥤'
    }
    
    // Snacks & Sweets
    if (titleLower.includes('chocolate') || titleLower.includes('candy') || titleLower.includes('chip') || 
        titleLower.includes('cracker') || titleLower.includes('nut') || titleLower.includes('popcorn') ||
        titleLower.includes('sweet') || titleLower.includes('snack') || titleLower.includes('gum')) {
      return '🍫'
    }
    
    // Grains & Pasta
    if (titleLower.includes('rice') || titleLower.includes('pasta') || titleLower.includes('noodle') || 
        titleLower.includes('cereal') || titleLower.includes('oat') || titleLower.includes('quinoa') ||
        titleLower.includes('barley') || titleLower.includes('wheat')) {
      return '🌾'
    }
    
    // Eggs
    if (titleLower.includes('egg')) {
      return '🥚'
    }
    
    // Frozen foods
    if (titleLower.includes('frozen') || titleLower.includes('ice cream') || titleLower.includes('pizza')) {
      return '🧊'
    }
    
    // Cleaning & Household
    if (titleLower.includes('soap') || titleLower.includes('detergent') || titleLower.includes('cleaner') || 
        titleLower.includes('tissue') || titleLower.includes('paper') || titleLower.includes('toilet') ||
        titleLower.includes('shampoo') || titleLower.includes('toothpaste')) {
      return '🧽'
    }
    
    // Baby products
    if (titleLower.includes('baby') || titleLower.includes('diaper') || titleLower.includes('pampers') || 
        titleLower.includes('formula') || titleLower.includes('wipes')) {
      return '👶'
    }
    
    // Pet products
    if (titleLower.includes('dog') || titleLower.includes('cat') || titleLower.includes('pet') || 
        titleLower.includes('food') && (titleLower.includes('dog') || titleLower.includes('cat'))) {
      return '🐕'
    }
    
    // Default generic icon
    return '🛒'
  }

  // Search modal removed for simplified UX
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [itemLoading, setItemLoading] = useState(false)
  // Modal search query removed with search modal
  const [templates, setTemplates] = useState<ShoppingTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ShoppingTemplate | null>(null)
  const [selectedTemplateItems, setSelectedTemplateItems] = useState<string[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  // List creation is now handled by ListPicker component

  // Lists are now managed by ListPicker component via useSWR
  // This eliminates duplicate API calls and improves performance

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        // Focus search input
        const searchInput = document.querySelector('input[placeholder*="Search products"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load templates
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/shopping/templates')
        .then(res => res.json())
        .then(data => {
          if (data.templates) {
            setTemplates(data.templates)
          }
        })
        .catch(console.error)
    }
  }, [status])

  // Load items for selected list
  useEffect(() => {
    if (selectedListId) {
      fetch(`/api/shopping/items?listId=${selectedListId}`)
        .then(res => res.json())
        .then(data => {
          if (data.items) {
            setItems(data.items)
          }
        })
        .catch(console.error)
    }
  }, [selectedListId])

  const addItem = async () => {
    if (!newItemTitle.trim() || !selectedListId) return

    setLoading(true)
    try {
      const response = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedListId,
          title: newItemTitle,
          qty: newItemQty || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setItems(prev => [data.item, ...prev])
        setNewItemTitle('')
        setNewItemQty('')
      }
    } catch (error) {
      console.error('Failed to add item:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItemStatus = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    
    const newStatus = item.status === 'ACTIVE' ? 'DONE' : 'ACTIVE'
    
    try {
      const response = await fetch(`/api/shopping/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, status: newStatus as 'ACTIVE' | 'DONE' } : item
        ))
      }
    } catch (error) {
      console.error('Failed to toggle item:', error)
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/shopping/items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const handleItemClick = async (item: any) => {
    setSelectedItem(item)
    setShowItemModal(true)
    setItemLoading(false) // No need to load since we already have the data
  }

  // Enhanced search suggestions with caching and better debouncing
  const searchSuggestions = (query: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setSearchLoading(false)
      setSelectedIndex(-1)
      return
    }

    // Check cache first
    const cacheKey = query.trim().toLowerCase()
    if (searchCache[cacheKey]) {
      setSuggestions(searchCache[cacheKey])
      setShowSuggestions(true)
      setSearchLoading(false)
      setSelectedIndex(-1)
      return
    }

    setSearchLoading(true)
    setShowSuggestions(false)
    setShowPopularItems(false)
    setSelectedIndex(-1)

    // Increased debounce time for better performance
    const timeout = setTimeout(async () => {
      try {
        // Clean the query for better results
        const cleanQuery = query.trim().toLowerCase()
        
        // Try multiple search strategies for better results
        const searchPromises = []
        
        // Main search
        searchPromises.push(fetch(`/api/prices/suggest?q=${encodeURIComponent(cleanQuery)}`))
        
        // Search for partial matches (useful for "pampers" -> "pamp")
        if (cleanQuery.length > 3) {
          const partialQuery = cleanQuery.substring(0, cleanQuery.length - 1)
          searchPromises.push(fetch(`/api/prices/suggest?q=${encodeURIComponent(partialQuery)}`))
        }
        
        // If query has multiple words, also search for individual words
        const words = cleanQuery.split(' ').filter(word => word.length > 2)
        if (words.length > 1) {
          words.forEach(word => {
            searchPromises.push(fetch(`/api/prices/suggest?q=${encodeURIComponent(word)}`))
          })
        }
        
        // Search for common variations (e.g., "pampers" -> "pamp")
        if (cleanQuery.length > 4) {
          const shortQuery = cleanQuery.substring(0, 4)
          searchPromises.push(fetch(`/api/prices/suggest?q=${encodeURIComponent(shortQuery)}`))
        }
        
        const responses = await Promise.all(searchPromises)
        const allItems = []
        
        for (const response of responses) {
          if (response.ok) {
            const data = await response.json()
            allItems.push(...(data.items || []))
          }
        }
        
        // Remove duplicates based on ID
        const uniqueItems = allItems.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        )
        
        const items = uniqueItems
        
        // Enhanced sorting for better relevance
        const sortedItems = items.sort((a: any, b: any) => {
          const aTitle = a.title.toLowerCase()
          const bTitle = b.title.toLowerCase()
          const queryLower = cleanQuery.toLowerCase()
          
          // Exact match gets highest priority
          if (aTitle === queryLower) return -1
          if (bTitle === queryLower) return 1
          
          // Starts with query gets second priority
          if (aTitle.startsWith(queryLower) && !bTitle.startsWith(queryLower)) return -1
          if (bTitle.startsWith(queryLower) && !aTitle.startsWith(queryLower)) return 1
          
          // Contains query as whole word gets third priority
          const aWordMatch = aTitle.includes(` ${queryLower} `) || aTitle.startsWith(`${queryLower} `) || aTitle.endsWith(` ${queryLower}`)
          const bWordMatch = bTitle.includes(` ${queryLower} `) || bTitle.startsWith(`${queryLower} `) || bTitle.endsWith(` ${queryLower}`)
          if (aWordMatch && !bWordMatch) return -1
          if (bWordMatch && !aWordMatch) return 1
          
          // Contains query anywhere gets fourth priority
          if (aTitle.includes(queryLower) && !bTitle.includes(queryLower)) return -1
          if (bTitle.includes(queryLower) && !aTitle.includes(queryLower)) return 1
          
          // Partial match scoring (for "pampers" -> "pamp")
          const aPartialScore = calculatePartialMatchScore(aTitle, queryLower)
          const bPartialScore = calculatePartialMatchScore(bTitle, queryLower)
          if (aPartialScore > bPartialScore) return -1
          if (bPartialScore > aPartialScore) return 1
          
          // Then by price (lower price first)
          return a.nowCents - b.nowCents
        })
        
        // Helper function to calculate partial match score
        function calculatePartialMatchScore(title: string, query: string): number {
          let score = 0
          const queryWords = query.split(' ')
          
          for (const word of queryWords) {
            if (title.includes(word)) {
              score += word.length
            }
            // Bonus for partial matches at the beginning of words
            const words = title.split(' ')
            for (const titleWord of words) {
              if (titleWord.startsWith(word)) {
                score += word.length * 2
              }
            }
          }
          return score
        }
        
        // Cache the results for future use
        setSearchCache(prev => ({ ...prev, [cacheKey]: sortedItems }))
        
        // Store all results and show initial batch
        setAllSearchResults(sortedItems)
        setSuggestions(sortedItems.slice(0, 30)) // Show first 30 results
        setShowAllResults(false) // Reset show all state
        setShowSuggestions(true)
        
        // Add to search history
        addToSearchHistory(cleanQuery)
        
        // Show suggestions inline instead of opening modal
        if (sortedItems.length > 0) {
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
        setSuggestions([])
      } finally {
        setSearchLoading(false)
      }
    }, 500) // 500ms debounce for better performance

    setSearchTimeout(timeout)
  }

  // List creation is now handled by ListPicker component

  // Helper functions for enhanced search
  const addToSearchHistory = (query: string) => {
    if (query.trim() && !searchHistory.includes(query)) {
      setSearchHistory(prev => [query, ...prev.slice(0, 4)]) // Keep last 5 searches
    }
  }

  const showPopularSearchSuggestions = () => {
    setPopularSearchTerms(popularSearches)
    setShowSearchSuggestions(true)
  }

  const handleSearchSuggestionClick = (suggestion: string) => {
    setNewItemTitle(suggestion)
    setShowSearchSuggestions(false)
    searchSuggestions(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleItemClick(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setShowSearchSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const handleAddToCart = async (item: any) => {
    console.log('handleAddToCart called with:', { selectedListId, listsLength: lists.length, item })
    
    if (!selectedListId) {
      if (lists.length === 0) {
        alert('No shopping lists available. Please create a shopping list first.')
      } else {
        alert('Please select a shopping list from the dropdown on the left side of the page.')
      }
      return
    }
    
    setItemLoading(true)
    try {
      const requestBody = {
        listId: selectedListId,
        title: item.title,
        qty: 1,
        price: item.nowCents,
        imageUrl: item.imageUrl,
        productUrl: item.url,
        store: item.store,
      }
      
      const response = await fetch('/api/shopping/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        setItems(prev => [data.item, ...prev])
        // Modal functionality removed
        setShowItemModal(false)
        setSelectedItem(null)
      } else {
        const errorData = await response.text()
        console.error('Failed to add item:', response.status, errorData)
        alert(`Failed to add item: ${response.status} ${errorData}`)
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      alert('Failed to add item to cart. Please try again.')
    } finally {
      setItemLoading(false)
    }
  }

  const selectSuggestion = (suggestion: any) => {
    setNewItemTitle(suggestion.title)
    // Modal search query removed
    setSuggestions([])
    setShowSuggestions(false)
    setSearchLoading(false)
    setShowPopularItems(false)
    setShowAllResults(false)
    // Modal functionality removed
  }

  const showAllSearchResults = () => {
    setSuggestions(allSearchResults)
    setShowAllResults(true)
    // Modal functionality removed - show all results inline
  }

  const showLessResults = () => {
    setSuggestions(allSearchResults.slice(0, 30))
    setShowAllResults(false)
  }

  // Search modal functions removed for simplified UX

  // Template functions
  const createTemplate = async () => {
    if (!newTemplateName.trim() || !selectedListId) return

    const activeItems = items.filter(item => item.status === 'ACTIVE')
    if (activeItems.length === 0) {
      alert('No active items to save as template')
      return
    }

    try {
      const response = await fetch('/api/shopping/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          items: activeItems.map(item => ({
            name: item.title,
            quantity: parseInt(item.qty || '1'),
            note: item.notes ? (() => {
              try {
                const productInfo = JSON.parse(item.notes);
                return productInfo.originalStore || undefined;
              } catch (e) {
                return undefined;
              }
            })() : undefined,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(prev => [data.template, ...prev])
        setNewTemplateName('')
        setShowTemplateModal(false)
        alert('Template created successfully!')
      }
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Failed to create template')
    }
  }

  const importFromTemplate = async () => {
    if (!selectedTemplate || !selectedListId) return

    try {
      const response = await fetch('/api/shopping/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedListId,
          templateId: selectedTemplate.id,
          selectedItems: selectedTemplateItems.length > 0 ? selectedTemplateItems : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setItems(prev => [...data.items, ...prev])
        setShowImportModal(false)
        setSelectedTemplate(null)
        setSelectedTemplateItems([])
        alert(`Imported ${data.items.length} items successfully!`)
      }
    } catch (error) {
      console.error('Failed to import items:', error)
      alert('Failed to import items')
    }
  }

  const openImportModal = (template: ShoppingTemplate) => {
    setSelectedTemplate(template)
    setSelectedTemplateItems([])
    setShowImportModal(true)
  }

  // Load popular items when input is focused
  const loadPopularItems = async () => {
    if (suggestions.length > 0 || newItemTitle.length > 0) return
    
    try {
      const response = await fetch('/api/prices/suggest?q=milk')
      if (response.ok) {
        const data = await response.json()
        setSuggestions((data.items || []).slice(0, 6))
        setShowPopularItems(true)
      }
    } catch (error) {
      console.error('Failed to load popular items:', error)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  }, [searchTimeout])

  // Keyboard shortcuts simplified - removed search modal shortcuts

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeItems = filteredItems.filter(item => item.status === 'ACTIVE')
  const doneItems = filteredItems.filter(item => item.status === 'DONE')

  if (status === 'loading') {
    return (
      <ModernAppShell title="Shopping">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your shopping lists...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <ModernAppShell title="Shopping">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600">Please sign in to access your shopping lists</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  // Tab configuration
  const tabs = [
    { 
      id: 'lists', 
      label: 'Shopping Lists', 
      icon: List,
      badge: lists.length > 0 ? lists.length : undefined
    },
    { 
      id: 'items', 
      label: 'All Items', 
      icon: Package,
      badge: items.length > 0 ? items.length : undefined
    },
    { 
      id: 'templates', 
      label: 'Templates', 
      icon: Template
    },
    { 
      id: 'search', 
      label: 'Search & Add', 
      icon: Search
    }
  ]

  return (
    <ModernAppShell title="Shopping">
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-cozy-text mb-2 flex items-center gap-3">
            <span className="animate-cozy-wiggle">🛒</span>Shopping Lists
        </h1>
          <p className="text-cozy-text-muted">Your shared family lists, organized with love</p>
          
          {/* Active List Indicator */}
          {selectedListId && lists.length > 0 && (
            <div className="mt-4 bg-cozy-primary/10 border border-cozy-primary rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cozy-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-cozy-text">
                  Active List: {lists.find(l => l.id === selectedListId)?.name || 'Unknown'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pills"
          className="mb-6"
        />

        {/* Tab Content */}
        {activeTab === 'lists' && (
          <TabPanel>
            {/* List Picker */}
            <div className="grid gap-6 lg:grid-cols-3 w-full items-start">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shopping List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ListPicker
                      selectedId={selectedListId}
                      onChange={setSelectedListId}
                      onListsChange={setLists}
                      onAutoSelect={setSelectedListId}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Add Item */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Item</CardTitle>
                    {!selectedListId && (
                      <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                        ⚠️ Please select a shopping list first to add items
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Search Field and Search Button */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-cozy-text">Search Products</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative" style={{ position: 'relative', zIndex: 1 }}>
                            <Input
                              placeholder="🛒 Search products (e.g., 'coca', 'milk', 'bread')... (Ctrl+K to focus)"
                              value={newItemTitle}
                              onChange={(e) => {
                                setNewItemTitle(e.target.value)
                                if (e.target.value.trim()) {
                                  searchSuggestions(e.target.value)
                                } else {
                                  setSuggestions([])
                                  setShowSuggestions(false)
                                }
                              }}
                              onKeyDown={handleKeyDown}
                              onFocus={() => setShowSuggestions(true)}
                              className="w-full"
                            />
                            {showSuggestions && suggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cozy-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                {suggestions.slice(0, 5).map((suggestion, index) => (
                                  <button
                                    key={index}
                                    className={`w-full px-4 py-2 text-left hover:bg-cozy-cream transition-colors ${
                                      selectedIndex === index ? 'bg-cozy-cream' : ''
                                    }`}
                                    onClick={() => selectSuggestion(suggestion)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{suggestion.title}</span>
                                      {suggestion.nowCents && (
                                        <span className="text-xs text-cozy-text-muted">
                                          €{(suggestion.nowCents / 100).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => searchSuggestions(newItemTitle)}
                            disabled={!newItemTitle.trim() || searchLoading}
                            className="px-4"
                          >
                            {searchLoading ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div>
                        <label className="block text-sm font-medium text-cozy-text mb-1">Quantity (optional)</label>
                        <Input
                          placeholder="e.g., 2, 1kg, 500ml"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addItem()
                            }
                          }}
                        />
                      </div>

                      {/* Add Button */}
                      <Button
                        onClick={addItem}
                        disabled={!newItemTitle.trim() || !selectedListId || loading}
                        className="w-full"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Add to List
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabPanel>
        )}

        {activeTab === 'items' && (
          <TabPanel>
            <Card>
              <CardHeader>
                <CardTitle>Shopping Items</CardTitle>
                <CardDescription>
                  {selectedListId ? `Items in ${lists.find(l => l.id === selectedListId)?.name}` : 'Select a list to view items'}
                </CardDescription>
                {(() => {
                  const activeItems = filteredItems.filter(item => item.status === 'ACTIVE');
                  const totalPrice = activeItems.reduce((sum, item) => {
                    if (item.notes) {
                      try {
                        const productInfo = JSON.parse(item.notes);
                        if (productInfo.price) {
                          return sum + productInfo.price;
                        }
                      } catch (e) {
                        // Ignore JSON parse errors
                      }
                    }
                    return sum;
                  }, 0);
                  
                  if (totalPrice > 0) {
                    return (
                      <div className="mt-2 p-3 bg-cozy-cream rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-cozy-text">Estimated Total:</span>
                          <span className="text-lg font-bold text-cozy-primary">
                            {(totalPrice / 100).toFixed(2)}€
                          </span>
                        </div>
                        <div className="text-xs text-cozy-text-muted mt-1">
                          Based on {activeItems.filter(item => item.notes && JSON.parse(item.notes || '{}').price).length} items with prices
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </CardHeader>
              <CardContent>
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-cozy-text-muted">
                    {searchQuery ? 'No items match your search' : 'No items in this list yet'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-cozy-cream transition-colors group">
                        <button
                          onClick={() => toggleItemStatus(item.id)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.status === 'DONE' 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-cozy-gray-300 hover:border-cozy-primary'
                          }`}
                        >
                          {item.status === 'DONE' && <Check className="w-4 h-4" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${item.status === 'DONE' ? 'line-through text-cozy-text-muted' : 'text-cozy-text'}`}>
                            {item.title}
                          </div>
                          {item.qty && (
                            <div className="text-sm text-cozy-text-muted">Qty: {item.qty}</div>
                          )}
                          {item.notes && (() => {
                            try {
                              const productInfo = JSON.parse(item.notes);
                              if (productInfo.price) {
                                return (
                                  <div className="text-xs font-medium text-cozy-primary">
                                    €{(productInfo.price / 100).toFixed(2)}
                                  </div>
                                );
                              }
                            } catch (e) {
                              // Ignore JSON parse errors
                            }
                            return null;
                          })()}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cozy-text-muted">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        )}

        {activeTab === 'templates' && (
          <TabPanel>
            <div className="text-center py-8">
              <p className="text-cozy-text-muted">Templates content will be organized here</p>
            </div>
          </TabPanel>
        )}

        {activeTab === 'search' && (
          <TabPanel>
            <div className="text-center py-8">
              <p className="text-cozy-text-muted">Search & Add content will be organized here</p>
            </div>
          </TabPanel>
        )}

      </div>
    </ModernAppShell>
  )
}