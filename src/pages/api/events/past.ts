import type { NextApiRequest, NextApiResponse } from 'next';

import { getEventListingEvents } from '@/sanity/queries';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const events = await getEventListingEvents({ type: 'past' });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching past events:', error);
    return res.status(500).json({ message: 'Error fetching past events' });
  }
}
