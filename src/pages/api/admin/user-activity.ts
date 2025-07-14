import { clerkClient } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';

interface UserActivityData {
  userId: string;
  name: string;
  email: string;
  joinDate: string;
  lastActiveAt: string | null;
  lastSignInAt: string | null;
  activityScore: number;
  events: {
    eventName: string;
    eventType: string;
    timestamp: string;
  }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clerkClient();
    
    // Fetch all users
    const usersList = await client.users.getUserList({
      limit: 1000,
      orderBy: '-created_at',
    });
    const users = usersList.data;

    const totalUsers = users.length;
    let activeUsers = 0;
    let newUsersThisMonth = 0;
    let totalActivityScore = 0;
    const userActivityData: UserActivityData[] = [];
    const recentActivity: {
      userId: string;
      userName: string;
      activity: string;
      timestamp: string;
    }[] = [];

    // Calculate date for "this month"
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Process each user
    for (const user of users) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown';
      const email = user.primaryEmailAddress?.emailAddress || 'No email';
      const joinDate = new Date(user.createdAt).toISOString();
      const lastActiveAt = user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null;
      const lastSignInAt = user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null;

      // Calculate activity score based on various factors
      let activityScore = 0;
      
      // Base score for having an account
      activityScore += 10;

      // Score for recent activity
      if (lastActiveAt) {
        const daysSinceActive = (now.getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActive <= 7) activityScore += 30;
        else if (daysSinceActive <= 30) activityScore += 20;
        else if (daysSinceActive <= 90) activityScore += 10;
      }

      // Score for recent sign-in
      if (lastSignInAt) {
        const daysSinceSignIn = (now.getTime() - new Date(lastSignInAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSignIn <= 7) activityScore += 25;
        else if (daysSinceSignIn <= 30) activityScore += 15;
        else if (daysSinceSignIn <= 90) activityScore += 5;
      }

      // Score for metadata (credits, referrals, etc.)
      const metadata = user.unsafeMetadata || {};
      if (metadata.credits && typeof metadata.credits === 'number') {
        activityScore += Math.min(metadata.credits * 0.1, 20);
      }
      if (metadata.referrals && Array.isArray(metadata.referrals)) {
        activityScore += Math.min(metadata.referrals.length * 5, 15);
      }

      // Consider user as active if they have some activity in the last 30 days
      if (lastActiveAt && (now.getTime() - new Date(lastActiveAt).getTime()) <= 30 * 24 * 60 * 60 * 1000) {
        activeUsers++;
      }

      // Count new users this month
      if (new Date(user.createdAt) >= thisMonth) {
        newUsersThisMonth++;
      }

      totalActivityScore += activityScore;

      // Create user activity data
      const userActivity: UserActivityData = {
        userId: user.id,
        name,
        email,
        joinDate,
        lastActiveAt,
        lastSignInAt,
        activityScore: Math.round(activityScore),
        events: [], // This could be populated with actual event data if available
      };

      userActivityData.push(userActivity);

      // Add to recent activity if user was active recently
      if (lastActiveAt && (now.getTime() - new Date(lastActiveAt).getTime()) <= 7 * 24 * 60 * 60 * 1000) {
        recentActivity.push({
          userId: user.id,
          userName: name,
          activity: 'Recent login',
          timestamp: lastActiveAt,
        });
      }
    }

    // Calculate average activity score
    const avgActivityScore = totalUsers > 0 ? Math.round(totalActivityScore / totalUsers) : 0;

    // Sort recent activity by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Get top active users
    const topActiveUsers = [...userActivityData]
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10);

    const stats = {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      avgActivityScore,
      topActiveUsers,
      recentActivity: recentActivity.slice(0, 20), // Last 20 activities
    };

    return res.status(200).json({
      stats,
      users: userActivityData,
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 