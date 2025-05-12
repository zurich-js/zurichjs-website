import { NextApiRequest, NextApiResponse } from 'next';

import { stripe } from '../../../lib/stripe';

interface CheckoutRequestBody {
  priceId: string;
  email?: string;
  quantity?: number;
  couponCode?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, email, quantity = 1, couponCode } = req.body as CheckoutRequestBody;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const origin = req.headers.origin || 'http://localhost:3000';

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      customer_email: email,
      ...(couponCode && { discounts: [{ coupon: couponCode }] }),
    });

    // Return the URL in the response body instead of redirecting
    return res.status(200).json({ url: session.url });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message: string };
    return res.status(error.statusCode || 500).json({
      error: error.message,
    });
  }
}
