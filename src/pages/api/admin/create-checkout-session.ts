import type { APIContext } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

export async function POST(context: APIContext) {
  const { priceId, quantity, customerEmail, couponCode, mode } = await context.request.json();

  if (!priceId || !quantity || !customerEmail) {
    return new Response(JSON.stringify({ error: 'Missing required fields: priceId, quantity, customerEmail' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate the price exists
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product as string);

    // Prepare line items
    const lineItems = [{
      price: priceId,
      quantity: quantity,
    }];

    // Prepare discounts if coupon is provided
    let discountOptions = {};
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          discountOptions = {
            discounts: [{ coupon: couponCode }],
          };
        }
      } catch (err) {
        console.warn(`Coupon ${couponCode} not found or invalid:`, err);
      }
    }

    const origin = context.request.headers.get('origin') || '';

    // Create Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail, // This is the correct parameter for receipt email
      success_url: `${origin}/admin/tap-to-pay?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/admin/tap-to-pay?payment=cancelled`,
      metadata: {
        productId: product.id,
        productName: product.name,
        quantity: quantity.toString(),
        couponCode: couponCode || '',
        adminTapToPay: 'true',
        paymentMode: mode || 'card_entry',
        createdBy: 'admin-tap-to-pay',
      },
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      ...discountOptions,
    };

    // For iOS devices, optimize the checkout experience
    const userAgent = context.request.headers.get('user-agent') || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);

    if (isIOS) {
      // Optimize for mobile experience
      sessionParams.billing_address_collection = 'auto';
      sessionParams.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH'],
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({
      url: session.url,
      sessionId: session.id,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Error creating checkout session:', err);
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
