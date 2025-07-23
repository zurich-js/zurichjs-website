import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { size, delivery, priceId, isMember, quantity, shippingRateId } = req.body;
  if (!size || !priceId || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Calculate discount
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  if (isMember) {
    // TODO: Use real Stripe coupon/discount
    discounts = [{ coupon: 'zurichjs-community' }];
  }

  // Create Stripe Checkout session
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: 'payment',
      discounts,
      success_url: `${req.headers.origin}/tshirt?success=true&delivery=${delivery}&size=${size}&quantity=${quantity}`,
      cancel_url: `${req.headers.origin}/tshirt?canceled=true`,
      metadata: {
        size,
        delivery: delivery ? 'true' : 'false',
        quantity: String(quantity),
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            size,
            delivery: delivery ? 'true' : 'false',
            quantity: String(quantity),
          },
        },
      },
      customer_creation: 'always',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    };
    if (shippingRateId) {
      sessionParams.shipping_options = [
        { shipping_rate: shippingRateId },
      ];
    }
    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (err: unknown) {
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return res.status(500).json({ error: message });
  }
} 