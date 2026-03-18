import type { APIContext } from 'astro';

export const prerender = false;

interface Coupon {
  code: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

export async function POST(context: APIContext) {
  try {
    const { userId } = context.locals.auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { userId: targetUserId, couponCode } = await context.request.json();

    if (!targetUserId || !couponCode) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // First, fetch the current user data to get existing metadata
    const userResponse = await fetch(`https://api.clerk.dev/v1/users/${targetUserId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await userResponse.json();
    const currentMetadata = userData.unsafe_metadata || {};
    const currentCoupons = currentMetadata.coupons || [];

    // Check if coupon already exists
    const existingCoupon = currentCoupons.find((coupon: Coupon) => coupon.code === couponCode);
    if (existingCoupon) {
      return new Response(JSON.stringify({ error: 'Coupon already exists for this user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create new coupon
    const newCoupon: Coupon = {
      code: couponCode,
      assignedAt: new Date().toISOString(),
      assignedBy: userId,
      isActive: true,
    };

    // Update the user's metadata with the new coupon
    const response = await fetch(`https://api.clerk.dev/v1/users/${targetUserId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unsafe_metadata: {
          ...currentMetadata,
          coupons: [...currentCoupons, newCoupon],
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user metadata');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error assigning coupon:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
