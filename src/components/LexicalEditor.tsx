import React, { useCallback, useEffect, useRef, useState } from 'react'
import { $getRoot, $getSelection, EditorState, $createTextNode, $createParagraphNode } from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { $createHeadingNode } from '@lexical/rich-text'
import { FORMAT_TEXT_COMMAND, $isRangeSelection } from 'lexical'
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
  MoreHorizontal,
  X,
  Plus
} from 'lucide-react'
import { Button } from './ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/DropdownMenu'

interface LexicalEditorProps {
  content?: any
  onUpdate?: (content: any, text: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

// Toolbar Plugin
function ToolbarPlugin({ isMobile }: { isMobile: boolean }) {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      // Update toolbar state based on selection
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
    }
  }, [])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }

  const insertHeading = (level: number) => {
    editor.update(() => {
      const selection = $getSelection()
      if (selection) {
        const headingNode = $createHeadingNode(`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6')
        selection.insertNodes([headingNode])
      }
    })
  }

  if (isMobile) {
    return (
      <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('bold')}
            className={`h-8 w-8 p-0 ${isBold ? 'bg-cozy-primary text-white' : ''}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('italic')}
            className={`h-8 w-8 p-0 ${isItalic ? 'bg-cozy-primary text-white' : ''}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('underline')}
            className={`h-8 w-8 p-0 ${isUnderline ? 'bg-cozy-primary text-white' : ''}`}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Type className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent  className="w-48">
              <DropdownMenuItem onClick={() => insertHeading(1)}>
                <Type className="h-4 w-4 mr-2" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertHeading(2)}>
                <Type className="h-4 w-4 mr-2" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertHeading(3)}>
                <Type className="h-4 w-4 mr-2" />
                Heading 3
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-wrap shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatText('bold')}
        className={`h-8 w-8 p-0 ${isBold ? 'bg-cozy-primary text-white' : ''}`}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatText('italic')}
        className={`h-8 w-8 p-0 ${isItalic ? 'bg-cozy-primary text-white' : ''}`}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatText('underline')}
        className={`h-8 w-8 p-0 ${isUnderline ? 'bg-cozy-primary text-white' : ''}`}
      >
        <Underline className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-gray-200 mx-1" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent  className="w-48">
          <DropdownMenuItem onClick={() => insertHeading(1)}>
            <Type className="h-4 w-4 mr-2" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertHeading(2)}>
            <Type className="h-4 w-4 mr-2" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertHeading(3)}>
            <Type className="h-4 w-4 mr-2" />
            Heading 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <div className="w-px h-6 bg-gray-200 mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Placeholder Plugin
function Placeholder({ placeholder }: { placeholder: string }) {
  return (
    <div className="absolute top-4 left-4 text-gray-400 pointer-events-none select-none">
      {placeholder}
    </div>
  )
}

export default function LexicalEditor({ 
  content, 
  onUpdate, 
  placeholder = "Start writing your note...",
  editable = true,
  className = ""
}: LexicalEditorProps) {
  const [isMobile, setIsMobile] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const initialConfig = {
    namespace: 'LexicalEditor',
    theme: {
      root: 'p-4 min-h-[200px] focus:outline-none',
      paragraph: 'mb-2',
      heading: {
        h1: 'text-2xl font-bold mb-4',
        h2: 'text-xl font-bold mb-3',
        h3: 'text-lg font-bold mb-2',
      },
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
      list: {
        nested: {
          listitem: 'list-none',
        },
        ol: 'list-decimal list-inside mb-2',
        ul: 'list-disc list-inside mb-2',
        listitem: 'mb-1',
      },
      link: 'text-cozy-primary underline cursor-pointer',
      quote: 'border-l-4 border-gray-300 pl-4 italic my-4',
      code: 'bg-gray-100 rounded px-1 py-0.5 font-mono text-sm',
      codeHighlight: {
        atrule: 'text-purple-600',
        attr: 'text-blue-600',
        boolean: 'text-red-600',
        builtin: 'text-purple-600',
        cdata: 'text-gray-600',
        char: 'text-green-600',
        class: 'text-blue-600',
        'class-name': 'text-blue-600',
        comment: 'text-gray-600',
        constant: 'text-red-600',
        deleted: 'text-red-600',
        doctype: 'text-gray-600',
        entity: 'text-orange-600',
        function: 'text-blue-600',
        important: 'text-red-600',
        inserted: 'text-green-600',
        keyword: 'text-purple-600',
        namespace: 'text-blue-600',
        number: 'text-red-600',
        operator: 'text-gray-600',
        prolog: 'text-gray-600',
        property: 'text-blue-600',
        punctuation: 'text-gray-600',
        regex: 'text-green-600',
        selector: 'text-purple-600',
        string: 'text-green-600',
        symbol: 'text-red-600',
        tag: 'text-purple-600',
        url: 'text-blue-600',
        variable: 'text-red-600',
      },
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      AutoLinkNode,
      LinkNode,
    ],
    editable,
    onError: (error: Error) => {
      console.error('Lexical error:', error)
    },
  }

  const handleChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      const root = $getRoot()
      const text = root.getTextContent()
      const json = editorState.toJSON()
      onUpdate?.(json, text)
    })
  }, [onUpdate])

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin isMobile={isMobile} />
        <div 
          ref={editorContainerRef}
          className={`${isMobile ? 'h-[calc(100vh-200px)]' : 'h-[500px]'} overflow-y-auto relative`}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 sm:p-6"
              />
            }
            placeholder={<Placeholder placeholder={placeholder} />}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={handleChange} />
          <HistoryPlugin />
        </div>
      </LexicalComposer>
    </div>
  )
}
