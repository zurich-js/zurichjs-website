import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sizeQuantities, delivery, priceId, isMember, totalQuantity, shippingRateId } = req.body;
  if (!sizeQuantities || !priceId || !totalQuantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate sizeQuantities
  const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const hasValidItems = Object.entries(sizeQuantities).some(([size, qty]) => 
    validSizes.includes(size) && typeof qty === 'number' && qty > 0
  );
  
  if (!hasValidItems) {
    return res.status(400).json({ error: 'No valid items in order' });
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
      line_items: Object.entries(sizeQuantities)
        .filter(([, qty]) => (qty as number) > 0)
        .map(([, qty]) => ({
          price: priceId,
          quantity: qty as number,
        })),
      mode: 'payment',
      discounts,
      success_url: `${req.headers.origin}/tshirt?success=true&delivery=${delivery}`,
      cancel_url: `${req.headers.origin}/tshirt?canceled=true`,
      metadata: {
        sizes: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
        sizeQuantities: JSON.stringify(sizeQuantities),
        delivery: delivery ? 'true' : 'false',
        totalQuantity: String(totalQuantity),
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            sizes: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
            sizeQuantities: JSON.stringify(sizeQuantities),
            delivery: delivery ? 'true' : 'false',
            totalQuantity: String(totalQuantity),
          },
        },
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