import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import ListPicker from '../components/ListPicker'
import { Plus, Check, Trash2, ShoppingCart, Search, Filter, X, FileText, Download, Save } from 'lucide-react'

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

  const toggleItem = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DONE' : 'ACTIVE'
    
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

  // Search suggestions with debouncing
  const searchSuggestions = (query: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)

    // Debounce the search
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
        
        // Store all results and show initial batch
        setAllSearchResults(sortedItems)
        setSuggestions(sortedItems.slice(0, 30)) // Show first 30 results in modal
        setShowAllResults(false) // Reset show all state
        setShowSuggestions(true)
        
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
    }, 300) // 300ms debounce

    setSearchTimeout(timeout)
  }

  // List creation is now handled by ListPicker component

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

        {/* Top Section - List Picker and Add Item */}
        <div className="grid gap-6 lg:grid-cols-3 w-full items-start">
          {/* List Picker */}
          <div className="lg:col-span-1 order-2 lg:order-1">
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
          <div className="lg:col-span-2 order-1 lg:order-2">
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
                          placeholder="🛒 Search products (e.g., 'coca', 'milk', 'bread')..."
                          value={newItemTitle}
                          onChange={(e) => {
                            setNewItemTitle(e.target.value)
                            searchSuggestions(e.target.value)
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && addItem()}
                          onFocus={() => {
                            if (suggestions.length > 0) {
                              setShowSuggestions(true)
                            } else if (newItemTitle.length === 0) {
                              loadPopularItems()
                            }
                            // Search experience simplified - no modal needed
                          }}
                          onBlur={() => {
                            // Delay hiding suggestions to allow clicking
                            setTimeout(() => {
                              setShowSuggestions(false)
                              setShowPopularItems(false)
                            }, 200)
                          }}
                          className="w-full border-2 border-cozy-gray-200 focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20"
                        />
                      {/* Search loading indicator */}
                      {searchLoading && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cozy-gray-200 rounded-lg shadow-cozy-lg p-4" style={{ position: 'absolute', zIndex: 40, top: '100%', left: 0, right: 0 }}>
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-cozy-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-cozy-text-muted">Searching products...</span>
                          </div>
                        </div>
                      )}

                      {/* Enhanced suggestions dropdown */}
                      {showSuggestions && suggestions.length > 0 && !searchLoading && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cozy-gray-200 rounded-lg shadow-cozy-lg max-h-80 overflow-y-auto" style={{ position: 'absolute', zIndex: 40, top: '100%', left: 0, right: 0 }}>
                          <div className="p-2 border-b border-cozy-gray-100">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium text-cozy-text-muted uppercase tracking-wide">
                                {showPopularItems ? (
                                  <>⭐ Popular Products ({suggestions.length})</>
                                ) : (
                                  <>🛒 Smart Supermarket Products ({suggestions.length}{allSearchResults.length > 10 && !showAllResults ? ` of ${allSearchResults.length}` : ''})</>
                                )}
                              </div>
                              {!showPopularItems && allSearchResults.length > 10 && (
                                <div className="flex space-x-2">
                                  {!showAllResults ? (
                                    <button
                                      onClick={showAllSearchResults}
                                      className="text-xs text-cozy-primary hover:text-cozy-primary-deep font-medium"
                                    >
                                      Show All ({allSearchResults.length})
                                    </button>
                                  ) : (
                                    <button
                                      onClick={showLessResults}
                                      className="text-xs text-cozy-primary hover:text-cozy-primary-deep font-medium"
                                    >
                                      Show Less
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={suggestion.id || index}
                              className="p-3 hover:bg-cozy-cream cursor-pointer border-b border-cozy-gray-50 last:border-b-0 transition-colors"
                              onClick={() => handleItemClick(suggestion)}
                            >
                              <div className="flex items-start space-x-3">
                                {/* Product image */}
                                <div className="flex-shrink-0">
                                  {suggestion.imageUrl ? (
                                    <img
                                      src={suggestion.imageUrl}
                                      alt={suggestion.title}
                                      className="w-12 h-12 object-cover rounded-lg border border-cozy-gray-200"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-cozy-cream rounded-lg border border-cozy-gray-200 flex items-center justify-center">
                                      <span className="text-cozy-text-muted text-lg">🛒</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Product details */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-cozy-text text-sm leading-tight mb-1">
                                    {suggestion.title}
                                  </div>
                                  <div className="text-xs text-cozy-text-muted mb-2">
                                    {suggestion.store}
                                  </div>
                                  
                                  {/* Price section */}
                                  <div className="flex items-center space-x-2">
                                    <div className="font-semibold text-cozy-primary text-sm">
                                      {suggestion.price}
                                    </div>
                                    {suggestion.wasCents && suggestion.wasCents > suggestion.nowCents && (
                                      <div className="text-xs text-cozy-text-muted line-through">
                                        {(suggestion.wasCents / 100).toFixed(2)} EUR
                                      </div>
                                    )}
                                    {suggestion.wasCents && suggestion.wasCents > suggestion.nowCents && (
                                      <div className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                        Save {((suggestion.wasCents - suggestion.nowCents) / 100).toFixed(2)}€
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Add button */}
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-cozy-primary rounded-full flex items-center justify-center text-white text-sm hover:bg-cozy-primary-deep transition-colors">
                                    +
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Footer */}
                          <div className="p-2 border-t border-cozy-gray-100 bg-cozy-cream/50">
                            <div className="text-xs text-cozy-text-muted text-center">
                              {showPopularItems ? (
                                <>💡 Click any product to add it to your list • Start typing to search more</>
                              ) : (
                                <>💡 Click any product to add it to your list</>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* No results message */}
                      {showSuggestions && suggestions.length === 0 && !searchLoading && newItemTitle.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-cozy-gray-200 rounded-lg shadow-cozy-lg p-4">
                          <div className="text-center">
                            <div className="text-2xl mb-2">🔍</div>
                            <div className="text-sm text-cozy-text-muted mb-1">No products found</div>
                            <div className="text-xs text-cozy-text-muted">
                              Try a different search term or add manually
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        // Focus on search input instead of opening modal
                        const searchInput = document.querySelector('input[placeholder*="Search products"]') as HTMLInputElement
                        searchInput?.focus()
                      }}
                      className="bg-cozy-primary hover:bg-cozy-primary-deep text-white px-4 py-3 border-0 shadow-sm hover:shadow-md transition-all"
                      title="Focus search input"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                  
                  {/* Quantity and Add Button */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-cozy-text">Add to List</label>
                    <div className="flex gap-2 sm:gap-3">
                      <div className="flex flex-col">
                        <label className="text-xs text-cozy-text-muted mb-1">Quantity</label>
                        <Input
                          placeholder="1"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          className="w-20 sm:w-24 border-2 border-cozy-gray-200 focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-end">
                        <Button
                          onClick={addItem}
                          disabled={loading || !newItemTitle.trim() || !selectedListId}
                          className="bg-cozy-primary hover:bg-cozy-primary-deep text-white px-6 py-3 border-0 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to List
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-cozy-primary">{activeItems.length}</div>
              <div className="text-sm text-cozy-text-muted flex items-center justify-center gap-1">
                <ShoppingCart className="w-4 h-4" />
                To buy
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-cozy-sage">{doneItems.length}</div>
              <div className="text-sm text-cozy-text-muted flex items-center justify-center gap-1">
                <Check className="w-4 h-4" />
                Done
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Templates
            </CardTitle>
            <CardDescription>
              Save current list as template or import items from existing templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowTemplateModal(true)}
                variant="outline"
                className="border-cozy-gray-300 hover:bg-cozy-cream flex-1 sm:flex-none"
                disabled={!selectedListId || items.filter(item => item.status === 'ACTIVE').length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Template
              </Button>
              
              {templates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {templates.slice(0, 3).map((template) => (
                    <Button
                      key={template.id}
                      onClick={() => openImportModal(template)}
                      variant="outline"
                      size="sm"
                      className="border-cozy-gray-300 hover:bg-cozy-cream"
                      disabled={!selectedListId}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {template.name}
                    </Button>
                  ))}
                  {templates.length > 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-cozy-gray-300 hover:bg-cozy-cream"
                      disabled={!selectedListId}
                    >
                      +{templates.length - 3} more
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cozy-text-muted w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

      {/* Items List */}
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
                      onClick={() => toggleItem(item.id, item.status)}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        item.status === 'DONE' 
                          ? 'bg-cozy-primary border-cozy-primary text-white' 
                          : 'border-cozy-gray-300 hover:border-cozy-primary'
                      }`}
                    >
                      {item.status === 'DONE' && <Check className="w-3 h-3" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${item.status === 'DONE' ? 'line-through text-cozy-text-soft' : 'text-cozy-text'}`}>
                          {item.title}
                  </span>
                        {item.qty && (
                          <Badge variant="outline" className="text-xs">
                            {item.qty}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-cozy-text-muted">
                          Added by {item.createdBy.name}
                        </div>
                        {item.notes && (() => {
                          try {
                            const productInfo = JSON.parse(item.notes);
                            if (productInfo.price) {
                              return (
                                <div className="text-xs font-medium text-cozy-primary">
                                  {(productInfo.price / 100).toFixed(2)}€
                                </div>
                              );
                            }
                          } catch (e) {
                            // Ignore JSON parse errors
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 text-cozy-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
              </div>
      )}
          </CardContent>
        </Card>
      </div>
      
      {/* Search functionality is now simplified with inline suggestions */}

      {/* Template Creation Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-cozy-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-cozy-gray-200">
              <h3 className="text-lg font-semibold text-cozy-text">Save as Template</h3>
              <Button
                onClick={() => setShowTemplateModal(false)}
                variant="outline"
                size="sm"
                className="border-cozy-gray-300 hover:bg-cozy-cream"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cozy-text mb-2">
                    Template Name
                  </label>
                  <Input
                    placeholder="e.g., Weekly Groceries"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="text-sm text-cozy-text-muted">
                  This will save {items.filter(item => item.status === 'ACTIVE').length} active items as a template.
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowTemplateModal(false)}
                  variant="outline"
                  className="flex-1 border-cozy-gray-300 hover:bg-cozy-cream"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createTemplate}
                  className="flex-1 bg-cozy-primary hover:bg-cozy-primary-deep"
                  disabled={!newTemplateName.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Import Modal */}
      {showImportModal && selectedTemplate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-cozy-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-cozy-gray-200">
              <h3 className="text-lg font-semibold text-cozy-text">Import from Template</h3>
              <Button
                onClick={() => setShowImportModal(false)}
                variant="outline"
                size="sm"
                className="border-cozy-gray-300 hover:bg-cozy-cream"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-4">
                <h4 className="font-medium text-cozy-text mb-2">{selectedTemplate.name}</h4>
                <p className="text-sm text-cozy-text-muted">
                  Select items to import to your current list
                </p>
              </div>
              
              <div className="space-y-2">
                {selectedTemplate.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-3 border border-cozy-gray-200 rounded-lg hover:bg-cozy-cream"
                  >
                    <input
                      type="checkbox"
                      id={item.id}
                      checked={selectedTemplateItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplateItems(prev => [...prev, item.id])
                        } else {
                          setSelectedTemplateItems(prev => prev.filter(id => id !== item.id))
                        }
                      }}
                      className="w-4 h-4 text-cozy-primary border-cozy-gray-300 rounded focus:ring-cozy-primary"
                    />
                    <label htmlFor={item.id} className="flex-1 cursor-pointer">
                      <div className="font-medium text-cozy-text">{item.name}</div>
                      {item.note && (
                        <div className="text-sm text-cozy-text-muted">{item.note}</div>
                      )}
                    </label>
                    <div className="text-sm text-cozy-text-muted">
                      Qty: {item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 p-4 sm:p-6 border-t border-cozy-gray-200">
              <Button
                onClick={() => setShowImportModal(false)}
                variant="outline"
                className="flex-1 border-cozy-gray-300 hover:bg-cozy-cream"
              >
                Cancel
              </Button>
              <Button
                onClick={importFromTemplate}
                className="flex-1 bg-cozy-primary hover:bg-cozy-primary-deep"
              >
                <Download className="w-4 h-4 mr-2" />
                Import {selectedTemplateItems.length > 0 ? selectedTemplateItems.length : selectedTemplate.items.length} Items
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-black/50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <div className="bg-white rounded-lg shadow-cozy-lg w-full max-w-2xl max-h-[90vh] flex flex-col mx-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-cozy-gray-200">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-cozy-text">Product Details</h3>
                <p className="text-sm text-cozy-text-muted">
                  {selectedItem.store}
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowItemModal(false)
                  setSelectedItem(null)
                }}
                variant="outline"
                size="sm"
                className="border-cozy-gray-300 hover:bg-cozy-cream flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {itemLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {selectedItem.imageUrl ? (
                        <img
                          src={selectedItem.imageUrl}
                          alt={selectedItem.title}
                          className="w-full sm:w-48 h-48 object-cover rounded-lg border border-cozy-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full sm:w-48 h-48 bg-cozy-cream rounded-lg border border-cozy-gray-200 flex items-center justify-center">
                          <ShoppingCart className="w-12 h-12 text-cozy-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-xl font-semibold text-cozy-text mb-2">{selectedItem.title}</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedItem.store && (
                            <span className="px-2 py-1 bg-cozy-cream text-cozy-text text-xs rounded">
                              {selectedItem.store}
                            </span>
                          )}
                          {selectedItem.wasCents && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              On Sale
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-cozy-text-muted">Price:</span>
                          <span className="text-2xl font-bold text-cozy-primary">
                            ${(selectedItem.nowCents / 100).toFixed(2)}
                          </span>
                        </div>
                        
                        {selectedItem.wasCents && (
                          <div className="flex items-center justify-between">
                            <span className="text-cozy-text-muted">Was:</span>
                            <span className="text-sm text-cozy-text-muted line-through">
                              ${(selectedItem.wasCents / 100).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {selectedItem.url && (
                        <div className="pt-4">
                          <a
                            href={selectedItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cozy-primary hover:text-cozy-primary-deep text-sm underline"
                          >
                            View on {selectedItem.store} →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="border-t border-cozy-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    setShowItemModal(false)
                    setSelectedItem(null)
                  }}
                  variant="outline"
                  className="border-cozy-gray-300 hover:bg-cozy-cream flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Add to List button clicked', selectedItem)
                    handleAddToCart(selectedItem)
                  }}
                  disabled={itemLoading || !selectedListId}
                  className="bg-cozy-primary hover:bg-cozy-primary-deep flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to List
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List creation is now handled by ListPicker component */}
    </ModernAppShell>
  )
}