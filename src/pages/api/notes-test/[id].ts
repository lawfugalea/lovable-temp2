import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== NOTES TEST API START ===')
    console.log('Method:', req.method)
    console.log('Query:', req.query)
    
    const session = await getServerSession(req, res, authOptions)
    console.log('Session check:', { hasSession: !!session, hasUser: !!session?.user })
    
    if (!session?.user?.email) {
      console.log('No session, returning 401')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    console.log('User lookup:', { found: !!user, userId: user?.id })

    if (!user) {
      console.log('User not found, returning 404')
      return res.status(404).json({ error: 'User not found' })
    }

    const { id } = req.query
    console.log('Note ID:', id)

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Note ID is required' })
    }

    if (req.method === 'PUT') {
      console.log('PUT request received')
      const { title, isShared } = req.body
      console.log('Request data:', { title, isShared })
      
      // Simple update without complex queries
      const note = await prisma.note.update({
        where: { id },
        data: { title: title || 'Updated' },
        select: { id: true, title: true, isShared: true }
      })
      
      console.log('Update successful:', note)
      return res.status(200).json({ note })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('=== ERROR IN NOTES TEST API ===', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
