import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ModernAppShell from '../components/ModernAppShell'
import { usePageState } from '../hooks/usePageState'
import { Button } from '../components/ui/Button'
import { 
  Plus, 
  Gift, 
  Trash2,
  Search,
  List,
  CheckSquare,
  Square,
  X
} from 'lucide-react'

interface Gift {
  id: string
  title: string
  price?: number
  currency: string
  link?: string
  requestedBy: string
  claimedBy?: string
  isClaimed: boolean
  createdAt: string
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange'
  type: 'note' | 'list'
  listItems?: Array<{
    id: string
    text: string
    completed: boolean
  }>
}

interface GiftWishlistState {
  gifts: Gift[]
}

export default function GiftWishlistPage() {
  const { data: session, status } = useSession()
  const [householdId, setHouseholdId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load gift wishlist data using usePageState
  const {
    value: wishlistState,
    setValue: setWishlistState,
    loading: psLoading,
    saving: psSaving,
    error: psError,
  } = usePageState<GiftWishlistState>({
    householdId,
    page: 'gift-wishlist',
    initial: {
      gifts: []
    },
    saveDelayMs: 700,
  })

  // Get household ID
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/household/active')
        .then(res => res.json())
        .then(data => {
          if (data.householdId) {
            setHouseholdId(data.householdId)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status])

  // Save gift wishlist data
  const saveWishlistData = (newState: Partial<GiftWishlistState>) => {
    const state: GiftWishlistState = {
      gifts: wishlistState?.gifts || [],
      ...newState
    }
    setWishlistState(state)
  }

  // Get filtered gifts (for future search functionality)
  const filteredGifts = wishlistState?.gifts || []
  
  // State for triggering add note
  const [triggerAddNote, setTriggerAddNote] = useState(false)

  // Gift management functions
  const addGift = (gift: Omit<Gift, 'id' | 'createdAt' | 'isClaimed'>) => {
    const newGift: Gift = {
      ...gift,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isClaimed: false
    }
    const newGifts = [...(wishlistState?.gifts || []), newGift]
    saveWishlistData({ gifts: newGifts })
  }

  const updateGift = (id: string, updates: Partial<Gift>) => {
    const newGifts = (wishlistState?.gifts || []).map(gift => 
      gift.id === id ? { ...gift, ...updates } : gift
    )
    saveWishlistData({ gifts: newGifts })
  }

  const deleteGift = (id: string) => {
    const newGifts = (wishlistState?.gifts || []).filter(gift => gift.id !== id)
    saveWishlistData({ gifts: newGifts })
  }

  const claimGift = (id: string) => {
    const gift = (wishlistState?.gifts || []).find(g => g.id === id)
    if (gift) {
      updateGift(id, { 
        isClaimed: !gift.isClaimed,
        claimedBy: !gift.isClaimed ? session?.user?.name || 'Someone' : undefined
      })
    }
  }

  // Get Google Keep-style note classes
  const getKeepNoteClasses = (color: string, isClaimed: boolean) => {
    const baseClasses = "group relative rounded-lg shadow-sm border border-gray-200 cursor-pointer min-h-[120px] max-w-[300px]"
    const claimedClasses = isClaimed ? "opacity-60 grayscale" : ""
    
    const colorClasses = {
      yellow: "bg-yellow-100",
      pink: "bg-pink-100", 
      blue: "bg-blue-100",
      green: "bg-green-100",
      purple: "bg-purple-100",
      orange: "bg-orange-100"
    }
    
    return `${baseClasses} ${colorClasses[color as keyof typeof colorClasses]} ${claimedClasses}`
  }

  // Enhanced Google Keep-style Note Component with List Support
  const KeepNote = ({ gift, onSave, onDelete, triggerFocus }: {
    gift?: Gift
    onSave: (gift: Omit<Gift, 'id' | 'createdAt' | 'isClaimed'>) => void
    onDelete?: () => void
    triggerFocus?: boolean
  }) => {
    const [title, setTitle] = useState(gift?.title || '')
    const [price, setPrice] = useState(gift?.price ? gift.price.toString() : '')
    const [link, setLink] = useState(gift?.link || '')
    const [color, setColor] = useState(gift?.color || 'yellow')
    const [type, setType] = useState<'note' | 'list'>(gift?.type || 'note')
    const [listItems, setListItems] = useState<Array<{id: string, text: string, completed: boolean}>>(
      gift?.listItems || [{ id: '1', text: '', completed: false }]
    )
    const [isExpanded, setIsExpanded] = useState(false)
    const [isEditing, setIsEditing] = useState(!gift)

    // Handle trigger focus
    useEffect(() => {
      if (triggerFocus && !gift) {
        setIsExpanded(true)
        setIsEditing(true)
      }
    }, [triggerFocus, gift])

    const handleSave = () => {
      if (title.trim()) {
        onSave({
          title: title.trim(),
          price: parseFloat(price) || 0,
          currency: 'EUR',
          link: link.trim(),
          requestedBy: session?.user?.name || 'Someone',
          color,
          type,
          listItems: type === 'list' ? listItems.filter(item => item.text.trim()) : undefined
        })
        if (!gift) {
          setTitle('')
          setPrice('')
          setLink('')
          setListItems([{ id: '1', text: '', completed: false }])
          setIsExpanded(false)
          setIsEditing(false)
        }
      }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isExpanded) {
        setIsExpanded(true)
      } else if (e.key === 'Escape') {
        if (gift) {
          setIsEditing(false)
        } else {
          onDelete?.()
        }
      }
    }

    const handleClick = () => {
      if (gift) {
        setIsEditing(true)
      }
    }

    const addListItem = () => {
      const newId = (listItems.length + 1).toString()
      setListItems([...listItems, { id: newId, text: '', completed: false }])
    }

    const updateListItem = (id: string, text: string) => {
      setListItems(listItems.map(item => 
        item.id === id ? { ...item, text } : item
      ))
    }

    const toggleListItem = (id: string) => {
      setListItems(listItems.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      ))
    }

    const removeListItem = (id: string) => {
      if (listItems.length > 1) {
        setListItems(listItems.filter(item => item.id !== id))
      }
    }

    return (
      <div 
        className={`${getKeepNoteClasses(color, gift?.isClaimed || false)} transition-all duration-200 ${
          isEditing ? 'shadow-lg scale-105' : 'hover:shadow-md'
        }`}
        onClick={handleClick}
      >
        {/* Google Keep-style note content */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => {
                setIsExpanded(true)
                setIsEditing(true)
              }}
              placeholder="Take a note..."
              className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder-gray-500 resize-none focus:ring-0 focus:border-none"
              autoFocus={!gift}
            />
            {gift && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="ml-2 text-gray-400 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {(isExpanded || gift) && (
            <div className="mt-2 space-y-1">
              {/* Type selector */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setType('note')
                  }}
                  className={`text-xs px-2 py-1 rounded ${
                    type === 'note' ? 'bg-cozy-primary text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Note
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setType('list')
                  }}
                  className={`text-xs px-2 py-1 rounded ${
                    type === 'list' ? 'bg-cozy-primary text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <List className="w-3 h-3 inline mr-1" />
                  List
                </button>
              </div>

              {type === 'note' ? (
                <>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="€ Price"
                    className="w-full bg-transparent border-none outline-none text-xs placeholder-gray-400"
                  />
                  
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="🔗 Link"
                    className="w-full bg-transparent border-none outline-none text-xs placeholder-gray-400"
                  />
                </>
              ) : (
                <div className="space-y-1">
                  {listItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleListItem(item.id)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {item.completed ? (
                          <CheckSquare className="w-4 h-4 text-green-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateListItem(item.id, e.target.value)}
                        placeholder={`Item ${index + 1}`}
                        className="flex-1 bg-transparent border-none outline-none text-xs placeholder-gray-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addListItem()
                          }
                        }}
                      />
                      {listItems.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeListItem(item.id)
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      addListItem()
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add item
                  </button>
                </div>
              )}
              
              {gift && (
                <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                  <span>by {gift.requestedBy}</span>
                  {gift.claimedBy && gift.isClaimed && (
                    <span className="text-green-600">✓ Claimed by {gift.claimedBy}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Google Keep-style bottom bar */}
        {(isExpanded || isEditing) && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
            <div className="flex gap-1">
              {(['yellow', 'pink', 'blue', 'green', 'purple', 'orange'] as const).map((c) => (
                <button
                  key={c}
                  onClick={(e) => {
                    e.stopPropagation()
                    setColor(c)
                  }}
                  className={`w-4 h-4 rounded-full border ${
                    color === c ? 'border-gray-600' : 'border-gray-300'
                  } ${c === 'yellow' ? 'bg-yellow-200' : 
                    c === 'pink' ? 'bg-pink-200' :
                    c === 'blue' ? 'bg-blue-200' :
                    c === 'green' ? 'bg-green-200' :
                    c === 'purple' ? 'bg-purple-200' :
                    'bg-orange-200'}`}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              {gift && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    claimGift(gift.id)
                  }}
                  className={`text-xs px-2 py-1 rounded ${
                    gift.isClaimed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {gift.isClaimed ? 'Claimed' : 'Claim'}
                </button>
              )}
              
              {gift && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSave()
                }}
                className="text-xs px-2 py-1 bg-cozy-primary text-white rounded hover:bg-cozy-primary/90"
              >
                {gift ? 'Close' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <ModernAppShell title="Gift Wishlist">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cozy-text-muted">Loading your gift wishlist...</p>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <ModernAppShell title="Gift Wishlist">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Authentication Required</h2>
            <p className="text-cozy-text-muted mb-4">
              You need to be logged in to access your family's gift wishlist.
            </p>
            <Button 
              onClick={() => window.location.href = '/api/auth/signin'}
              className="bg-cozy-primary hover:bg-cozy-primary/90 text-white"
            >
              Sign In to Continue
            </Button>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (!householdId) {
    return (
      <ModernAppShell title="Gift Wishlist">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Setting Up Your Wishlist</h2>
            <p className="text-cozy-text-muted mb-4">
              We're setting up your family's gift wishlist. This may take a moment.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-cozy-text-muted">
              <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Initializing...</span>
            </div>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  if (psError) {
    return (
      <ModernAppShell title="Gift Wishlist">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-cozy-text mb-2">Unable to Load Wishlist</h2>
            <p className="text-cozy-text-muted mb-4">
              We encountered an issue while loading your gift wishlist.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()}
                className="bg-cozy-primary hover:bg-cozy-primary/90 text-white mr-2"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </ModernAppShell>
    )
  }

  return (
    <ModernAppShell title="Gift Wishlist">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Google Keep-style Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">🎁</span>
              </div>
              <h1 className="text-2xl font-normal text-gray-800">Gift Wishlist</h1>
            </div>
            {psSaving && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            )}
          </div>

          {/* Google Keep-style Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search your gift notes..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cozy-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Add Note Button */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setTriggerAddNote(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cozy-primary text-white rounded-lg hover:bg-cozy-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Note
              </button>
              <span className="text-sm text-gray-500">
                Or click "Take a note..." below to start typing
              </span>
            </div>
          </div>

          {/* Google Keep-style Add Note */}
          <div className="mb-6">
            <KeepNote
              gift={undefined}
              onSave={(giftData) => {
                addGift(giftData)
                setTriggerAddNote(false)
              }}
              onDelete={() => {}}
              triggerFocus={triggerAddNote}
            />
          </div>

          {/* Google Keep-style Notes Grid */}
          <div className="min-h-[400px]">
            {filteredGifts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-xl font-normal text-gray-600 mb-2">No notes yet</h3>
                <p className="text-gray-500">
                  Start by adding a note above!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredGifts.map((gift) => (
                  <KeepNote
                    key={gift.id}
                    gift={gift}
                    onSave={(giftData) => {
                      updateGift(gift.id, giftData)
                    }}
                    onDelete={() => deleteGift(gift.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModernAppShell>
  )
}