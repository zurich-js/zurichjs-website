import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';

import { resolveSpeakerProfile } from '@/lib/cfp/speakerProfile';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const profile = await resolveSpeakerProfile(user);

    return res.status(200).json(profile);
  } catch (error: unknown) {
    console.error('Error fetching CFP prefill:', error);

    return res.status(500).json({
      error: 'Failed to fetch CFP prefill',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export default handler;
