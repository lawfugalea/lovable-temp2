// src/pages/api/household/name-suggestions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

interface NameSuggestion {
  name: string;
  type: string;
  description: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  // 1) Ensure signed in
  const sess = (await getServerSession(req, res, authOptions as any)) as any;
  const sessionId = sess?.user?.id as string | undefined;
  const sessionEmail = (sess?.user?.email as string | undefined)?.toLowerCase();

  if (!sessionId && !sessionEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2) Get user info for personalized suggestions
  const userName = sess?.user?.name || '';
  const userEmail = sess?.user?.email || '';
  const firstName = userName?.split(' ')[0] || userEmail.split('@')[0] || 'My';

  // 3) Generate smart suggestions
  const suggestions: NameSuggestion[] = [
    {
      name: `${firstName}'s Family`,
      type: 'family',
      description: 'Perfect for families with children'
    },
    {
      name: `${firstName}'s Home`,
      type: 'couple',
      description: 'Great for couples and partners'
    },
    {
      name: `${firstName}'s Place`,
      type: 'roommates',
      description: 'Ideal for roommates and shared living'
    },
    {
      name: `${firstName}'s Household`,
      type: 'personal',
      description: 'A general household name'
    },
    {
      name: `The ${firstName} Family`,
      type: 'family',
      description: 'A more formal family name'
    },
    {
      name: `${firstName} & Co.`,
      type: 'other',
      description: 'A fun, inclusive name'
    }
  ];

  // 4) Add some generic suggestions
  const genericSuggestions: NameSuggestion[] = [
    {
      name: 'Our Home',
      type: 'other',
      description: 'Simple and welcoming'
    },
    {
      name: 'The Nest',
      type: 'other',
      description: 'Cozy and warm'
    },
    {
      name: 'Home Sweet Home',
      type: 'other',
      description: 'Classic and comforting'
    }
  ];

  const allSuggestions = [...suggestions, ...genericSuggestions];

  return res.status(200).json({ 
    suggestions: allSuggestions,
    defaultType: 'personal'
  });
}

export default withApiHandler(handler)
