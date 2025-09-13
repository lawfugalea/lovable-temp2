import React, { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from './ui/Button'
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Strikethrough,
  Smile,
  Mic,
  MicOff,
  Minus,
  Undo,
  Redo
} from 'lucide-react'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-[200px] p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading editor...</div>
    </div>
  )
})

interface QuillEditorProps {
  content?: string
  onUpdate?: (content: string, text: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export default function QuillEditor({ 
  content = '', 
  onUpdate, 
  placeholder = "Start writing your note...",
  editable = true,
  className = ""
}: QuillEditorProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const quillRef = useRef<any>(null)
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

  const handleChange = useCallback((content: string, delta: any, source: string, editor: any) => {
    if (source === 'user' && onUpdate) {
      const text = editor.getText()
      onUpdate(content, text)
    }
  }, [onUpdate])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return

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
      
      // Insert image into Quill editor
      const quill = quillRef.current?.getEditor()
      if (quill) {
        const range = quill.getSelection()
        quill.insertEmbed(range?.index || 0, 'image', result.url)
        quill.setSelection((range?.index || 0) + 1)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }, [])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }, [handleImageUpload])

  const startVoiceRecording = useCallback(() => {
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
        const quill = quillRef.current?.getEditor()
        if (quill) {
          const range = quill.getSelection()
          quill.insertText(range?.index || 0, finalTranscript + ' ')
          quill.setSelection((range?.index || 0) + finalTranscript.length + 1)
        }
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
  }, [])

  const stopVoiceRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

  // Custom toolbar configuration
  const modules = {
    toolbar: {
      container: [
        // Text formatting
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        
        // Lists and alignment
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        
        // Links and media
        ['link', 'image'],
        
        // Code and quotes
        ['blockquote', 'code-block'],
        
        // Clean and undo
        ['clean']
      ],
      handlers: {
        image: () => {
          fileInputRef.current?.click()
        }
      }
    },
    clipboard: {
      matchVisual: false,
    },
    history: {
      delay: 2000,
      maxStack: 500,
      userOnly: true
    }
  }

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align', 'direction',
    'link', 'image', 'video',
    'blockquote', 'code-block',
    'script'
  ]

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      {/* Mobile Custom Toolbar */}
      {isMobile && (
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-gray-200 bg-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const quill = quillRef.current?.getEditor()
                quill?.format('bold', !quill.getFormat().bold)
              }}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const quill = quillRef.current?.getEditor()
                quill?.format('italic', !quill.getFormat().italic)
              }}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const quill = quillRef.current?.getEditor()
                quill?.format('underline', !quill.getFormat().underline)
              }}
              className="h-8 w-8 p-0"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const quill = quillRef.current?.getEditor()
                quill?.format('list', quill.getFormat().list === 'bullet' ? false : 'bullet')
              }}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const quill = quillRef.current?.getEditor()
                quill?.format('header', quill.getFormat().header === 1 ? false : 1)
              }}
              className="h-8 w-8 p-0"
            >
              <Type className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 p-0"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`h-8 w-8 p-0 ${isRecording ? 'bg-red-100 text-red-600' : ''}`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
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

      {/* Quill Editor */}
      <div className={`${isMobile ? 'h-[calc(100vh-200px)]' : 'h-[500px]'}`}>
        <ReactQuill
          // ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={!editable}
          modules={modules}
          formats={formats}
          style={{
            height: isMobile ? 'calc(100vh - 200px)' : '500px',
            border: 'none'
          }}
        />
      </div>
    </div>
  )
}
