import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Editor } from '@tiptap/react'
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare,
  Quote, 
  Code2, 
  Image as ImageIcon, 
  Minus 
} from 'lucide-react'

interface SlashMenuProps {
  editor: Editor
  noteId: string
  isOpen: boolean
  onClose: () => void
  position: { top: number; left: number }
}

interface SlashMenuItem {
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
}

export default function SlashMenu({ editor, noteId, isOpen, onClose, position }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems: SlashMenuItem[] = useMemo(() => [
    {
      title: 'Heading 1',
      description: 'Big section heading',
      icon: <Heading1 className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        onClose()
      }
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: <Heading2 className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        onClose()
      }
    },
    {
      title: 'Heading 3',
      description: 'Small section heading',
      icon: <Heading3 className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        onClose()
      }
    },
    {
      title: 'Bullet List',
      description: 'Create a bulleted list',
      icon: <List className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleBulletList().run()
        onClose()
      }
    },
    {
      title: 'Numbered List',
      description: 'Create a numbered list',
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleOrderedList().run()
        onClose()
      }
    },
    {
      title: 'Checklist',
      description: 'Create a task list',
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleTaskList().run()
        onClose()
      }
    },
    {
      title: 'Quote',
      description: 'Create a blockquote',
      icon: <Quote className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleBlockquote().run()
        onClose()
      }
    },
    {
      title: 'Code Block',
      description: 'Create a code block',
      icon: <Code2 className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().toggleCodeBlock().run()
        onClose()
      }
    },
    {
      title: 'Image',
      description: 'Insert an image',
      icon: <ImageIcon className="h-4 w-4" />,
      action: () => {
        // Trigger file input for image upload
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) {
            const formData = new FormData()
            formData.append('image', file)
            formData.append('noteId', noteId)

            try {
              const response = await fetch('/api/uploads/note-image', {
                method: 'POST',
                body: formData,
              })

              if (response.ok) {
                const { url } = await response.json()
                editor.chain().focus().setImage({ src: url }).run()
              }
            } catch (error) {
              console.error('Error uploading image:', error)
            }
          }
        }
        input.click()
        onClose()
      }
    },
    {
      title: 'Divider',
      description: 'Insert a horizontal rule',
      icon: <Minus className="h-4 w-4" />,
      action: () => {
        editor.chain().focus().setHorizontalRule().run()
        onClose()
      }
    }
  ], [editor, noteId, onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % menuItems.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length)
          break
        case 'Enter':
          e.preventDefault()
          menuItems[selectedIndex]?.action()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, menuItems, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[280px] max-w-[320px] rounded-lg border bg-white shadow-lg"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2">
        <div className="text-xs font-medium text-gray-500 mb-2">Insert</div>
        {menuItems.map((item, index) => (
          <button
            key={item.title}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
              index === selectedIndex
                ? 'bg-cozy-primary text-white'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={item.action}
          >
            <div className={`${index === selectedIndex ? 'text-white' : 'text-gray-500'}`}>
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{item.title}</div>
              <div className={`text-xs ${index === selectedIndex ? 'text-white/80' : 'text-gray-500'}`}>
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
