import { NextApiRequest, NextApiResponse } from 'next';

import { stripe } from '../../../lib/stripe';

interface CheckoutRequestBody {
  priceId: string;
  email?: string;
  quantity?: number;
  couponCode?: string;
  workshopId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, email, quantity = 1, couponCode, workshopId } = req.body as CheckoutRequestBody;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const origin = req.headers.origin || 'http://localhost:3000';
    const workshopPath = workshopId ? `/workshops/${workshopId}` : '';
    
    // Build query parameters for redirect URLs
    const successParams = new URLSearchParams({
      session_id: '{CHECKOUT_SESSION_ID}',
    });
    if (workshopId) {
      successParams.append('workshop_id', workshopId);
    }
    
    const cancelParams = new URLSearchParams();
    cancelParams.append('canceled', 'true');
    if (couponCode) {
      cancelParams.append('coupon', couponCode);
    }

    let discountOptions = {};
    if (couponCode) {
      // Validate the coupon exists before using it
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        
        if (coupon && coupon.valid) {
          discountOptions = {
            discounts: [{ coupon: couponCode }]
          };
        }
      } catch (err) {
        // If coupon doesn't exist, continue without discount
        console.warn(`Coupon ${couponCode} not found or invalid, proceeding without discount`, err);
      }
    }

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/success?${successParams.toString()}`,
      cancel_url: `${origin}${workshopPath}?${cancelParams.toString()}`,
      customer_email: email,
      ...(Object.keys(discountOptions).length > 0 ? discountOptions : {}),
      metadata: {
        workshopId: workshopId || '',
        couponCode: couponCode || '',
      },
    });

    // Return the URL in the response body instead of redirecting
    return res.status(200).json({ url: session.url });
  } catch (err: unknown) {
    console.error('Checkout error:', err);
    const error = err as { statusCode?: number; message: string };
    return res.status(error.statusCode || 500).json({
      error: error.message,
    });
  }
}
