import type { APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

export async function POST(context: APIContext) {
  const { eventId, eventTitle } = await context.request.json();

  if (!eventId || !eventTitle) {
    return new Response(JSON.stringify({ error: 'Event ID and title are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get user auth info from Clerk
    const auth = context.locals.auth();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        requiresAuth: true
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user details from Clerk
    const client = clerkClient(context);
    const user = await client.users.getUser(userId);
    const userEmail = user.primaryEmailAddress?.emailAddress;
    const userName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || 'Unknown User';

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'User email not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send notification about the interest registration
    await sendPlatformNotification({
      title: 'New Event Interest Registration',
      message: `${userName} (${userEmail}) registered interest for "${eventTitle}" (Event ID: ${eventId})`,
      priority: 1,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Interest registered successfully! We\'ll notify you when RSVP opens.',
      userEmail,
      userName
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Event interest registration error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to register interest. Please try again later.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
