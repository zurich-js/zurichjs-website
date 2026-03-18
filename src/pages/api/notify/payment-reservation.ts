import type { APIContext } from 'astro';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const {
      name,
      email,
      streetAndNumber,
      postcode,
      city,
      country,
      ticketTitle,
      price,
      paymentMethod,
      workshopId,
      eventId,
      ticketType,
      coupon,
    } = await context.request.json();

    // Validate required fields
    if (!name || !email || !ticketTitle || !price || !paymentMethod) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create payment method text for notifications
    const paymentMethodText = paymentMethod === 'cash' ? 'Cash on Site' : 'Bank Transfer';

    // Create notification title
    const notificationTitle = `New ${paymentMethodText} Reservation: ${ticketTitle}`;

    // Create notification message with all relevant details
    const notificationMessage = `
      Name: ${name}
      Email: ${email}
      Address: ${streetAndNumber || 'Not provided'}
      Postcode: ${postcode || 'Not provided'}
      City: ${city || 'Not provided'}
      Country: ${country || 'Not provided'}
      Ticket: ${ticketTitle}
      Price: CHF ${price}
      Payment Method: ${paymentMethodText}
      Type: ${ticketType}
      ${workshopId ? `Workshop ID: ${workshopId}` : ''}
      ${eventId ? `Event ID: ${eventId}` : ''}
      ${coupon ? `Coupon: ${coupon}` : 'No coupon applied'}
      Time: ${new Date().toISOString()}
    `;


    await sendPlatformNotification({
      title: notificationTitle,
      message: notificationMessage,
      priority: 1, // High priority as number
      sound: 'incoming',
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending payment reservation notification:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send notification',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
