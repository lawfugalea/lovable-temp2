import React, { useState } from 'react'
import { 
  Plus, 
  Check, 
  Trash2, 
  ShoppingCart,
  Search,
  Filter,
  Star
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface ShoppingItem {
  id: string
  name: string
  done: boolean
  emoji: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
  addedAt: Date
}

const categories = [
  { name: 'All', emoji: '🛒' },
  { name: 'Groceries', emoji: '🥬' },
  { name: 'Household', emoji: '🏠' },
  { name: 'Personal', emoji: '👤' },
  { name: 'Other', emoji: '📦' },
]

export default function ModernShopping() {
  const [newItem, setNewItem] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<ShoppingItem[]>([
    { 
      id: '1', 
      name: 'Fresh milk', 
      done: false, 
      emoji: '🥛',
      category: 'Groceries',
      priority: 'high',
      addedAt: new Date()
    },
    { 
      id: '2', 
      name: 'Cozy bread', 
      done: true, 
      emoji: '🍞',
      category: 'Groceries',
      priority: 'medium',
      addedAt: new Date()
    },
    { 
      id: '3', 
      name: 'Sweet apples', 
      done: false, 
      emoji: '🍎',
      category: 'Groceries',
      priority: 'low',
      addedAt: new Date()
    },
    { 
      id: '4', 
      name: 'Toilet paper', 
      done: false, 
      emoji: '🧻',
      category: 'Household',
      priority: 'high',
      addedAt: new Date()
    },
  ])

  const addItem = () => {
    if (newItem.trim()) {
      const newShoppingItem: ShoppingItem = {
        id: Date.now().toString(),
        name: newItem,
        done: false,
        emoji: '🛒',
        category: 'Other',
        priority: 'medium',
        addedAt: new Date()
      }
      setItems([...items, newShoppingItem])
      setNewItem('')
    }
  }

  const toggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ))
  }

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const activeItems = filteredItems.filter(item => !item.done)
  const completedItems = filteredItems.filter(item => item.done)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-cozy-gray-100 text-cozy-text-muted border-cozy-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-cozy-fade-in">
        <h1 className="text-3xl font-bold text-cozy-text mb-2 flex items-center gap-3">
          <span className="animate-cozy-wiggle">🛒</span>
          Shopping List
        </h1>
        <p className="text-cozy-text-muted">
          Your shared family list, organized with love
        </p>
      </div>

      {/* Quick Add */}
      <Card className="animate-cozy-bounce-in" style={{ animationDelay: '200ms' }}>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="🛒 Add something lovely..."
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
            />
            <Button onClick={addItem} className="bg-cozy-primary hover:bg-cozy-primary-deep">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 animate-cozy-bounce-in" style={{ animationDelay: '300ms' }}>
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
            <div className="text-2xl font-bold text-cozy-sage">{completedItems.length}</div>
            <div className="text-sm text-cozy-text-muted flex items-center justify-center gap-1">
              <Check className="w-4 h-4" />
              Done
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="animate-cozy-bounce-in" style={{ animationDelay: '400ms' }}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cozy-text-muted w-4 h-4" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.name)}
                  className="flex items-center gap-2"
                >
                  <span>{category.emoji}</span>
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card className="animate-cozy-bounce-in" style={{ animationDelay: '500ms' }}>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-lg font-semibold text-cozy-text mb-2">Your list is empty!</h3>
            <p className="text-cozy-text-muted mb-4">
              Add your first item above to start your cozy shopping journey
            </p>
            <Button onClick={() => setNewItem('')} className="bg-cozy-primary hover:bg-cozy-primary-deep">
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-cozy-bounce-in" style={{ animationDelay: '500ms' }}>
          <CardContent className="p-0">
            <div className="divide-y divide-cozy-gray-200">
              {filteredItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="px-6 py-4 hover:bg-cozy-cream/50 transition-all group animate-cozy-bounce-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        item.done 
                          ? 'bg-cozy-primary border-cozy-primary text-white' 
                          : 'border-cozy-gray-300 hover:border-cozy-primary'
                      }`}
                    >
                      {item.done && <Check className="w-3 h-3" />}
                    </button>
                    
                    <span className="text-2xl group-hover:animate-cozy-wiggle">
                      {item.emoji}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <span className={`${item.done ? 'line-through text-cozy-text-soft' : 'text-cozy-text'} font-medium`}>
                        {item.name}
                      </span>
                      {item.category && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.priority && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(item.priority)}`}
                        >
                          {item.priority}
                        </Badge>
                      )}
                      
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1 text-cozy-text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {activeItems.length > 0 && (
        <Card className="animate-cozy-bounce-in" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                Mark All Done
              </Button>
              <Button variant="outline" size="sm">
                Clear Completed
              </Button>
              <Button variant="outline" size="sm">
                Export List
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
