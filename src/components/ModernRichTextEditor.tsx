import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Code, 
  Quote, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Code2, 
  Minus, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Type,
  MoreHorizontal,
  X
} from 'lucide-react'
import { Button } from './ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/DropdownMenu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/Tooltip'

interface ModernRichTextEditorProps {
  content?: any
  onUpdate?: (content: any, text: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export default function ModernRichTextEditor({ 
  content, 
  onUpdate, 
  placeholder = "Start writing your note...",
  editable = true,
  className = ""
}: ModernRichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false)
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState({ top: 0, left: 0 })
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const floatingToolbarRef = useRef<HTMLDivElement>(null)

  const lowlight = createLowlight(common)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const text = editor.getText()
      onUpdate?.(json, text)
    },
    onSelectionUpdate: ({ editor }) => {
      if (!isMobile || !editor.state.selection.empty) return
      
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      const container = editorContainerRef.current
      
      if (!container) return

      // Show floating toolbar when text is selected
      if (!editor.state.selection.empty) {
        const rect = container.getBoundingClientRect()
        setFloatingToolbarPosition({
          top: coords.top - rect.top - 50,
          left: Math.min(coords.left - rect.left, rect.width - 200)
        })
        setShowFloatingToolbar(true)
      } else {
        setShowFloatingToolbar(false)
      }
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-cozy-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
        nested: true,
      }),
      Underline,
      HorizontalRule,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-100 rounded-md p-4 font-mono text-sm',
        },
      }),
    ],
    content: content || '',
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 sm:p-6',
      },
      handlePaste: (view, event, slice) => {
        const items = Array.from(event.clipboardData?.items || [])
        
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              handleImageUpload(file)
            }
            return true
          }
        }
        
        return false
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer) {
          const files = Array.from(event.dataTransfer.files)
          const imageFiles = files.filter(file => file.type.startsWith('image/'))
          
          if (imageFiles.length > 0) {
            event.preventDefault()
            handleImageUpload(imageFiles[0])
            return true
          }
        }
        
        return false
      },
    },
  })

  // Mobile keyboard handling
  useEffect(() => {
    if (!editor || !editorContainerRef.current || !isMobile) return

    const handleSelectionUpdate = () => {
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      const container = editorContainerRef.current
      
      if (!container) return

      const viewportHeight = window.innerHeight
      const isCursorInKeyboardArea = coords.top > viewportHeight * 0.4
      
      if (isCursorInKeyboardArea) {
        const targetCursorPosition = viewportHeight * 0.25
        const scrollAmount = coords.top - targetCursorPosition
        
        container.scrollTo({
          top: container.scrollTop + scrollAmount,
          behavior: 'smooth'
        })
      }
    }

    const handleResize = () => {
      setTimeout(handleSelectionUpdate, 100)
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    window.addEventListener('resize', handleResize)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      window.removeEventListener('resize', handleResize)
    }
  }, [editor, isMobile])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/uploads/note-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.status}`)
      }

      const result = await response.json()
      editor.chain().focus().setImage({ src: result.url }).run()
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setIsUploading(false)
    }
  }, [editor])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file)
    }
  }, [handleImageUpload])

  const insertLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return (
      <div className="min-h-[200px] p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    icon: Icon, 
    tooltip, 
    disabled = false,
    className = ""
  }: {
    onClick: () => void
    isActive?: boolean
    icon: React.ComponentType<{ className?: string }>
    tooltip: string
    disabled?: boolean
    className?: string
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${isActive ? 'bg-cozy-primary text-white' : ''} ${className}`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  const FormatMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Type className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent  className="w-48">
        <DropdownMenuItem onClick={() => {
          editor.chain().focus().toggleHeading({ level: 1 }).run()
          setShowFormatMenu(false)
        }}>
          <Heading1 className="h-4 w-4 mr-2" />
          Heading 1
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          editor.chain().focus().toggleHeading({ level: 2 }).run()
          setShowFormatMenu(false)
        }}>
          <Heading2 className="h-4 w-4 mr-2" />
          Heading 2
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          editor.chain().focus().toggleHeading({ level: 3 }).run()
          setShowFormatMenu(false)
        }}>
          <Heading3 className="h-4 w-4 mr-2" />
          Heading 3
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          editor.chain().focus().toggleBlockquote().run()
          setShowFormatMenu(false)
        }}>
          <Quote className="h-4 w-4 mr-2" />
          Quote
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          editor.chain().focus().toggleCodeBlock().run()
          setShowFormatMenu(false)
        }}>
          <Code2 className="h-4 w-4 mr-2" />
          Code Block
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const FloatingToolbar = () => {
    if (!showFloatingToolbar || !isMobile) return null

    return (
      <div
        ref={floatingToolbarRef}
        className="fixed z-50 flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg"
        style={{
          top: floatingToolbarPosition.top,
          left: floatingToolbarPosition.left,
        }}
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={Bold}
          tooltip="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={Italic}
          tooltip="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          icon={UnderlineIcon}
          tooltip="Underline"
        />
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={List}
          tooltip="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          icon={CheckSquare}
          tooltip="Checklist"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFloatingToolbar(false)}
          className="h-8 w-8 p-0 ml-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      {/* Desktop Toolbar */}
      {!isMobile && (
        <div className="sticky top-0 z-10 flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-wrap shadow-sm">
          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={Undo}
            tooltip="Undo (⌘Z)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={Redo}
            tooltip="Redo (⌘⇧Z)"
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Format Menu */}
          <FormatMenu />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            tooltip="Bold (⌘B)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            tooltip="Italic (⌘I)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon={UnderlineIcon}
            tooltip="Underline (⌘U)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            icon={Code}
            tooltip="Inline Code"
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            tooltip="Bullet List (⌘⇧8)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            tooltip="Numbered List (⌘⇧7)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            icon={CheckSquare}
            tooltip="Checklist (⌘⇧9)"
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Media */}
          <ToolbarButton
            onClick={insertLink}
            isActive={editor.isActive('link')}
            icon={LinkIcon}
            tooltip="Insert Link (⌘K)"
          />
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            icon={ImageIcon}
            tooltip="Insert Image"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            icon={Minus}
            tooltip="Horizontal Rule"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Mobile Toolbar */}
      {isMobile && (
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-gray-200 bg-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              icon={Bold}
              tooltip="Bold"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              icon={Italic}
              tooltip="Italic"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              icon={List}
              tooltip="List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              icon={CheckSquare}
              tooltip="Checklist"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <FormatMenu />
            <ToolbarButton
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              icon={ImageIcon}
              tooltip="Add Image"
            />
            <ToolbarButton
              onClick={insertLink}
              isActive={editor.isActive('link')}
              icon={LinkIcon}
              tooltip="Add Link"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Editor Content */}
      <div 
        ref={editorContainerRef} 
        className={`${isMobile ? 'h-[calc(100vh-200px)]' : 'h-[500px]'} overflow-y-auto`}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Floating Toolbar for Mobile */}
      <FloatingToolbar />
    </div>
  )
}
