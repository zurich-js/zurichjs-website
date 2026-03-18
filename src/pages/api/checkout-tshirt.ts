import type { APIContext } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

export async function POST(context: APIContext) {
  const { sizeQuantities, delivery, priceId, isMember, totalQuantity, shippingRateId, email, couponCode, deliveryAddress } = await context.request.json();

  if (!sizeQuantities || !priceId || !totalQuantity) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate sizeQuantities
  const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const hasValidItems = Object.entries(sizeQuantities).some(([size, qty]) =>
    validSizes.includes(size) && typeof qty === 'number' && qty > 0
  );

  if (!hasValidItems) {
    return new Response(JSON.stringify({ error: 'No valid items in order' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Calculate discount
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  if (isMember) {
    discounts = [{ coupon: 'zurichjs-community' }];
  }

  // Create Stripe Checkout session
  try {
    const origin = context.request.headers.get('origin') || '';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: Object.entries(sizeQuantities)
        .filter(([, qty]) => (qty as number) > 0)
        .map(([, qty]) => ({
          price: priceId,
          quantity: qty as number,
        })),
      mode: 'payment',
      discounts,
      success_url: `${origin}/tshirt?success=true&session_id={CHECKOUT_SESSION_ID}&delivery=${delivery}`,
      cancel_url: `${origin}/tshirt?canceled=true`,
      metadata: {
        sizes: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
        sizeQuantities: JSON.stringify(sizeQuantities),
        delivery: delivery ? 'true' : 'false',
        totalQuantity: String(totalQuantity),
        userEmail: email || '',
        couponCode: couponCode || '',
        deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : '',
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            sizes: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
            sizeQuantities: JSON.stringify(sizeQuantities),
            delivery: delivery ? 'true' : 'false',
            totalQuantity: String(totalQuantity),
            userEmail: email || '',
            couponCode: couponCode || '',
            deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : '',
          },
        },
      },
    };

    // Set customer email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    // Configure address collection for delivery orders
    if (delivery) {
      sessionParams.shipping_address_collection = {
        allowed_countries: ['CH'],
      };

      if (deliveryAddress) {
        sessionParams.customer_creation = 'always';
      }
    } else {
      sessionParams.billing_address_collection = 'required';
    }
    if (shippingRateId) {
      sessionParams.shipping_options = [
        { shipping_rate: shippingRateId },
      ];
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
