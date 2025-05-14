import { NextApiRequest, NextApiResponse } from 'next';

import { sendPushoverNotification } from '@/lib/pushover';

interface CheckoutCancelledBody {
  workshopId: string;
  workshopTitle: string;
  reason: string;
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
    const { workshopId, workshopTitle, reason, email } = req.body as CheckoutCancelledBody;

    // Create a descriptive message
    const message = {
      title: `⚠️ Checkout Cancelled: ${workshopTitle}`,
      message: `Workshop ID: ${workshopId}\nWorkshop: ${workshopTitle}\nReason: ${reason}\nEmail: ${email}`,
      priority: 0,
    };

    // Send notification to Pushover
    await sendPushoverNotification(message);

    // Return success response
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error('Failed to send cancellation notification:', err);
    const error = err as { message: string };
    
    return res.status(500).json({
      error: error.message || 'An unknown error occurred',
    });
  }
} 