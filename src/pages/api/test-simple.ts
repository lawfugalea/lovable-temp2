import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== SIMPLE TEST API ===')
    console.log('Method:', req.method)
    
    if (req.method === 'GET') {
      return res.status(200).json({ message: 'Simple test API working', timestamp: new Date().toISOString() })
    }
    
    if (req.method === 'PUT') {
      console.log('PUT request body:', req.body)
      return res.status(200).json({ message: 'PUT request received', body: req.body })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error in simple test API:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
