import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import SlashMenu from './SlashMenu'
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
  Table as TableIcon, 
  Image as ImageIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'
import { Button } from './ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/DropdownMenu'
import { Separator } from './ui/Separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/Tooltip'

interface RichTextEditorProps {
  content?: any
  onUpdate?: (content: any, text: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export default function RichTextEditor({ 
  content, 
  onUpdate, 
  placeholder = "Start writing your note...",
  editable = true,
  className = ""
}: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const lowlight = createLowlight(common)

  const editor = useEditor({
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const text = editor.getText()
      onUpdate?.(json, text)
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default code block to use our enhanced version
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
        renderHTML({ node, HTMLAttributes }) {
          return [
            'li',
            HTMLAttributes,
            [
              'label',
              {
                contenteditable: 'false',
                style: 'display: flex; align-items: flex-start; gap: 0.5rem; user-select: none;',
              },
              [
                'input',
                {
                  type: 'checkbox',
                  checked: node.attrs.checked ? 'checked' : null,
                  style: 'width: 10px !important; height: 10px !important; min-width: 10px !important; min-height: 10px !important; max-width: 10px !important; max-height: 10px !important; margin: 0; padding: 0; appearance: none; -webkit-appearance: none; border: 1px solid #9ca3af; border-radius: 2px; background: white; position: relative; flex-shrink: 0;',
                },
              ],
              ['div', { style: 'flex: 1;' }, 0],
            ],
          ]
        },
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
      handleKeyDown: (view, event) => {
        // Handle slash menu
        if (event.key === '/') {
          const { state } = view
          const { selection } = state
          const { $from } = selection
          
          // Check if we're at the start of a line or after a space
          const textBefore = $from.nodeBefore?.textContent || ''
          const isAtStart = $from.parentOffset === 0
          const isAfterSpace = textBefore.endsWith(' ')
          
          if (isAtStart || isAfterSpace) {
            // Get cursor position for menu placement
            const coords = view.coordsAtPos($from.pos)
            setSlashMenuPosition({
              top: coords.bottom + window.scrollY,
              left: coords.left + window.scrollX,
            })
            setShowSlashMenu(true)
            return false // Don't insert the slash
          }
        }
        
        // Close slash menu on escape
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false)
          return true
        }
        
        return false
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

  // Mobile keyboard handling to keep cursor visible
  useEffect(() => {
    if (!editor || !editorContainerRef.current) return

    const isMobile = 'ontouchstart' in window && window.innerWidth <= 768
    
    if (!isMobile) return

    const handleSelectionUpdate = () => {
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      const container = editorContainerRef.current
      
      if (!container) return

      // Get viewport info
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Check if cursor is in the bottom 60% of the screen (where keyboard typically appears)
      const isCursorInKeyboardArea = coords.top > viewportHeight * 0.4
      
      if (isCursorInKeyboardArea) {
        // Calculate scroll position to keep cursor visible
        const targetCursorPosition = viewportHeight * 0.25 // Keep cursor in upper 25% of screen
        const scrollAmount = coords.top - targetCursorPosition
        
        // Smooth scroll to bring cursor into view
        container.scrollTo({
          top: container.scrollTop + scrollAmount,
          behavior: 'smooth'
        })
      }
    }

    // Handle keyboard appearance/disappearance
    const handleResize = () => {
      // Delay to allow keyboard animation to complete
      setTimeout(handleSelectionUpdate, 100)
    }

    // Listen for selection changes (cursor movement)
    editor.on('selectionUpdate', handleSelectionUpdate)
    
    // Handle focus events
    const handleFocus = () => {
      setTimeout(handleSelectionUpdate, 500) // Delay to allow keyboard to appear
    }

    const handleBlur = () => {
      // Optional: scroll back to top when keyboard disappears
      setTimeout(() => {
        if (editorContainerRef.current) {
          editorContainerRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
          })
        }
      }, 300)
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('focus', handleFocus)
    editorElement.addEventListener('blur', handleBlur)
    window.addEventListener('resize', handleResize)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editorElement.removeEventListener('focus', handleFocus)
      editorElement.removeEventListener('blur', handleBlur)
      window.removeEventListener('resize', handleResize)
    }
  }, [editor])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return

    setIsUploading(true)
    
    try {
      console.log('Uploading image:', file.name, file.size, file.type)
      
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/uploads/note-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', response.status, errorText)
        throw new Error(`Failed to upload image: ${response.status}`)
      }

      const result = await response.json()
      console.log('Upload successful:', result)
      
      editor.chain().focus().setImage({ src: result.url }).run()
    } catch (error) {
      console.error('Error uploading image:', error)
      // You could show a toast notification here
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

    if (url === null) {
      return
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])


  if (!editor) {
    return (
      <div className="min-h-[300px] p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-wrap shadow-sm">
        {/* Undo/Redo */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 w-8 p-0"
              >
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (⌘Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 w-8 p-0"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (⌘⇧Z)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Headings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Heading1 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="h-4 w-4 mr-2" />
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-4 w-4 mr-2" />
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="h-4 w-4 mr-2" />
              Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bold (⌘B)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Italic (⌘I)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Underline (⌘U)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-gray-200' : ''}`}
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Inline Code</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Block Elements */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
              >
                <Quote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Blockquote</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bullet List (⌘⇧8)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Numbered List (⌘⇧7)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('taskList') ? 'bg-gray-200' : ''}`}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Checklist (⌘⇧9)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
              >
                <Code2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Code Block</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Horizontal Rule</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Links and Media */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertLink}
                className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Insert Link (⌘K)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>


        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 w-8 p-0"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Insert Image</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Editor Content */}
      <div ref={editorContainerRef} className="h-[500px] overflow-y-auto border border-gray-100 ProseMirror-container">
        <EditorContent editor={editor} />
      </div>

      {/* Slash Menu */}
      <SlashMenu
        editor={editor}
        isOpen={showSlashMenu}
        onClose={() => setShowSlashMenu(false)}
        position={slashMenuPosition}
      />
    </div>
  )
}
