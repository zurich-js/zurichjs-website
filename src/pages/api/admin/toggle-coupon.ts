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

    const { userId: targetUserId, couponCode, isActive } = req.body;

    if (!targetUserId || !couponCode || typeof isActive !== 'boolean') {
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

    // Update the specific coupon's status
    const updatedCoupons = currentCoupons.map((coupon: Coupon) => {
      if (coupon.code === couponCode) {
        return {
          ...coupon,
          isActive,
        };
      }
      return coupon;
    });

    // Update the user's metadata with the modified coupons array
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
    console.error('Error toggling coupon status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;
