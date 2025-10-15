import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';


import { withTelemetry } from '@/lib/multiplayer';
import { sendPlatformNotification } from '@/lib/notification';



async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId, eventTitle } = req.body;

  if (!eventId || !eventTitle) {
    return res.status(400).json({ error: 'Event ID and title are required' });
  }

  try {
    // Get user auth info from Clerk
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        requiresAuth: true 
      });
    }

    // Get user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.primaryEmailAddress?.emailAddress;
    const userName = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.username || 'Unknown User';

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Send notification about the interest registration
    await sendPlatformNotification({
      title: 'New Event Interest Registration',
      message: `${userName} (${userEmail}) registered interest for "${eventTitle}" (Event ID: ${eventId})`,
      priority: 1, // normal priority
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Interest registered successfully! We\'ll notify you when RSVP opens.',
      userEmail,
      userName
    });
  } catch (error) {
    console.error('Event interest registration error:', error);
    return res.status(500).json({ 
      error: 'Failed to register interest. Please try again later.' 
    });
  }
}

export default withTelemetry(handler, {
  spanName: 'events-register-interest',
  attributes: {
    'api.category': 'events',
    'service': 'event-management',
  },
});
