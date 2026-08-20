import type { LucideIcon } from 'lucide-react'
import { CheckSquare, List, Type, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import type { Note, NoteColor } from './types'

/**
 * Colour is carried by a saturated `dot` plus a whisper of `tint` behind the title row — never
 * the card surface. A heavier wash turns muddy on the dark theme (amber over navy reads brown),
 * so the dot does the identifying and the tint only warms the row.
 */
export const NOTE_COLORS: Record<NoteColor, {
  label: string
  tint: string
  dot: string
  swatch: string
}> = {
  yellow: {
    label: 'Yellow',
    tint: 'bg-amber-100/60 dark:bg-amber-400/[0.07]',
    dot: 'bg-amber-400',
    swatch: 'bg-amber-300 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300',
  },
  green: {
    label: 'Green',
    tint: 'bg-emerald-100/60 dark:bg-emerald-400/[0.07]',
    dot: 'bg-emerald-400',
    swatch: 'bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-400 dark:hover:bg-emerald-300',
  },
  blue: {
    label: 'Blue',
    tint: 'bg-sky-100/60 dark:bg-sky-400/[0.07]',
    dot: 'bg-sky-400',
    swatch: 'bg-sky-400 hover:bg-sky-500 dark:bg-sky-400 dark:hover:bg-sky-300',
  },
  purple: {
    label: 'Purple',
    tint: 'bg-violet-100/60 dark:bg-violet-400/[0.07]',
    dot: 'bg-violet-400',
    swatch: 'bg-violet-400 hover:bg-violet-500 dark:bg-violet-400 dark:hover:bg-violet-300',
  },
  pink: {
    label: 'Pink',
    tint: 'bg-pink-100/60 dark:bg-pink-400/[0.07]',
    dot: 'bg-pink-400',
    swatch: 'bg-pink-400 hover:bg-pink-500 dark:bg-pink-400 dark:hover:bg-pink-300',
  },
  gray: {
    label: 'Grey',
    tint: 'bg-slate-200/50 dark:bg-slate-400/[0.07]',
    dot: 'bg-slate-400',
    swatch: 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-500 dark:hover:bg-slate-400',
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
