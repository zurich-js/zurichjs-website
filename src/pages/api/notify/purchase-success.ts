import { NextApiRequest, NextApiResponse } from 'next';

import { sendPushoverNotification } from '@/lib/pushover';
import { stripe } from '@/lib/stripe';

interface PurchaseSuccessBody {
  sessionId: string;
  workshopId: string;
  email: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, workshopId, email } = req.body as PurchaseSuccessBody;

    // Get the workshop name based on the ID
    let workshopName = 'Unknown Workshop';
    
    if (workshopId === 'nodejs-threads') {
      workshopName = 'Node.js Threads Workshop';
    } else if (workshopId === 'astro-zero-to-hero') {
      workshopName = 'Astro: Zero to Hero Workshop';
    }

    // Try to get coupon information from Stripe session
    let couponInfo = 'No discount applied';
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId as string);
      
      // Use the coupon info from metadata which we set in checkout-sessions.ts
      if (session.metadata?.couponCode) {
        couponInfo = `Coupon used: ${session.metadata.couponCode}`;
      }
    } catch (err) {
      console.warn('Could not retrieve coupon information from session', err);
    }

    // Create a descriptive message
    const message = {
      title: `🎟️ New Purchase: ${workshopName}`,
      message: `Session ID: ${sessionId}\nWorkshop ID: ${workshopId}\nWorkshop: ${workshopName}\nEmail: ${email}\n${couponInfo}`,
      priority: 1,
    };

    // Send notification to Pushover
    await sendPushoverNotification(message);

    // Return success response
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error('Failed to send purchase notification:', err);
    const error = err as { message: string };
    
    return res.status(500).json({
      error: error.message || 'An unknown error occurred',
    });
  }
} 