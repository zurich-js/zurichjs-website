import type { APIContext } from 'astro';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

interface CheckoutCancelledBody {
  workshopId?: string;
  eventId?: string;
  ticketType?: string;
  itemTitle: string;
  reason: string;
  email: string;
}

export async function POST(context: APIContext) {
  try {
    const {
      workshopId,
      eventId,
      ticketType,
      itemTitle,
      reason,
      email
    } = await context.request.json() as CheckoutCancelledBody;

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
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Failed to send cancellation notification:', err);
    const error = err as { message: string };

    return new Response(JSON.stringify({
      error: error.message || 'An unknown error occurred',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
