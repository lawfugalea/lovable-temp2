import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Unlink,
  Highlighter,
  Undo,
  Redo,
  MoreHorizontal
} from 'lucide-react'
import { getCollabProvider, generateCollabDocId } from '@/lib/collaboration'
// import { Collaboration } from '@tiptap/extension-collaboration'
// import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor'

interface ModernTiptapEditorProps {
  content?: any
  onUpdate?: (content: any, text: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  collabDocId?: string
  userInfo?: {
    name: string
    color: string
    userId: string
  }
}

export default function ModernTiptapEditor({
  content,
  onUpdate,
  placeholder = "Start writing...",
  editable = true,
  className = "",
  collabDocId,
  userInfo
}: ModernTiptapEditorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [isClient, setIsClient] = useState(false)
  const collabProvider = useRef(getCollabProvider())
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // history: false, // Disable built-in history for collaboration
        // Disable extensions that we're configuring separately
        underline: false, // We're using our own Underline extension
        highlight: false, // We're using our own Highlight extension
        link: false, // We're using our own Link extension
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose',
        },
        itemTypeName: 'taskItem',
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
      }),
      ...(collabDocId ? [
        // Collaboration.configure({
        //   document: collabProvider.current.getDocument(),
        // }),
        // CollaborationCursor.configure({
        //   provider: collabProvider.current,
        //   user: userInfo || {
        //     name: 'Anonymous',
        //     color: '#ff6b6b',
        //   },
        // }),
      ] : []),
    ],
    content: content || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        const json = editor.getJSON()
        const text = editor.getText()
        onUpdate(json, text)
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] ${className}`,
        'data-placeholder': placeholder,
      },
      handleKeyDown: (view, event) => {
        // Add keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 'k':
              event.preventDefault()
              addLink()
              return true
          }
        }
        return false
      },
    },
  })

  // Connect to collaboration when collabDocId is provided
  useEffect(() => {
    if (collabDocId && editor) {
      setConnectionStatus('connecting')
      
      collabProvider.current.connect(collabDocId).then(() => {
        setConnectionStatus('connected')
        setIsConnected(true)
        
        // Update user info if provided
        if (userInfo) {
          collabProvider.current.updateUserInfo(userInfo)
        }
      }).catch((error) => {
        console.error('Failed to connect to collaboration:', error)
        setConnectionStatus('disconnected')
        setIsConnected(false)
      })

      // Listen for status changes
      const handleStatusChange = (status: 'connected' | 'disconnected') => {
        setIsConnected(status === 'connected')
        setConnectionStatus(status)
      }

      collabProvider.current.onStatusChange(handleStatusChange)

      return () => {
        collabProvider.current.offStatusChange(handleStatusChange)
      }
    }
  }, [collabDocId, editor, userInfo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (collabDocId) {
        collabProvider.current.disconnect()
      }
    }
  }, [collabDocId])

  const addLink = useCallback(() => {
    if (!editor) {
      console.log('Editor not available for addLink')
      return
    }
    
    const url = window.prompt('Enter URL:')
    if (url) {
      console.log('Adding link:', url)
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
  }, [editor])

  if (!editor) {
    return (
      <div className="min-h-[200px] p-4 border border-cozy-gray-200 rounded-lg bg-cozy-gray-100 flex items-center justify-center">
        <div className="text-cozy-text-muted">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      {isClient && editor && (
        <div className="sticky top-0 z-10 bg-cozy-surface border-b border-cozy-gray-200 p-2 flex flex-wrap items-center gap-1 mb-4 shadow-cozy-sm">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('bold') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('italic') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('underline') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('strike') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('code') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('highlight') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-cozy-gray-200' : ''
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-cozy-gray-200' : ''
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('heading', { level: 3 }) ? 'bg-cozy-gray-200' : ''
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('bulletList') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('orderedList') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              console.log('Task list button clicked')
              editor.chain().focus().toggleTaskList().run()
            }}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('taskList') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Block Elements */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              editor.isActive('blockquote') ? 'bg-cozy-gray-200' : ''
            }`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Links */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          {editor.isActive('link') ? (
            <button
              onClick={removeLink}
              className="p-2 rounded hover:bg-cozy-gray-100 transition-colors"
              title="Remove Link"
            >
              <Unlink className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={addLink}
              className="p-2 rounded hover:bg-cozy-gray-100 transition-colors"
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* History & Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-cozy-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-cozy-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className="p-2 rounded hover:bg-cozy-gray-100 transition-colors"
            title="Clear Formatting"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Collaboration Status - Temporarily disabled */}
        {/* {collabDocId && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span>
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        )} */}
        </div>
      )}

      {/* Bubble Menu - Temporarily disabled */}
      {/* <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center gap-1"
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-200' : ''
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-200' : ''
          }`}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('underline') ? 'bg-gray-200' : ''
          }`}
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('highlight') ? 'bg-gray-200' : ''
          }`}
        >
          <Highlighter className="w-4 h-4" />
        </button>
        <button
          onClick={addLink}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </BubbleMenu> */}

      {/* Editor Content */}
      <div ref={editorRef} className="relative">
        {isClient && editor && <EditorContent editor={editor} />}
        {!isClient && (
          <div className="min-h-[200px] p-4 text-cozy-text-muted">
            Loading editor...
          </div>
        )}
      </div>

      {/* Placeholder */}
      {isClient && editor && editor.isEmpty && (
        <div className="absolute top-0 left-0 text-cozy-text-muted pointer-events-none select-none">
          {placeholder}
        </div>
      )}
    </div>
  )
}

