import type { APIContext } from 'astro';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const { companyName, contactName, email, phone, message, tierInterest, venueDetails } = await context.request.json();

    // Basic validation
    if (!companyName || !contactName || !email) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the notification message
    const notificationMessage = {
      title: `New Partnership Inquiry: ${companyName}`,
      message: `
        Tier: ${tierInterest}
        Contact: ${contactName}
        Email: ${email}
        Phone: ${phone || 'Not provided'}
        Message: ${message || 'No message provided'}
        ${tierInterest === 'venue' ? `
        Venue Details:
        - Can provide food/drinks: ${venueDetails?.canProvideFoodDrinks ? 'Yes' : 'No'}
        - Venue capacity: ${venueDetails?.venueCapacity || 'Not specified'}
        ` : ''}
      `,
      priority: 0
    };

    // Send the notification
    await sendPlatformNotification(notificationMessage);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Partnership inquiry submitted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Partnership inquiry error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to submit partnership inquiry'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
