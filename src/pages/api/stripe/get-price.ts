import { NextApiRequest, NextApiResponse } from 'next';


import { withTelemetry } from '@/lib/multiplayer';
import { stripe } from '@/lib/stripe';


async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId } = req.query;

  if (!priceId || typeof priceId !== 'string') {
    return res.status(400).json({ error: 'Price ID is required' });
  }

  try {
    const price = await stripe.prices.retrieve(priceId);
    
    return res.status(200).json({
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      type: price.type,
    });
  } catch (err: unknown) {
    console.error('Error fetching price:', err);
    const error = err as { statusCode?: number; message: string };
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error fetching price',
    });
  }
}

export default withTelemetry(handler, {
  spanName: 'stripe-get-price',
  attributes: {
    'api.category': 'payment',
    'service': 'stripe',
  },
});
