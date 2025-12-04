import { clerkClient } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';



interface ReferralData {
  userId: string;
  email: string;
  date: string;
  type: string;
  creditValue: number;
}

interface UserReferralMetadata {
  credits?: number;
  referrals?: ReferralData[];
  referredBy?: {
    userId: string;
    name: string;
    date: string;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clerkClient();
    
    // Fetch all users to analyze referral data
    const usersList = await client.users.getUserList({
      limit: 500, // Increase limit to get more users
      orderBy: '-created_at',
    });
    const users = usersList.data;

    let totalReferrals = 0;
    let totalCreditsEarned = 0;
    let totalCreditsRedeemed = 0;
    let activeReferrers = 0;
    const recentReferrals: {
      referrerName: string;
      referrerEmail: string;
      referredEmail: string;
      creditsEarned: number;
      date: string;
    }[] = [];
    const topReferrers: {
      userId: string;
      name: string;
      email: string;
      totalReferrals: number;
      creditsEarned: number;
      joinDate: string;
    }[] = [];

    // Process each user's referral data
    for (const user of users) {
      const metadata = (user.unsafeMetadata as UserReferralMetadata) || {};
      const userReferrals = metadata.referrals || [];
      const userCredits = metadata.credits || 0;

      if (userReferrals.length > 0) {
        activeReferrers++;
        totalReferrals += userReferrals.length;
        
        // Calculate credits earned by this user
        const creditsEarned = userReferrals.reduce((sum, ref) => sum + (ref.creditValue || 0), 0);
        totalCreditsEarned += creditsEarned;

        // Add to top referrers
        topReferrers.push({
          userId: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
          email: user.primaryEmailAddress?.emailAddress || 'No email',
          totalReferrals: userReferrals.length,
          creditsEarned,
          joinDate: new Date(user.createdAt).toISOString(),
        });

        // Add recent referrals
        userReferrals.forEach(ref => {
          recentReferrals.push({
            referrerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
            referrerEmail: user.primaryEmailAddress?.emailAddress || 'No email',
            referredEmail: ref.email,
            creditsEarned: ref.creditValue || 0,
            date: ref.date,
          });
        });
      }

      // Calculate credits redeemed (assuming credits spent = initial credits - current credits)
      // This is a simplified calculation
      if (userCredits > 0) {
        totalCreditsRedeemed += Math.max(0, (metadata.credits || 0) - userCredits);
      }
    }

    // Sort and limit results
    topReferrers.sort((a, b) => b.totalReferrals - a.totalReferrals);
    recentReferrals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate conversion rate (simplified)
    const conversionRate = users.length > 0 ? Math.round((totalReferrals / users.length) * 100) : 0;

    // Define reward thresholds (from useReferrals hook)
    const rewardThresholds = [
      {
        name: 'Workshop Discount',
        creditsCost: 100,
        description: 'Discount on workshop purchases',
        redeemCount: 0, // Would need to track this separately
      },
      {
        name: 'ZurichJS T-Shirt',
        creditsCost: 500,
        description: 'Exclusive ZurichJS branded t-shirt',
        redeemCount: 0,
      },
      {
        name: 'Free Workshop Entry',
        creditsCost: 1000,
        description: 'Free entry to any workshop',
        redeemCount: 0,
      },
    ];

    const stats = {
      totalReferrals,
      totalCreditsEarned,
      totalCreditsRedeemed,
      activeReferrers,
      conversionRate,
      recentReferrals: recentReferrals.slice(0, 10), // Last 10 referrals
    };

    return res.status(200).json({
      stats,
      topReferrers: topReferrers.slice(0, 10), // Top 10 referrers
      rewardThresholds,
    });

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;
