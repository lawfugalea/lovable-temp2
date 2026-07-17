import type { LucideIcon } from 'lucide-react'
import { CheckSquare, List, Type, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import type { Note, NoteColor } from './types'

export const NOTE_COLORS: Record<NoteColor, {
  label: string
  card: string
  swatch: string
  accent: string
}> = {
  yellow: {
    label: 'Yellow',
    card: 'bg-yellow-50 border-yellow-200',
    swatch: 'bg-yellow-200 hover:bg-yellow-300',
    accent: 'bg-yellow-100/70',
  },
  green: {
    label: 'Green',
    card: 'bg-green-50 border-green-200',
    swatch: 'bg-green-200 hover:bg-green-300',
    accent: 'bg-green-100/70',
  },
  blue: {
    label: 'Blue',
    card: 'bg-blue-50 border-blue-200',
    swatch: 'bg-blue-200 hover:bg-blue-300',
    accent: 'bg-blue-100/70',
  },
  purple: {
    label: 'Purple',
    card: 'bg-purple-50 border-purple-200',
    swatch: 'bg-purple-200 hover:bg-purple-300',
    accent: 'bg-purple-100/70',
  },
  pink: {
    label: 'Pink',
    card: 'bg-pink-50 border-pink-200',
    swatch: 'bg-pink-200 hover:bg-pink-300',
    accent: 'bg-pink-100/70',
  },
  gray: {
    label: 'Gray',
    card: 'bg-gray-50 border-gray-200',
    swatch: 'bg-gray-200 hover:bg-gray-300',
    accent: 'bg-gray-100/70',
  },
}

export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[]

export const getNoteColor = (color: string) =>
  NOTE_COLORS[(color as NoteColor)] ?? NOTE_COLORS.yellow

// Extract text from TipTap JSON content, including checklist items.
export const extractTextFromJson = (contentJson: any): string => {
  if (!contentJson?.content) return ''

  const extractText = (node: any): string => {
    if (!node) return ''
    if (node.type === 'text') return node.text || ''

    if (node.type === 'taskItem') {
      const checkbox = node.attrs?.checked ? '☑' : '☐'
      const text = node.content ? node.content.map(extractText).join('') : ''
      return `${checkbox} ${text}`
    }

    if (node.type === 'taskList' || node.type === 'bulletList' || node.type === 'orderedList') {
      return node.content ? node.content.map(extractText).join('\n') : ''
    }

    if (node.type === 'listItem') {
      return node.content ? node.content.map(extractText).join('') : ''
    }

    if (node.type === 'paragraph' || node.type === 'heading') {
      const text = node.content ? node.content.map(extractText).join('') : ''
      return text ? `${text}\n` : '\n'
    }

    if (node.type === 'blockquote') {
      const text = node.content ? node.content.map(extractText).join('') : ''
      return text ? `> ${text}\n` : '\n'
    }

    return Array.isArray(node.content) ? node.content.map(extractText).join('') : ''
  }

  return contentJson.content.map(extractText).join('').trim()
}

export const getPlainText = (note: Note): string =>
  note.contentText || note.content?.replace(/<[^>]*>/g, '') || ''

export interface ContentTypeIndicator {
  icon: LucideIcon
  label: string
}

// Describe the dominant content type of a note for the card badge.
export const getContentTypeIndicator = (note: Note): ContentTypeIndicator | null => {
  const content = getPlainText(note)

  if (content.includes('☑') || content.includes('☐')) {
    const checkedCount = (content.match(/☑/g) || []).length
    const totalCount = (content.match(/[☑☐]/g) || []).length
    return { icon: CheckSquare, label: `Checklist (${checkedCount}/${totalCount})` }
  }

  if (content.includes('•') || /^\d+\./.test(content)) {
    const listCount = content.split('\n').filter(line =>
      line.trim().startsWith('•') || /^\d+\./.test(line.trim())
    ).length
    return { icon: List, label: `List (${listCount} items)` }
  }

  if (content.includes('#')) {
    const headingCount = (content.match(/^#+\s/gm) || []).length
    return { icon: Type, label: `Document (${headingCount} headings)` }
  }

  if (note.contentJson) {
    const raw = JSON.stringify(note.contentJson)
    if (raw.includes('"type":"image"')) {
      return { icon: ImageIcon, label: 'With images' }
    }
    if (raw.includes('"type":"link"')) {
      return { icon: LinkIcon, label: 'With links' }
    }
  }

  return null
}

// Generate a compact preview string for note cards.
export const getSmartPreview = (note: Note): string => {
  const content = getPlainText(note)

  if (!content.trim()) {
    return 'Empty note'
  }

  if (content.includes('☑') || content.includes('☐')) {
    const checklistItems = content.split('\n').filter(line =>
      line.includes('☑') || line.includes('☐')
    ).slice(0, 3)

    if (checklistItems.length > 0) {
      const preview = checklistItems.join(' • ')
      return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
    }
  }

  if (content.includes('•') || /^\d+\./.test(content)) {
    const listItems = content.split('\n').filter(line =>
      line.trim().startsWith('•') || /^\d+\./.test(line.trim())
    ).slice(0, 2)

    if (listItems.length > 0) {
      const preview = listItems.join(' • ')
      return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
    }
  }

  const lines = content.split('\n').filter(line => line.trim())
  const firstHeading = lines.find(line =>
    line.startsWith('#') ||
    (line.length < 50 && line.length > 3 && !line.includes('.'))
  )

  if (firstHeading) {
    const headingText = firstHeading.replace(/^#+\s*/, '')
    const remainingText = content.replace(firstHeading, '').trim()
    const preview = remainingText.length > 0
      ? `${headingText}: ${remainingText.substring(0, 60)}`
      : headingText
    return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
  }

  const cleanText = content.replace(/\n+/g, ' ').trim()
  if (cleanText.length <= 100) {
    return cleanText
  }

  let preview = cleanText.substring(0, 100)
  const lastPeriod = preview.lastIndexOf('.')
  const lastSpace = preview.lastIndexOf(' ')

  if (lastPeriod > 60) {
    preview = cleanText.substring(0, lastPeriod + 1)
  } else if (lastSpace > 60) {
    preview = cleanText.substring(0, lastSpace)
  }

  return preview + '...'
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`
  } else if (diffInHours < 48) {
    return 'Yesterday'
  } else if (diffInHours < 168) {
    return `${Math.floor(diffInHours / 24)}d ago`
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}
