import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface CollabProvider {
  connect(docId: string): Promise<void>
  disconnect(): void
  getDocument(): Y.Doc
  getAwareness(): any
  isConnected(): boolean
  onStatusChange(callback: (status: 'connected' | 'disconnected') => void): void
  offStatusChange(callback: (status: 'connected' | 'disconnected') => void): void
}

export class YjsCollabProvider implements CollabProvider {
  private doc: Y.Doc
  private wsProvider: WebsocketProvider | null = null
  private indexeddbProvider: IndexeddbPersistence | null = null
  private statusCallbacks: Set<(status: 'connected' | 'disconnected') => void> = new Set()
  private currentDocId: string | null = null

  constructor() {
    this.doc = new Y.Doc()
  }

  async connect(docId: string): Promise<void> {
    if (this.currentDocId === docId && this.wsProvider) {
      return // Already connected to this document
    }

    // Disconnect from previous document if any
    this.disconnect()

    this.currentDocId = docId
    const roomName = `note:${docId}`

    // Get WebSocket URL from environment
    const wsUrl = process.env.NEXT_PUBLIC_YWS_URL || 'ws://localhost:1234'

    // Create WebSocket provider for real-time collaboration
    this.wsProvider = new WebsocketProvider(wsUrl, roomName, this.doc, {
      connect: true,
      // awareness: {
      //   user: {
      //     name: 'Anonymous User', // This will be updated with actual user info
      //     color: '#ff6b6b'
      //   }
      // }
    })

    // Create IndexedDB provider for offline persistence
    this.indexeddbProvider = new IndexeddbPersistence(roomName, this.doc)

    // Set up status change listeners
    this.wsProvider.on('status', (event: { status: string }) => {
      const status = event.status === 'connected' ? 'connected' : 'disconnected'
      this.statusCallbacks.forEach(callback => callback(status))
    })

    // Wait for IndexedDB to be ready
    await new Promise<void>((resolve) => {
      if (this.indexeddbProvider) {
        this.indexeddbProvider.on('synced', () => {
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  disconnect(): void {
    if (this.wsProvider) {
      this.wsProvider.destroy()
      this.wsProvider = null
    }
    if (this.indexeddbProvider) {
      this.indexeddbProvider.destroy()
      this.indexeddbProvider = null
    }
    this.currentDocId = null
  }

  getDocument(): Y.Doc {
    return this.doc
  }

  getAwareness(): any {
    return this.wsProvider?.awareness || null
  }

  isConnected(): boolean {
    return this.wsProvider?.wsconnected || false
  }

  onStatusChange(callback: (status: 'connected' | 'disconnected') => void): void {
    this.statusCallbacks.add(callback)
  }

  offStatusChange(callback: (status: 'connected' | 'disconnected') => void): void {
    this.statusCallbacks.delete(callback)
  }

  // Update user info in awareness
  updateUserInfo(userInfo: { name: string; color: string; userId: string }): void {
    if (this.wsProvider?.awareness) {
      this.wsProvider.awareness.setLocalStateField('user', userInfo)
    }
  }
}

// Singleton instance
let collabProviderInstance: YjsCollabProvider | null = null

export function getCollabProvider(): YjsCollabProvider {
  if (!collabProviderInstance) {
    collabProviderInstance = new YjsCollabProvider()
  }
  return collabProviderInstance
}

// Utility function to generate a unique document ID
export function generateCollabDocId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

