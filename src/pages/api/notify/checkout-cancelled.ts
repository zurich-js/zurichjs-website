import { NextApiRequest, NextApiResponse } from 'next';


import { sendPlatformNotification } from '@/lib/notification';


interface CheckoutCancelledBody {
  workshopId?: string;
  eventId?: string;
  ticketType?: string;
  itemTitle: string;
  reason: string;
  email: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      workshopId,
      eventId,
      ticketType, 
      itemTitle, 
      reason, 
      email 
    } = req.body as CheckoutCancelledBody;

    // Determine purchase type
    const isWorkshop = ticketType === 'workshop' || Boolean(workshopId);
    const itemId = isWorkshop ? workshopId : eventId;
    const itemType = isWorkshop ? 'Workshop' : 'Event';

    // Create a descriptive message
    const message = {
      title: `⚠️ Checkout Cancelled: ${itemTitle}`,
      message: `Type: ${itemType}
${itemType} ID: ${itemId || 'Not specified'}
${itemType}: ${itemTitle}
Reason: ${reason}
Customer Email: ${email}`,
      priority: 0,
    };

    // Send notification to platforms
    await sendPlatformNotification(message);

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

export default handler;
