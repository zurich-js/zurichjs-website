import type { APIContext } from 'astro';
import { stripe } from '@/lib/stripe';

export const prerender = false;

export async function GET({ url }: APIContext) {
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(JSON.stringify({ error: 'Coupon code is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Retrieve the coupon from Stripe
    const coupon = await stripe.coupons.retrieve(code);

    if (!coupon || !coupon.valid) {
      return new Response(JSON.stringify({ error: 'Invalid coupon code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the coupon data for the client
    const couponData = {
      id: coupon.id,
      code: coupon.id,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      currency: coupon.currency,
      name: coupon.name,
      isValid: coupon.valid,
    };

    return new Response(JSON.stringify(couponData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Error validating coupon:', err);

    const error = err as { statusCode?: number; message: string };
    const statusCode = error.statusCode || 500;

    return new Response(JSON.stringify({
      error: statusCode === 404
        ? 'Coupon not found'
        : error.message || 'Error validating coupon',
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
