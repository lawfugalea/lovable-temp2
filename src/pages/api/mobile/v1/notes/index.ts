import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError, MobileCreateNoteRequest, MobileNoteResponse, MobileNotesResponse } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { MOBILE_NOTE_COLORS, MOBILE_NOTE_MAX, mobileNoteDto, mobilePlainDocument, mobilePlainHtml } from '@/lib/mobile-notes'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { mobileHouseholdAvailable } from '@/lib/mobile-shopping'
import { prisma } from '@/lib/prisma'
import { validateContentJson } from '@/lib/note-validation'

type Response = MobileNotesResponse | MobileNoteResponse | MobileApiError
const include = { createdBy: { select: { name: true, email: true } }, collaborators: { select: { userId: true, role: true } }, attachments: { select: { id: true, filename: true, createdAt: true }, orderBy: { createdAt: 'asc' as const } } } as const

async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', ['GET', 'POST']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const body = (req.body || {}) as Partial<MobileCreateNoteRequest>
  const householdId = req.method === 'GET' ? (typeof req.query.householdId === 'string' ? req.query.householdId : '') : body.householdId || ''
  if (!householdId || !(await mobileHouseholdAvailable(identity.userId, householdId))) return res.status(403).json({ error: 'Household not available' })
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') {
    const notes = await prisma.note.findMany({ where: { OR: [{ createdById: identity.userId, isShared: false }, { householdId, isShared: true }, { collaborators: { some: { userId: identity.userId } } }] }, include, orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }] })
    return res.status(200).json({ householdId, notes: notes.map(note => mobileNoteDto(note, identity.userId)) })
  }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const contentText = typeof body.contentText === 'string' ? body.contentText.trim() : ''
  const color = MOBILE_NOTE_COLORS.includes(body.color || 'yellow') ? body.color || 'yellow' : null
  if (!title || title.length > 200) return res.status(400).json({ error: 'A title of 200 characters or fewer is required' })
  if (contentText.length > MOBILE_NOTE_MAX) return res.status(400).json({ error: `Note text is limited to ${MOBILE_NOTE_MAX} characters` })
  if (body.contentJson !== undefined) { const validationError = validateContentJson(body.contentJson); if (validationError) return res.status(400).json({ error: validationError }) }
  if (!color) return res.status(400).json({ error: 'Invalid note color' })
  const shared = body.isShared === true
  const note = await prisma.note.create({ data: { title, content: body.contentJson === undefined ? mobilePlainHtml(contentText) : '', contentText, contentJson: body.contentJson === undefined ? mobilePlainDocument(contentText) : body.contentJson as object, color, isShared: shared, householdId: shared ? householdId : null, createdById: identity.userId }, include })
  return res.status(201).json({ note: mobileNoteDto(note, identity.userId) })
}

export default withApiHandler(handler)
