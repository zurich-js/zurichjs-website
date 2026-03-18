import type { APIContext } from 'astro';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const { name, email, message } = await context.request.json();

    if (!name || !email) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await sendPlatformNotification({
      title: `New Verein Membership Inquiry`,
      message: `Name: ${name}\nEmail: ${email}\nMessage: ${message || 'No message provided'}`,
      priority: 0
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Verein inquiry submitted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Verein inquiry error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to submit inquiry'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
