import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';



import { withTelemetry } from '@/lib/multiplayer';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a connection token for Terminal SDK
    const connectionToken = await stripe.terminal.connectionTokens.create();

    return res.status(200).json({
      secret: connectionToken.secret,
    });
  } catch (err: unknown) {
    console.error('Error creating connection token:', err);
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return res.status(500).json({ error: message });
  }
}

export default withTelemetry(handler, {
  spanName: 'admin-connection-token',
  attributes: {
    'api.category': 'admin',
    'service': 'management',
  },
});
