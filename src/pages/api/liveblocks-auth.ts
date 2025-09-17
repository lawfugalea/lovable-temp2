import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { Liveblocks } from '@liveblocks/node';

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the user from the JWT token
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });
    
    if (!token || !token.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user info from database
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: token.sub as string },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Create a session for the current user
    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.name || user.email,
        email: user.email,
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`, // Random color for user
      },
    });

    // Give the user access to the room
    const { room } = req.body;
    if (room) {
      session.allow(room, session.FULL_ACCESS);
    }

    // Authorize the user and return the result
    const { status, body } = await session.authorize();
    return res.status(status).end(body);
  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
