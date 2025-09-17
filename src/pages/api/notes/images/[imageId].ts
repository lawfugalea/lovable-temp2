import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { imageId } = req.query;

  if (req.method === 'DELETE') {
    try {
      // Check if image exists and user has access to the note
      const image = await prisma.noteImage.findFirst({
        where: {
          id: imageId as string,
          note: {
            OR: [
              { ownerId: session.user.id },
              { 
                household: {
                  members: {
                    some: { userId: session.user.id }
                  }
                }
              }
            ]
          }
        }
      });

      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), 'public', image.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await prisma.noteImage.delete({
        where: { id: imageId as string }
      });

      return res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error deleting image:', error);
      return res.status(500).json({ error: 'Failed to delete image' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
