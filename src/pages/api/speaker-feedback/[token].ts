import type { APIContext } from 'astro';

import { getFeedbackBySpeakerId } from '@/sanity/queries/feedback';
import { verifyToken } from '@/utils/tokens';

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const { token } = context.params;

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ message: 'Missing token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the token and extract the speaker ID
    const payload = verifyToken(token);

    if (!payload || !payload.speakerId) {
      return new Response(JSON.stringify({ message: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { speakerId } = payload;

    // Fetch speaker feedback data using the centralized query function
    const feedbackData = await getFeedbackBySpeakerId(speakerId);

    if (!feedbackData) {
      return new Response(JSON.stringify({ message: 'Speaker not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(feedbackData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return new Response(JSON.stringify({ message: 'Error fetching feedback', error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
