import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CustomTaskItem from './CustomTaskItem'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
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
// import { getCollabProvider, generateCollabDocId } from '@/lib/collaboration'
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
  const [, forceUpdate] = useState({})
  const [toolbarUpdateTrigger, setToolbarUpdateTrigger] = useState(0)
  // const collabProvider = useRef(getCollabProvider())
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        // history: false, // Disable built-in history for collaboration
        // Disable extensions that we're configuring separately
        underline: false, // We're using our own Underline extension
        link: false, // We're using our own Link extension
        // Ensure all other extensions are enabled
        bold: {},
        italic: {},
        strike: {},
        code: {},
        heading: {},
        bulletList: {},
        orderedList: {},
        blockquote: {},
        hardBreak: {},
        horizontalRule: {},
        codeBlock: {},
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose',
        },
        itemTypeName: 'taskItem',
      }),
      CustomTaskItem.configure({
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
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
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
      // Update active states immediately
      updateActiveStates()
      
      if (onUpdate) {
        const json = editor.getJSON()
        const text = editor.getText()
        onUpdate(json, text)
      }
    },
    onSelectionUpdate: () => {
      // Update active states when selection changes
      updateActiveStates()
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] focus:ring-2 focus:ring-cozy-primary/20 focus:border-cozy-primary/30 ${className}`,
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

  // Update active states immediately when editor changes
  const updateActiveStates = useCallback(() => {
    if (!editor) return
    
    const newStates = {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      highlight: editor.isActive('highlight'),
      heading1: editor.isActive('heading', { level: 1 }),
      heading2: editor.isActive('heading', { level: 2 }),
      heading3: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      taskList: editor.isActive('taskList'),
      blockquote: editor.isActive('blockquote'),
      link: editor.isActive('link'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo()
    }
    
    setActiveStates(newStates)
  }, [editor])

  // Connect to collaboration when collabDocId is provided
  // useEffect(() => {
  //   if (collabDocId && editor) {
  //     setConnectionStatus('connecting')
      
  //     collabProvider.current.connect(collabDocId).then(() => {
  //       setConnectionStatus('connected')
  //       setIsConnected(true)
        
  //       // Update user info if provided
  //       if (userInfo) {
  //         collabProvider.current.updateUserInfo(userInfo)
  //       }
  //     }).catch((error) => {
  //       console.error('Failed to connect to collaboration:', error)
  //       setConnectionStatus('disconnected')
  //       setIsConnected(false)
  //     })

  //     // Listen for status changes
  //     const handleStatusChange = (status: 'connected' | 'disconnected') => {
  //       setIsConnected(status === 'connected')
  //       setConnectionStatus(status)
  //     }

  //     collabProvider.current.onStatusChange(handleStatusChange)

  //     return () => {
  //       collabProvider.current.offStatusChange(handleStatusChange)
  //     }
  //   }
  // }, [collabDocId, editor, userInfo])

  // // Cleanup on unmount
  // useEffect(() => {
  //   return () => {
  //     if (collabDocId) {
  //       collabProvider.current.disconnect()
  //     }
  //   }
  // }, [collabDocId])

  // Memoized button handlers for better performance
  const toggleBold = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleBold().run()
    // Force immediate state update
    setActiveStates(prev => ({
      ...prev,
      bold: editor.isActive('bold')
    }))
  }, [editor])

  const toggleItalic = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleItalic().run()
    setActiveStates(prev => ({
      ...prev,
      italic: editor.isActive('italic')
    }))
  }, [editor])

  const toggleUnderline = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleUnderline().run()
    setActiveStates(prev => ({
      ...prev,
      underline: editor.isActive('underline')
    }))
  }, [editor])

  const toggleStrike = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleStrike().run()
    setActiveStates(prev => ({
      ...prev,
      strike: editor.isActive('strike')
    }))
  }, [editor])

  const toggleCode = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleCode().run()
    setActiveStates(prev => ({
      ...prev,
      code: editor.isActive('code')
    }))
  }, [editor])

  const toggleHighlight = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleHighlight().run()
    setActiveStates(prev => ({
      ...prev,
      highlight: editor.isActive('highlight')
    }))
  }, [editor])

  const toggleHeading1 = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleHeading({ level: 1 }).run()
    setActiveStates(prev => ({
      ...prev,
      heading1: editor.isActive('heading', { level: 1 }),
      heading2: false,
      heading3: false
    }))
  }, [editor])

  const toggleHeading2 = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleHeading({ level: 2 }).run()
    setActiveStates(prev => ({
      ...prev,
      heading1: false,
      heading2: editor.isActive('heading', { level: 2 }),
      heading3: false
    }))
  }, [editor])

  const toggleHeading3 = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleHeading({ level: 3 }).run()
    setActiveStates(prev => ({
      ...prev,
      heading1: false,
      heading2: false,
      heading3: editor.isActive('heading', { level: 3 })
    }))
  }, [editor])

  const toggleBulletList = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleBulletList().run()
    setActiveStates(prev => ({
      ...prev,
      bulletList: editor.isActive('bulletList'),
      orderedList: false,
      taskList: false
    }))
  }, [editor])

  const toggleOrderedList = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleOrderedList().run()
    setActiveStates(prev => ({
      ...prev,
      bulletList: false,
      orderedList: editor.isActive('orderedList'),
      taskList: false
    }))
  }, [editor])

  const toggleTaskList = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleTaskList().run()
    setActiveStates(prev => ({
      ...prev,
      bulletList: false,
      orderedList: false,
      taskList: editor.isActive('taskList')
    }))
  }, [editor])

  const toggleBlockquote = useCallback(() => {
    if (!editor) return
    editor.chain().focus().toggleBlockquote().run()
    setActiveStates(prev => ({
      ...prev,
      blockquote: editor.isActive('blockquote')
    }))
  }, [editor])

  const undo = useCallback(() => {
    if (!editor) return
    editor.chain().focus().undo().run()
    setActiveStates(prev => ({
      ...prev,
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo()
    }))
  }, [editor])

  const redo = useCallback(() => {
    if (!editor) return
    editor.chain().focus().redo().run()
    setActiveStates(prev => ({
      ...prev,
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo()
    }))
  }, [editor])

  const clearFormatting = useCallback(() => {
    if (!editor) return
    editor.chain().focus().clearNodes().unsetAllMarks().run()
    setActiveStates(prev => ({
      ...prev,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      code: false,
      highlight: false,
      heading1: false,
      heading2: false,
      heading3: false,
      blockquote: false,
      link: false
    }))
  }, [editor])

  const addLink = useCallback(() => {
    if (!editor) {
      console.log('Editor not available for addLink')
      return
    }
    
    const url = window.prompt('Enter URL:')
    if (url) {
      console.log('Adding link:', url)
      editor.chain().focus().setLink({ href: url }).run()
      setActiveStates(prev => ({
        ...prev,
        link: editor.isActive('link')
      }))
    }
  }, [editor])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    setActiveStates(prev => ({
      ...prev,
      link: editor.isActive('link')
    }))
  }, [editor])

  // Active states that update immediately
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    code: false,
    highlight: false,
    heading1: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    orderedList: false,
    taskList: false,
    blockquote: false,
    link: false,
    canUndo: false,
    canRedo: false
  })

  // Initialize active states when editor is ready
  useEffect(() => {
    if (editor) {
      updateActiveStates()
    }
  }, [editor, updateActiveStates])

  if (!editor) {
    return (
      <div className="min-h-[200px] p-4 border border-cozy-gray-200 rounded-lg bg-cozy-gray-100 flex items-center justify-center">
        <div className="text-cozy-text-muted">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="relative border border-cozy-gray-200 rounded-lg bg-cozy-surface">
      {/* Toolbar */}
      {isClient && editor && (
        <div className="bg-cozy-surface border-b border-cozy-gray-200 p-2 flex flex-wrap items-center gap-1 shadow-cozy-sm rounded-t-lg">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={toggleBold}
            className={`p-2 rounded transition-all duration-150 hover:bg-cozy-gray-100 hover:scale-105 active:scale-95 ${
              activeStates.bold ? 'bg-cozy-primary-soft text-cozy-primary-deep shadow-cozy-sm' : 'hover:shadow-sm'
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={toggleItalic}
            className={`p-2 rounded transition-all duration-150 hover:bg-cozy-gray-100 hover:scale-105 active:scale-95 ${
              activeStates.italic ? 'bg-cozy-primary-soft text-cozy-primary-deep shadow-cozy-sm' : 'hover:shadow-sm'
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={toggleUnderline}
            className={`p-2 rounded transition-all duration-150 hover:bg-cozy-gray-100 hover:scale-105 active:scale-95 ${
              activeStates.underline ? 'bg-cozy-primary-soft text-cozy-primary-deep shadow-cozy-sm' : 'hover:shadow-sm'
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={toggleStrike}
            className={`p-2 rounded transition-all duration-150 hover:bg-cozy-gray-100 hover:scale-105 active:scale-95 ${
              activeStates.strike ? 'bg-cozy-primary-soft text-cozy-primary-deep shadow-cozy-sm' : 'hover:shadow-sm'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            onClick={toggleCode}
            className={`p-2 rounded transition-all duration-150 hover:bg-cozy-gray-100 hover:scale-105 active:scale-95 ${
              activeStates.code ? 'bg-cozy-primary-soft text-cozy-primary-deep shadow-cozy-sm' : 'hover:shadow-sm'
            }`}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={toggleHighlight}
            className={`p-2 rounded transition-all duration-150 hover:bg-cozy-gray-100 hover:scale-105 active:scale-95 ${
              activeStates.highlight ? 'bg-cozy-primary-soft text-cozy-primary-deep shadow-cozy-sm' : 'hover:shadow-sm'
            }`}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={toggleHeading1}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              activeStates.heading1 ? 'bg-cozy-gray-200' : ''
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleHeading2}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              activeStates.heading2 ? 'bg-cozy-gray-200' : ''
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleHeading3}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              activeStates.heading3 ? 'bg-cozy-gray-200' : ''
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={toggleBulletList}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              activeStates.bulletList ? 'bg-cozy-gray-200' : ''
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={toggleOrderedList}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              activeStates.orderedList ? 'bg-cozy-gray-200' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTaskList}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              activeStates.taskList ? 'bg-cozy-gray-200' : ''
            }`}
            title="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Block Elements */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          <button
            onClick={toggleBlockquote}
            className={`p-2 rounded hover:bg-cozy-gray-100 transition-colors ${
              activeStates.blockquote ? 'bg-cozy-gray-200' : ''
            }`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Links */}
        <div className="flex items-center gap-1 border-r border-cozy-gray-200 pr-2 mr-2">
          {activeStates.link ? (
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
            onClick={undo}
            disabled={!activeStates.canUndo}
            className="p-2 rounded hover:bg-cozy-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!activeStates.canRedo}
            className="p-2 rounded hover:bg-cozy-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            onClick={clearFormatting}
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
      <div ref={editorRef} className="relative p-4 min-h-[200px] focus-within:bg-cozy-bg/50 transition-colors">
        {isClient && editor && <EditorContent editor={editor} />}
        {!isClient && (
          <div className="min-h-[200px] p-4 text-cozy-text-muted">
            Loading editor...
          </div>
        )}
      </div>

    </div>
  )
}

