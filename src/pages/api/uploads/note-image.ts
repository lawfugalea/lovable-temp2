import { NextApiRequest, NextApiResponse } from 'next'
import { withApiHandler } from '@/lib/api-handler'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { withBasePath } from '@/lib/base-path'

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
const uploadDir = path.join(uploadRoot, 'notes')

const uploadCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW = 60 * 60 * 1000
const MAX_FILE_SIZE = 3 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const SAFE_FILE_RE = /^note-[0-9]+-[a-z0-9]+(?:\.(jpg|jpeg|png|gif|webp))?$/i

export const config = {
  api: {
    bodyParser: false,
  },
}

async function requireSession(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return session
}

function contentTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function detectImageMime(filepath: string): string | null {
  const bytes = fs.readFileSync(filepath).subarray(0, 16)
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png'
  if (bytes.length >= 6 && (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a')) return 'image/gif'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireSession(req, res)
  if (!session) return

  if (req.method === 'GET') {
    const file = String(req.query.file || '')
    if (!SAFE_FILE_RE.test(file)) return res.status(400).json({ error: 'Invalid file' })

    const attachment = await prisma.noteAttachment.findFirst({
      where: {
        filename: file,
        note: {
          OR: [
            { createdById: session.user.id },
            { collaborators: { some: { userId: session.user.id } } },
            {
              isShared: true,
              household: { members: { some: { userId: session.user.id } } },
            },
          ],
        },
      },
      select: { id: true },
    })
    if (!attachment) return res.status(404).json({ error: 'Not found' })

    ensureUploadDir()
    const fullPath = path.join(uploadDir, file)
    if (!fullPath.startsWith(uploadDir + path.sep)) return res.status(400).json({ error: 'Invalid file' })
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' })

    res.setHeader('Content-Type', contentTypeFor(file))
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return fs.createReadStream(fullPath).pipe(res)
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    ensureUploadDir()
    const userId = session.user.id
    const now = Date.now()
    if (uploadCounts.size >= 10_000) {
      for (const [key, value] of uploadCounts.entries()) {
        if (value.resetTime <= now) uploadCounts.delete(key)
      }
      if (uploadCounts.size >= 10_000 && !uploadCounts.has(userId)) {
        const oldestKey = uploadCounts.keys().next().value as string | undefined
        if (oldestKey) uploadCounts.delete(oldestKey)
      }
    }
    const userLimit = uploadCounts.get(userId)

    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT) {
          return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' })
        }
        userLimit.count++
      } else {
        uploadCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      }
    } else {
      uploadCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    }

    const form = formidable({
      uploadDir,
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => ALLOWED_MIME_TYPES.includes(mimetype || ''),
      filename: (_name, ext) => {
        const cleanExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.jpg'
        const timestamp = Date.now()
        const random = randomBytes(16).toString('hex')
        return `note-${timestamp}-${random}${cleanExt}`
      },
    })

    const [fields, files] = await form.parse(req)
    const file = Array.isArray(files.image) ? files.image[0] : files.image
    if (!file) return res.status(400).json({ error: 'No image file provided' })

    const noteField = Array.isArray(fields.noteId) ? fields.noteId[0] : fields.noteId
    const noteId = typeof noteField === 'string' ? noteField.trim() : ''
    const editableNote = noteId
      ? await prisma.note.findFirst({
          where: {
            id: noteId,
            OR: [
              { createdById: session.user.id },
              { collaborators: { some: { userId: session.user.id, role: 'EDITOR' } } },
            ],
          },
          select: { id: true },
        })
      : null
    if (!editableNote) {
      if (fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath)
      return res.status(403).json({ error: 'You cannot attach images to this note' })
    }

    if (file.size > MAX_FILE_SIZE) {
      if (fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath)
      return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` })
    }

    const detectedMime = detectImageMime(file.filepath)
    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      if (fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath)
      return res.status(400).json({ error: 'Invalid file content. Only JPEG, PNG, GIF, and WebP images are allowed.' })
    }

    const filename = file.newFilename
    try {
      await prisma.noteAttachment.create({
        data: { filename, noteId: editableNote.id, uploadedById: session.user.id },
      })
    } catch (error) {
      if (fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath)
      throw error
    }
    const publicUrl = withBasePath(`/api/uploads/note-image?file=${encodeURIComponent(filename)}`)

    return res.status(200).json({ url: publicUrl, filename, size: file.size, mimetype: file.mimetype })
  } catch (error) {
    console.error('Error uploading image:', error)
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` })
      }
      if (error.message.includes('filter')) {
        return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' })
      }
    }
    return res.status(500).json({ error: 'Failed to upload image' })
  }
}

export default withApiHandler(handler)
