import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { MobileApiError } from '../../../../../../packages/contracts'
import { withApiHandler } from '@/lib/api-handler'
import { requireMobileIdentity } from '@/lib/mobile-auth'
import { prisma } from '@/lib/prisma'

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }
const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
const uploadDir = path.join(uploadRoot, 'notes')
const MAX_BYTES = 3 * 1024 * 1024

function imageType(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: 'image/png', ext: '.png' }
  if (bytes.length >= 6 && (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a')) return { mime: 'image/gif', ext: '.gif' }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: '.webp' }
  return null
}

async function editableNote(id: string, userId: string) {
  return prisma.note.findFirst({ where: { id, OR: [{ createdById: userId }, { collaborators: { some: { userId, role: 'EDITOR' } } }] }, select: { id: true } })
}

async function handler(req: NextApiRequest, res: NextApiResponse<{ attachment?: { id: string; filename: string; createdAt: string }; ok?: true } | MobileApiError>) {
  if (req.method !== 'POST' && req.method !== 'DELETE') { res.setHeader('Allow', ['POST', 'DELETE']); return res.status(405).json({ error: 'Method not allowed' }) }
  const identity = await requireMobileIdentity(req, res); if (!identity) return
  const noteId = typeof req.body?.noteId === 'string' ? req.body.noteId : ''
  if (!noteId || !(await editableNote(noteId, identity.userId))) return res.status(403).json({ error: 'You cannot change attachments on this note' })
  if (req.method === 'DELETE') {
    const attachmentId = typeof req.body?.attachmentId === 'string' ? req.body.attachmentId : ''
    const attachment = await prisma.noteAttachment.findFirst({ where: { id: attachmentId, noteId }, select: { id: true, filename: true } })
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' })
    await prisma.noteAttachment.delete({ where: { id: attachment.id } })
    const file = path.join(uploadDir, attachment.filename)
    if (file.startsWith(`${uploadDir}${path.sep}`) && fs.existsSync(file)) fs.unlinkSync(file)
    return res.status(200).json({ ok: true })
  }
  const base64 = typeof req.body?.base64 === 'string' ? req.body.base64 : ''
  if (!base64 || base64.length > Math.ceil(MAX_BYTES * 4 / 3) + 32 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return res.status(400).json({ error: 'Choose an image smaller than 3 MB' })
  const bytes = Buffer.from(base64, 'base64')
  const type = imageType(bytes)
  if (!type || !bytes.length || bytes.length > MAX_BYTES) return res.status(400).json({ error: 'Only JPEG, PNG, GIF, and WebP images up to 3 MB are supported' })
  fs.mkdirSync(uploadDir, { recursive: true })
  const filename = `note-${Date.now()}-${randomBytes(16).toString('hex')}${type.ext}`
  const file = path.join(uploadDir, filename)
  fs.writeFileSync(file, bytes, { flag: 'wx' })
  try {
    const attachment = await prisma.noteAttachment.create({ data: { noteId, filename, uploadedById: identity.userId }, select: { id: true, filename: true, createdAt: true } })
    return res.status(201).json({ attachment: { ...attachment, createdAt: attachment.createdAt.toISOString() } })
  } catch (error) {
    if (fs.existsSync(file)) fs.unlinkSync(file)
    throw error
  }
}

export default withApiHandler(handler)
