import { NextApiRequest, NextApiResponse } from 'next';


import { withTelemetry } from '@/lib/multiplayer';
import { sendPlatformNotification } from '@/lib/notification';
import { stripe } from '@/lib/stripe';


interface PurchaseSuccessBody {
  sessionId: string;
  workshopId?: string;
  eventId?: string;
  ticketType?: string;
  email: string;
  coupon?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, workshopId, eventId, ticketType, email, coupon } = req.body as PurchaseSuccessBody;

    // Determine purchase type and item name
    const isWorkshop = ticketType === 'workshop' || Boolean(workshopId);
    const isEvent = ticketType === 'event' || Boolean(eventId);

    // Get the item name based on the ID
    let itemName = 'Unknown Purchase';
    let itemId = '';
    
    if (isWorkshop) {
      itemId = workshopId || '';
      if (workshopId === 'nodejs-threads') {
        itemName = 'Node.js Threads Workshop';
      } else if (workshopId === 'astro-zero-to-hero') {
        itemName = 'Astro: Zero to Hero Workshop';
      } else {
        itemName = 'Workshop Ticket';
      }
    } else if (isEvent) {
      itemId = eventId || '';
      itemName = 'Pro Meetup Event Ticket';
    }

    // Try to get price and coupon information from Stripe session
    let couponInfo = 'No discount applied';
    let priceInfo = '';
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId as string, {
        expand: ['line_items']
      });
      
      // Get price information
      const lineItems = session.line_items?.data;
      if (lineItems && lineItems.length > 0) {
        const amount = lineItems[0].amount_total / 100; // Convert from cents to currency unit
        const currency = lineItems[0].currency.toUpperCase();
        const quantity = lineItems[0].quantity || 1;
        
        priceInfo = `Amount: ${amount} ${currency} × ${quantity}`;
      }
      
      // First check if we have the coupon in our request body (from base64 encoded data)
      if (coupon) {
        couponInfo = `Coupon used: ${coupon}`;
      } 
      // Fall back to the metadata from Stripe session
      else if (session.metadata?.couponCode) {
        couponInfo = `Coupon used: ${session.metadata.couponCode}`;
      }
    } catch (err) {
      console.warn('Could not retrieve session information', err);
      
      // If we couldn't get session info but have coupon in the request, use that
      if (coupon) {
        couponInfo = `Coupon used: ${coupon}`;
      }
    }

    // Create a descriptive message
    const message = {
      title: `🎟️ New Purchase: ${itemName}`,
      message: `Session ID: ${sessionId}
Type: ${isWorkshop ? 'Workshop' : 'Event'}
${isWorkshop ? 'Workshop' : 'Event'} ID: ${itemId}
${isWorkshop ? 'Workshop' : 'Event'}: ${itemName}
${priceInfo}
Customer Email: ${email}
${couponInfo}`,
      priority: 1,
    };

    // Send notification to platforms
    await sendPlatformNotification(message);

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

export default withTelemetry(handler, {
  spanName: 'notify-purchase-success',
  attributes: {
    'api.category': 'notification',
    'service': 'notifications',
  },
});
