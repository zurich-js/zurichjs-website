import type { APIContext } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

const SUPPORT_PRODUCT_ID = import.meta.env.PROD
  ? 'prod_SkD5vsBEz5iO6W'
  : 'prod_SkCbG5XY7IZzkT';

export async function POST(context: APIContext) {
  const { priceId, amount, email, recurring } = await context.request.json();

  if (!priceId && !amount) {
    return new Response(JSON.stringify({ error: 'Price ID or custom amount is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const origin = context.request.headers.get('origin') || '';
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (amount && !priceId) {
      // For custom amounts, create based on recurring flag
      const isRecurring = recurring === true;
      const mode = isRecurring ? 'subscription' : 'payment';
      const donationType = isRecurring ? 'monthly' : 'custom';

      const successParams = new URLSearchParams({
        success: 'true',
        donation_type: donationType,
        amount: String(amount),
        currency: 'CHF'
      });

      if (email) {
        successParams.set('customer_email', email);
      }

      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
        currency: 'chf',
        product: SUPPORT_PRODUCT_ID,
        unit_amount: Math.round(amount * 100), // Convert to cents
      };

      // Add recurring info if it's a subscription
      if (isRecurring) {
        priceData.recurring = {
          interval: 'month',
        };
      }

      sessionParams = {
        line_items: [
          {
            price_data: priceData,
            quantity: 1,
          },
        ],
        mode,
        success_url: `${origin}/buy-us-a-coffee?${successParams.toString()}`,
        cancel_url: `${origin}/buy-us-a-coffee?canceled=true`,
        metadata: {
          type: mode,
          amount: String(amount),
          recurring: String(isRecurring),
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
        success_url: `${origin}/buy-us-a-coffee?${successParams.toString()}`,
        cancel_url: `${origin}/buy-us-a-coffee?canceled=true`,
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

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
