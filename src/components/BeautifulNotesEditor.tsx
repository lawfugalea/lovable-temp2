import React, { useCallback, useEffect, useRef, useState } from 'react'
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Type,
  Smile,
  Mic,
  MicOff,
  Minus,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react'
import { Button } from './ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/DropdownMenu'

interface BeautifulNotesEditorProps {
  content?: string
  onUpdate?: (content: string, text: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export default function BeautifulNotesEditor({ 
  content = '', 
  onUpdate, 
  placeholder = "Start writing your note...",
  editable = true,
  className = ""
}: BeautifulNotesEditorProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentFormat, setCurrentFormat] = useState<any>({})
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Update format state when selection changes
  useEffect(() => {
    if (!editable) return

    const updateFormat = () => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element
        
        if (element) {
          setCurrentFormat({
            bold: element.closest('b, strong') !== null || document.queryCommandState('bold'),
            italic: element.closest('i, em') !== null || document.queryCommandState('italic'),
            underline: element.closest('u') !== null || document.queryCommandState('underline'),
            list: element.closest('ul, ol') !== null,
            heading: element.closest('h1, h2, h3, h4, h5, h6')?.tagName.toLowerCase() || false
          })
        }
      }
    }

    document.addEventListener('selectionchange', updateFormat)
    return () => document.removeEventListener('selectionchange', updateFormat)
  }, [editable])

  const execCommand = useCallback((command: string, value?: string) => {
    if (!editable) return
    
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleContentChange()
  }, [editable])

  const handleContentChange = useCallback(() => {
    if (!editorRef.current || !onUpdate) return
    
    const html = editorRef.current.innerHTML
    const text = editorRef.current.textContent || ''
    onUpdate(html, text)
  }, [onUpdate])

  const insertEmoji = useCallback((emoji: string) => {
    if (!editable) return
    execCommand('insertText', emoji)
    setShowEmojiPicker(false)
  }, [execCommand, editable])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') || !editable) return

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
      
      // Insert image into editor
      const img = document.createElement('img')
      img.src = result.url
      img.className = 'max-w-full h-auto rounded-lg my-4 mx-auto block'
      img.alt = 'Uploaded image'
      img.style.maxHeight = '400px'
      
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(img)
        
        // Add a line break after image
        const br = document.createElement('br')
        range.setStartAfter(img)
        range.insertNode(br)
        
        // Move cursor after the image
        range.setStartAfter(br)
        range.setEndAfter(br)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      
      editorRef.current?.focus()
      handleContentChange()
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }, [handleContentChange, editable])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }, [handleImageUpload])

  const startVoiceRecording = useCallback(() => {
    if (!editable) return
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      
      if (finalTranscript) {
        execCommand('insertText', finalTranscript + ' ')
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.start()
  }, [execCommand, editable])

  const stopVoiceRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

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
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || !editable}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-cozy-primary text-white' : ''} ${className}`}
      title={tooltip}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )

  const EmojiPicker = () => {
    if (!showEmojiPicker) return null

    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']

    return (
      <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => insertEmoji(emoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      {/* Desktop Toolbar */}
      {!isMobile && (
        <div className="sticky top-0 z-10 flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-wrap shadow-sm">
          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => execCommand('bold')}
            isActive={currentFormat.bold}
            icon={Bold}
            tooltip="Bold (⌘B)"
          />
          <ToolbarButton
            onClick={() => execCommand('italic')}
            isActive={currentFormat.italic}
            icon={Italic}
            tooltip="Italic (⌘I)"
          />
          <ToolbarButton
            onClick={() => execCommand('underline')}
            isActive={currentFormat.underline}
            icon={Underline}
            tooltip="Underline (⌘U)"
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Headings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2" disabled={!editable}>
                <Type className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent  className="w-48">
              <DropdownMenuItem onClick={() => execCommand('formatBlock', 'h1')}>
                <Type className="h-4 w-4 mr-2" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => execCommand('formatBlock', 'h2')}>
                <Type className="h-4 w-4 mr-2" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => execCommand('formatBlock', 'h3')}>
                <Type className="h-4 w-4 mr-2" />
                Heading 3
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => execCommand('formatBlock', 'p')}>
                <Type className="h-4 w-4 mr-2" />
                Paragraph
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => execCommand('insertUnorderedList')}
            isActive={currentFormat.list}
            icon={List}
            tooltip="Bullet List"
          />
          <ToolbarButton
            onClick={() => execCommand('insertOrderedList')}
            icon={ListOrdered}
            tooltip="Numbered List"
          />
          <ToolbarButton
            onClick={() => execCommand('insertHorizontalRule')}
            icon={Minus}
            tooltip="Horizontal Rule"
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Media & Links */}
          <ToolbarButton
            onClick={() => {
              const url = prompt('Enter URL:')
              if (url) execCommand('createLink', url)
            }}
            icon={LinkIcon}
            tooltip="Insert Link"
          />
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            icon={ImageIcon}
            tooltip="Insert Image"
          />
          <ToolbarButton
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            icon={Smile}
            tooltip="Insert Emoji"
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Voice Recording */}
          <ToolbarButton
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            icon={isRecording ? MicOff : Mic}
            tooltip={isRecording ? "Stop Recording" : "Voice Input"}
            isActive={isRecording}
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
              onClick={() => execCommand('bold')}
              isActive={currentFormat.bold}
              icon={Bold}
              tooltip="Bold"
            />
            <ToolbarButton
              onClick={() => execCommand('italic')}
              isActive={currentFormat.italic}
              icon={Italic}
              tooltip="Italic"
            />
            <ToolbarButton
              onClick={() => execCommand('underline')}
              isActive={currentFormat.underline}
              icon={Underline}
              tooltip="Underline"
            />
            <ToolbarButton
              onClick={() => execCommand('insertUnorderedList')}
              isActive={currentFormat.list}
              icon={List}
              tooltip="List"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2" disabled={!editable}>
                  <Type className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent  className="w-48">
                <DropdownMenuItem onClick={() => execCommand('formatBlock', 'h1')}>
                  <Type className="h-4 w-4 mr-2" />
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => execCommand('formatBlock', 'h2')}>
                  <Type className="h-4 w-4 mr-2" />
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => execCommand('formatBlock', 'h3')}>
                  <Type className="h-4 w-4 mr-2" />
                  Heading 3
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <ToolbarButton
              onClick={() => fileInputRef.current?.click()}
              icon={ImageIcon}
              tooltip="Add Image"
            />
            <ToolbarButton
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              icon={Smile}
              tooltip="Add Emoji"
            />
            <ToolbarButton
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              icon={isRecording ? MicOff : Mic}
              tooltip={isRecording ? "Stop" : "Voice"}
              isActive={isRecording}
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
        ref={editorRef}
        contentEditable={editable}
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className={`${isMobile ? 'h-[calc(100vh-200px)]' : 'h-[500px]'} overflow-y-auto p-4 focus:outline-none prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none`}
        style={{ 
          minHeight: '200px',
          lineHeight: '1.6'
        }}
        dangerouslySetInnerHTML={{ __html: content }}
        suppressContentEditableWarning={true}
      />

      {/* Placeholder */}
      {!content && (
        <div className="absolute top-4 left-4 text-gray-400 pointer-events-none select-none">
          {placeholder}
        </div>
      )}

      {/* Emoji Picker */}
      <div className="relative">
        <EmojiPicker />
      </div>
    </div>
  )
}
