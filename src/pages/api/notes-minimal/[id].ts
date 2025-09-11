import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== MINIMAL NOTES API ===')
  console.log('Method:', req.method)
  console.log('Query:', req.query)
  console.log('Body:', req.body)
  
  if (req.method === 'PUT') {
    console.log('PUT request received successfully')
    return res.status(200).json({ 
      success: true, 
      message: 'Minimal API working',
      noteId: req.query.id,
      receivedData: req.body
    })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
