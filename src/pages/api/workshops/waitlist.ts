import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';

import { sendPlatformNotification } from '@/lib/notification';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistOutcome = 'walk-in' | 'email-when-available';

interface WaitlistRequestBody {
  workshopId?: string;
  workshopTitle?: string;
  email?: string;
  name?: string;
  outcome?: WaitlistOutcome;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    workshopId,
    workshopTitle,
    email: bodyEmail,
    name: bodyName,
    outcome,
  } = (req.body || {}) as WaitlistRequestBody;

  if (!workshopId || !workshopTitle) {
    return res.status(400).json({ error: 'Workshop ID and title are required' });
  }

  if (outcome !== 'walk-in' && outcome !== 'email-when-available') {
    return res.status(400).json({ error: 'Invalid waitlist outcome' });
  }

  try {
    // If signed in via Clerk, prefer that email/name (more trustworthy)
    const { userId } = getAuth(req);

    let email: string | undefined;
    let name: string | undefined;
    let source: 'authenticated' | 'guest' = 'guest';

    if (userId) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.primaryEmailAddress?.emailAddress;
      name = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username || undefined;
      source = 'authenticated';
    }

    if (!email && typeof bodyEmail === 'string') {
      email = bodyEmail.trim();
    }
    if (!name && typeof bodyName === 'string') {
      const trimmed = bodyName.trim();
      if (trimmed) name = trimmed;
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'A valid email is required to join the waitlist' });
    }

    const displayName = name || 'Guest';

    await sendPlatformNotification({
      title: 'New Workshop Waitlist Signup',
      message: [
        `*Workshop:* ${workshopTitle} (${workshopId})`,
        `*Name:* ${displayName}`,
        `*Email:* ${email}`,
        `*Source:* ${source}`,
      ].join('\n'),
      priority: 1,
    });

    return res.status(200).json({
      success: true,
      email,
      name: displayName,
      outcome,
    });
  } catch (error) {
    console.error('Workshop waitlist signup error:', error);
    return res.status(500).json({
      error: 'Failed to join the waitlist. Please try again later.',
    });
  }
}

export default handler;
