import type { APIContext } from 'astro';

import { getSpeakerById } from '@/sanity/queries/speakers';
import { generateSpeakerToken, generateSpeakerFeedbackUrl } from '@/utils/tokens';

export const prerender = false;

export async function POST(context: APIContext) {
  console.log('Generating feedback link');

  try {
    const { speakerId } = await context.request.json();

    if (!speakerId) {
      return new Response(JSON.stringify({ message: 'Missing speaker ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify that the speaker exists
    const speaker = await getSpeakerById(speakerId);

    if (!speaker) {
      return new Response(JSON.stringify({ message: 'Speaker not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate a feedback URL
    const url = context.url;
    const baseUrl = import.meta.env.PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
    const token = generateSpeakerToken(speakerId);
    const feedbackUrl = generateSpeakerFeedbackUrl(speakerId, baseUrl);

    return new Response(JSON.stringify({
      success: true,
      speaker: {
        name: speaker.name,
        email: speaker.email
      },
      token,
      feedbackUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating feedback link:', error);
    return new Response(JSON.stringify({
      message: 'Error generating feedback link',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
