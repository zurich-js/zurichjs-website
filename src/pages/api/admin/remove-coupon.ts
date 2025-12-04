import { getAuth } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';



interface Coupon {
  code: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId: targetUserId, couponCode } = req.body;

    if (!targetUserId || !couponCode) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Filter out the coupon to be removed
    const updatedCoupons = currentCoupons.filter(
      (coupon: Coupon) => coupon.code !== couponCode
    );

    // Update the user's metadata
    const response = await fetch(`https://api.clerk.dev/v1/users/${targetUserId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unsafe_metadata: {
          ...currentMetadata,
          coupons: updatedCoupons,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user metadata');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing coupon:', error);
    return res.status(500).json({ error: 'Failed to remove coupon' });
  }
}

export default handler;
