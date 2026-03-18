import type { APIContext } from 'astro';
import { stripe } from '@/lib/stripe';

export const prerender = false;

export async function GET(context: APIContext) {
  const { id } = context.params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Coupon ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Retrieve a specific coupon
    const coupon = await stripe.coupons.retrieve(id);

    return new Response(JSON.stringify({
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
        duration: coupon.duration,
        duration_in_months: coupon.duration_in_months,
        max_redemptions: coupon.max_redemptions,
        times_redeemed: 0, // Would need to be calculated from checkout sessions
        valid: coupon.valid,
        created: coupon.created,
        redeem_by: coupon.redeem_by,
        metadata: coupon.metadata,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error retrieving Stripe coupon:', error);

    if (error instanceof Error && error.message.includes('No such coupon')) {
      return new Response(JSON.stringify({
        error: 'Coupon not found',
        message: 'The specified coupon does not exist.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Failed to retrieve coupon',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(context: APIContext) {
  const { id } = context.params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Coupon ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Delete the coupon from Stripe
    const deletedCoupon = await stripe.coupons.del(id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Coupon deleted successfully',
      coupon: deletedCoupon,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting Stripe coupon:', error);

    // Handle specific Stripe errors
    if (error instanceof Error) {
      if (error.message.includes('No such coupon')) {
        return new Response(JSON.stringify({
          error: 'Coupon not found',
          message: 'The specified coupon does not exist or has already been deleted.'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        error: 'Failed to delete coupon',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Unknown error occurred while deleting coupon'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
