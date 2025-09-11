import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

// Configure formidable
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'notes')

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Rate limiting (simple in-memory store)
const uploadCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // 10 uploads per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

// File size limit (3MB)
const MAX_FILE_SIZE = 3 * 1024 * 1024

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Rate limiting
    const userId = session.user.email
    const now = Date.now()
    const userLimit = uploadCounts.get(userId)
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT) {
          return res.status(429).json({ 
            error: 'Rate limit exceeded. Please try again later.' 
          })
        }
        userLimit.count++
      } else {
        uploadCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      }
    } else {
      uploadCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    }

    // Parse form data
    const form = formidable({
      uploadDir,
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return ALLOWED_MIME_TYPES.includes(mimetype || '')
      },
      filename: (name, ext, part, form) => {
        // Generate unique filename
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 15)
        return `note-${timestamp}-${random}${ext}`
      }
    })

    const [fields, files] = await form.parse(req)
    
    // Check if file was uploaded
    const file = Array.isArray(files.image) ? files.image[0] : files.image
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      // Clean up uploaded file
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath)
      }
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype || '')) {
      // Clean up uploaded file
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath)
      }
      return res.status(400).json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      })
    }

    // Move file to final location
    const finalPath = path.join(uploadDir, file.newFilename)
    if (fs.existsSync(file.filepath)) {
      fs.renameSync(file.filepath, finalPath)
    }

    // Return the public URL
    const publicUrl = `/uploads/notes/${file.newFilename}`
    
    return res.status(200).json({ 
      url: publicUrl,
      filename: file.newFilename,
      size: file.size,
      mimetype: file.mimetype
    })

  } catch (error) {
    console.error('Error uploading image:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(400).json({ 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        })
      }
      if (error.message.includes('filter')) {
        return res.status(400).json({ 
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
        })
      }
    }
    
    return res.status(500).json({ error: 'Failed to upload image' })
  }
}
