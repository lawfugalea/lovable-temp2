import React, { useState } from 'react'
import FunButton from '../components/ui/FunButton'
import FunCard from '../components/ui/FunCard'
import EmptyState from '../components/ui/EmptyState'

export default function ShoppingPage() {
  const [newItem, setNewItem] = useState('')
  const [items, setItems] = useState([
    { id: 1, name: 'Fresh milk', done: false, emoji: '🥛' },
    { id: 2, name: 'Cozy bread', done: true, emoji: '🍞' },
    { id: 3, name: 'Sweet apples', done: false, emoji: '🍎' },
  ])

  const addItem = () => {
    if (newItem.trim()) {
      setItems([...items, { 
        id: Date.now(), 
        name: newItem, 
        done: false, 
        emoji: '🛒' 
      }])
      setNewItem('')
    }
  }

  const toggleItem = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ))
  }

  const activeItems = items.filter(item => !item.done)
  const completedItems = items.filter(item => item.done)

  return (
    <div className="space-y-6">
      <div className="text-center animate-cozy-bounce-in">
        <h1 className="text-3xl font-bold text-cozy-text mb-2 flex items-center justify-center gap-3">
          <span className="animate-cozy-wiggle">🛒</span>
          Cozy Shopping
          <span className="animate-cozy-pulse-gentle">✨</span>
        </h1>
        <p className="text-cozy-text-muted">Your shared family list, organized with love</p>
      </div>

      {/* Quick Add */}
      <FunCard className="p-6 animate-cozy-bounce-in animation-delay-200">
        <div className="flex gap-3">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="🛒 Add something lovely..."
            className="flex-1 rounded-cozy border border-cozy-gray-300 bg-cozy-surface px-4 py-3 text-cozy-text focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all"
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
          />
          <FunButton onClick={addItem} emoji="✨" celebration>
            Add
          </FunButton>
        </div>
      </FunCard>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 animate-cozy-bounce-in animation-delay-300">
        <FunCard className="p-4 text-center">
          <div className="text-2xl font-bold text-cozy-primary">{activeItems.length}</div>
          <div className="text-sm text-cozy-text-muted flex items-center justify-center gap-1">
            <span>🛒</span> To buy
          </div>
        </FunCard>
        <FunCard className="p-4 text-center">
          <div className="text-2xl font-bold text-cozy-sage">{completedItems.length}</div>
          <div className="text-sm text-cozy-text-muted flex items-center justify-center gap-1">
            <span>✅</span> Done
          </div>
        </FunCard>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <EmptyState 
          title="Your list is empty!"
          description="Add your first item above to start your cozy shopping journey"
          emoji="🛒"
          illustration="shopping"
        />
      ) : (
        <FunCard className="p-0 animate-cozy-bounce-in animation-delay-400">
          <ul className="divide-y divide-cozy-gray-200">
            {items.map((item, index) => (
              <li 
                key={item.id} 
                className="px-6 py-4 hover:bg-cozy-cream/50 transition-all group animate-cozy-bounce-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleItem(item.id)}
                    className="h-5 w-5 rounded accent-cozy-primary"
                  />
                  <span className="text-2xl cozy-emoji group-hover:animate-cozy-wiggle">
                    {item.emoji}
                  </span>
                  <span className={`flex-1 ${item.done ? 'line-through text-cozy-text-soft' : 'text-cozy-text'}`}>
                    {item.name}
                  </span>
                  {item.done && (
                    <span className="animate-cozy-pulse-gentle">✨</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </FunCard>
      )}
    </div>
  )
}