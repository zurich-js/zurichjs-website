import { NextApiRequest, NextApiResponse } from 'next';

import { encodePaymentData } from '@/utils/encoding';

import { stripe } from '../../../lib/stripe';

interface CheckoutRequestBody {
  priceId: string;
  email?: string;
  quantity?: number;
  couponCode?: string;
  workshopId?: string;
  eventId?: string;
  ticketType?: 'workshop' | 'event';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      priceId, 
      email, 
      quantity = 1, 
      couponCode, 
      workshopId, 
      eventId,
      ticketType
    } = req.body as CheckoutRequestBody;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const origin = req.headers.origin || 'http://localhost:3000';
    
    // Determine the right path for success and cancel URLs
    let returnPath = '';
    if (workshopId) {
      returnPath = `/workshops/${workshopId}`;
    } else if (eventId) {
      returnPath = `/events/${eventId}`;
    }
    
    // For Stripe success URL, we keep session_id as a separate parameter and encode other data
    // IMPORTANT: Do NOT include session_id in the encoded data - it must remain a separate parameter
    const paymentData = {
      workshop_id: workshopId,
      event_id: eventId,
      ticket_type: ticketType,
      coupon: couponCode,
      // Do NOT include session_id here as Stripe needs to replace it in the URL
    };
    
    // Build success URL with Stripe session ID placeholder and encoded data
    // Note: Must use exactly {CHECKOUT_SESSION_ID} as the literal string for Stripe to replace it
    const successUrl = `${origin}/success?session_id={CHECKOUT_SESSION_ID}&data=${encodePaymentData(paymentData)}`;
    
    // Build cancel URL
    const cancelUrl = `${origin}${returnPath}?canceled=true${couponCode ? `&coupon=${encodeURIComponent(couponCode)}` : ''}`;

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
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      ...(Object.keys(discountOptions).length > 0 ? discountOptions : {}),
      metadata: {
        workshopId: workshopId || '',
        eventId: eventId || '',
        ticketType: ticketType || (workshopId ? 'workshop' : 'event'),
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
