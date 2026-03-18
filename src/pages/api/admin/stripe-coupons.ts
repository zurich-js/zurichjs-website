import type { APIContext } from 'astro';
import { stripe } from '@/lib/stripe';

export const prerender = false;

export async function GET(_context: APIContext) {
  try {
    // Fetch coupons from Stripe
    const coupons = await stripe.coupons.list({
      limit: 100,
    });

    // Calculate stats
    const stats = {
      totalCoupons: coupons.data.length,
      activeCoupons: coupons.data.filter(c => c.valid).length,
      totalRedemptions: coupons.data.reduce((sum, c) => sum + c.times_redeemed, 0),
      mostUsedCoupon: coupons.data.reduce((most, current) =>
        current.times_redeemed > (most?.times_redeemed || 0) ? current : most
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      , null as any)
    };

    return new Response(JSON.stringify({
      coupons: coupons.data,
      stats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(context: APIContext) {
  try {
    const {
      id,
      name,
      discountType,
      percentOff,
      amountOff,
      currency,
      duration,
      durationInMonths,
      maxRedemptions,
      redeemBy,
      metadata
    } = await context.request.json();

    // Validate required fields
    if (!id || !discountType || !duration) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (discountType === 'percent' && (!percentOff || percentOff <= 0 || percentOff > 100)) {
      return new Response(JSON.stringify({ message: 'Invalid percent off value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (discountType === 'amount' && (!amountOff || amountOff <= 0)) {
      return new Response(JSON.stringify({ message: 'Invalid amount off value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build coupon parameters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const couponParams: Record<string, any> = {
      id,
      duration,
      metadata: metadata || {}
    };

    if (name) {
      couponParams.name = name;
    }

    if (discountType === 'percent') {
      couponParams.percent_off = parseFloat(percentOff);
    } else {
      couponParams.amount_off = Math.round(parseFloat(amountOff) * 100); // Convert to cents
      couponParams.currency = currency || 'usd';
    }

    if (duration === 'repeating') {
      if (!durationInMonths || durationInMonths <= 0) {
        return new Response(JSON.stringify({ message: 'Duration in months required for repeating coupons' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      couponParams.duration_in_months = parseInt(durationInMonths);
    }

    if (maxRedemptions && maxRedemptions > 0) {
      couponParams.max_redemptions = parseInt(maxRedemptions);
    }

    if (redeemBy) {
      couponParams.redeem_by = Math.floor(new Date(redeemBy).getTime() / 1000);
    }

    // Create coupon in Stripe
    const coupon = await stripe.coupons.create(couponParams);

    return new Response(JSON.stringify({
      message: 'Coupon created successfully',
      coupon
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating coupon:', error);

    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
