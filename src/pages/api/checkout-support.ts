import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

const SUPPORT_PRODUCT_ID = process.env.NODE_ENV === 'production' 
  ? 'prod_SkD5vsBEz5iO6W' // You'll fill this in later
  : 'prod_SkCbG5XY7IZzkT'; // Test product ID

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, amount, email } = req.body;
  
  if (!priceId && !amount) {
    return res.status(400).json({ error: 'Price ID or custom amount is required' });
  }

  try {
    let sessionParams: Stripe.Checkout.SessionCreateParams;
    
    if (amount && !priceId) {
      // For custom amounts, create a one-time payment
      const successParams = new URLSearchParams({
        success: 'true',
        donation_type: 'custom',
        amount: String(amount),
        currency: 'CHF'
      });
      
      if (email) {
        successParams.set('customer_email', email);
      }

      sessionParams = {
        line_items: [
          {
            price_data: {
              currency: 'chf',
              product: SUPPORT_PRODUCT_ID,
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/buy-us-a-coffee?${successParams.toString()}`,
        cancel_url: `${req.headers.origin}/buy-us-a-coffee?canceled=true`,
        metadata: {
          type: 'custom',
          amount: String(amount),
        },
      };
    } else {
      // Use the provided price ID
      const price = await stripe.prices.retrieve(priceId);
      const mode = price.type === 'recurring' ? 'subscription' : 'payment';
      
      const donationType = mode === 'subscription' ? 'monthly' : 'oneoff';
      const successParams = new URLSearchParams({
        success: 'true',
        donation_type: donationType,
        amount: String(price.unit_amount ? price.unit_amount / 100 : 0),
        currency: price.currency.toUpperCase()
      });
      
      if (email) {
        successParams.set('customer_email', email);
      }

      sessionParams = {
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode,
        success_url: `${req.headers.origin}/buy-us-a-coffee?${successParams.toString()}`,
        cancel_url: `${req.headers.origin}/buy-us-a-coffee?canceled=true`,
        metadata: {
          type: mode,
          priceId,
        },
      };
    }

    // Add customer email if provided
    if (email) {
      sessionParams.customer_email = email;
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