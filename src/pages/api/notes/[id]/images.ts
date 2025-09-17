import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      // Check if note exists and user has access
      const note = await prisma.note.findFirst({
        where: {
          id: id as string,
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
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Parse form data
      const form = formidable({
        uploadDir: path.join(process.cwd(), 'public/uploads/notes'),
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        filter: ({ mimetype }) => {
          return mimetype?.startsWith('image/') || false;
        }
      });

      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), 'public/uploads/notes');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const [fields, files] = await form.parse(req);
      const file = Array.isArray(files.image) ? files.image[0] : files.image;

      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalFilename || '');
      const filename = `${uuidv4()}${fileExtension}`;
      const newPath = path.join(uploadDir, filename);

      // Move file to final location
      fs.renameSync(file.filepath, newPath);

      // Create database record
      const image = await prisma.noteImage.create({
        data: {
          noteId: id as string,
          filename,
          originalName: file.originalFilename || 'image',
          mimeType: file.mimetype || 'image/jpeg',
          size: file.size || 0,
          url: `/uploads/notes/${filename}`
        }
      });

      return res.status(201).json(image);
    } catch (error) {
      console.error('Error uploading image:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  if (req.method === 'GET') {
    try {
      // Get all images for the note
      const images = await prisma.noteImage.findMany({
        where: { noteId: id as string },
        orderBy: { createdAt: 'asc' }
      });

      return res.status(200).json(images);
    } catch (error) {
      console.error('Error fetching images:', error);
      return res.status(500).json({ error: 'Failed to fetch images' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
