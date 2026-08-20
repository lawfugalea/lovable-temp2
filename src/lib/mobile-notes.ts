import type { MobileNoteColor, MobileNoteSummary } from '../../packages/contracts'

export const MOBILE_NOTE_MAX = 20_000
export const MOBILE_NOTE_COLORS: MobileNoteColor[] = ['yellow', 'green', 'blue', 'purple', 'pink', 'gray']

export function mobilePlainDocument(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  return { type: 'doc', attrs: { clankeepMobilePlainText: true }, content: lines.map(line => ({ type: 'paragraph', ...(line ? { content: [{ type: 'text', text: line }] } : {}) })) }
}

export function mobilePlainHtml(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  return escaped.split(/\r?\n/).map(line => `<p>${line || '<br>'}</p>`).join('')
}

export function isMobilePlainDocument(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const attrs = (value as { attrs?: unknown }).attrs
  return Boolean(attrs && typeof attrs === 'object' && !Array.isArray(attrs) && (attrs as Record<string, unknown>).clankeepMobilePlainText === true)
}

export function mobileNoteDto(note: {
  id: string; title: string; contentText: string | null; contentJson: unknown; content: string; isShared: boolean; isPinned: boolean; isArchived: boolean; color: string; updatedAt: Date; createdById: string; createdBy: { name: string | null; email: string }; collaborators: Array<{ userId: string; role: string }>; attachments: Array<{ id: string; filename: string; createdAt: Date }>
}, userId: string): MobileNoteSummary {
  const owner = note.createdById === userId
  return { id: note.id, title: note.title, contentText: note.contentText || note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(), isShared: note.isShared, isPinned: note.isPinned, isArchived: note.isArchived, color: MOBILE_NOTE_COLORS.includes(note.color as MobileNoteColor) ? note.color as MobileNoteColor : 'yellow', updatedAt: note.updatedAt.toISOString(), ownerName: note.createdBy.name || note.createdBy.email, canEdit: owner || note.collaborators.some(row => row.userId === userId && row.role === 'EDITOR'), canDelete: owner, mobilePlainText: isMobilePlainDocument(note.contentJson), contentJson: note.contentJson, attachments: note.attachments.map(attachment => ({ ...attachment, createdAt: attachment.createdAt.toISOString() })) }
}
