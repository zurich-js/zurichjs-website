import { NextApiRequest, NextApiResponse } from 'next';


import { getFeedbackBySpeakerId } from '@/sanity/queries';
import { verifyToken } from '@/utils/tokens';


async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Missing token' });
    }

    // Verify the token and extract the speaker ID
    const payload = verifyToken(token);

    if (!payload || !payload.speakerId) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const { speakerId } = payload;

    // Fetch speaker feedback data using the centralized query function
    const feedbackData = await getFeedbackBySpeakerId(speakerId);

    if (!feedbackData) {
      return res.status(404).json({ message: 'Speaker not found' });
    }

    res.status(200).json(feedbackData);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ message: 'Error fetching feedback', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export default handler;
