import { NextApiRequest, NextApiResponse } from 'next';

import { getSpeakerById } from '@/sanity/queries';
import { generateSpeakerToken, generateSpeakerFeedbackUrl } from '@/utils/tokens';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('Generating feedback link');

  try {
    const { speakerId } = req.body;

    if (!speakerId) {
      return res.status(400).json({ message: 'Missing speaker ID' });
    }

    // Verify that the speaker exists
    const speaker = await getSpeakerById(speakerId)

    if (!speaker) {
      return res.status(404).json({ message: 'Speaker not found' });
    }

    // Generate a feedback URL
    const host = req.headers.host || '';
    const protocol = host.includes('localhost') ? 'http://' : 'https://';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}${host}`;
    const token = generateSpeakerToken(speakerId);
    const feedbackUrl = generateSpeakerFeedbackUrl(speakerId, baseUrl);

    return res.status(200).json({
      success: true,
      speaker: {
        name: speaker.name,
        email: speaker.email
      },
      token,
      feedbackUrl
    });
  } catch (error) {
    console.error('Error generating feedback link:', error);
    return res.status(500).json({ 
      message: 'Error generating feedback link',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}