import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileNoteResponse, MobileUpdateNoteRequest } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { MOBILE_NOTE_COLORS, MOBILE_NOTE_MAX, isMobilePlainDocument, mobileNoteDto, mobilePlainDocument, mobilePlainHtml } from '@/lib/mobile-notes'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'
import { validateContentJson } from '@/lib/note-validation'

type Response = MobileNoteResponse | MobileApiError | { ok: true }
const include = { createdBy: { select: { name: true, email: true } }, collaborators: { select: { userId: true, role: true } }, attachments: { select: { id: true, filename: true, createdAt: true }, orderBy: { createdAt: 'asc' as const } } } as const

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') { res.setHeader('Allow', ['PATCH', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  const body = (req.body || {}) as MobileUpdateNoteRequest
  if (!body.householdId || !(await mobileHouseholdAvailable(identity.userId, body.householdId))) return res.status(403).json({ error: 'Household not available' })
  const existing = await prisma.note.findFirst({ where: { id, OR: [{ createdById: identity.userId }, { collaborators: { some: { userId: identity.userId } } }, { householdId: body.householdId, isShared: true }] }, include })
  if (!existing) return res.status(404).json({ error: 'Note not found' })
  const owner = existing.createdById === identity.userId
  const canEdit = owner || existing.collaborators.some(row => row.userId === identity.userId && row.role === 'EDITOR')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'DELETE') {
    if (!owner) return res.status(403).json({ error: 'Only the note owner can delete it' })
    await prisma.note.delete({ where: { id } }); return res.status(200).json({ ok: true })
  }
  if (!canEdit) return res.status(403).json({ error: 'This note is read-only' })
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) { const title = typeof body.title === 'string' ? body.title.trim() : ''; if (!title || title.length > 200) return res.status(400).json({ error: 'A title of 200 characters or fewer is required' }); data.title = title }
  if (body.contentText !== undefined) {
    const text = typeof body.contentText === 'string' ? body.contentText.trim() : ''
    if (text.length > MOBILE_NOTE_MAX) return res.status(400).json({ error: `Note text is limited to ${MOBILE_NOTE_MAX} characters` })
    data.contentText = text
    if (body.contentJson !== undefined) {
      const validationError = validateContentJson(body.contentJson)
      if (validationError) return res.status(400).json({ error: validationError })
      data.contentJson = body.contentJson
      data.content = ''
    } else {
      if (!isMobilePlainDocument(existing.contentJson)) return res.status(409).json({ error: 'Rich note changes require the rich editor' })
      data.content = mobilePlainHtml(text); data.contentJson = mobilePlainDocument(text)
    }
  }
  if (body.color !== undefined) { if (!MOBILE_NOTE_COLORS.includes(body.color)) return res.status(400).json({ error: 'Invalid note color' }); data.color = body.color }
  if (owner && body.isPinned !== undefined) data.isPinned = body.isPinned
  if (owner && body.isArchived !== undefined) data.isArchived = body.isArchived
  if (owner && body.isShared !== undefined) { data.isShared = body.isShared; data.householdId = body.isShared ? body.householdId : null }
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' })
  const note = await prisma.note.update({ where: { id }, data, include })
  return res.status(200).json({ note: mobileNoteDto(note, identity.userId) })
}

export default withApiHandler(handler)
