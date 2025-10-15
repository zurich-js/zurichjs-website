import { clerkClient } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';



import { withTelemetry } from '@/lib/multiplayer';
// Define types for survey data
interface SurveyData {
  role: string;
  company: string;
  interests: string[];
  experience: string;
  newsletter: boolean;
}

interface UserMetadata {
  surveyData?: SurveyData;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize the clerk client
    const client = await clerkClient();
    
    // Get total user count
    const totalCount = await client.users.getCount();
    
    // Get users list to analyze metadata
    const { data: users } = await client.users.getUserList({
      limit: 500 // Get a larger sample for analysis
    });
    

    // Initialize stats
    const stats = {
      totalUsers: totalCount,
      activeUsers: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0
      },
      surveyStats: {
        totalSubmitted: 0,
        roleDistribution: {} as Record<string, number>,
        experienceDistribution: {} as Record<string, number>,
        newsletterSubscribers: 0,
        topInterests: [] as { name: string; count: number }[]
      }
    };
    
    // Calculate time thresholds
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    const last7Days = now - (7 * 24 * 60 * 60 * 1000);
    const last30Days = now - (30 * 24 * 60 * 60 * 1000);
    
    // Track all interests
    const interestsCount: Record<string, number> = {};
    
    // Process each user
    users.forEach(user => {
      // Check active users
      if (user.lastActiveAt) {
        if (user.lastActiveAt >= last24Hours) {
          stats.activeUsers.last24Hours++;
        }
        if (user.lastActiveAt >= last7Days) {
          stats.activeUsers.last7Days++;
        }
        if (user.lastActiveAt >= last30Days) {
          stats.activeUsers.last30Days++;
        }
      }
      
      // Check survey data
      const metadata = user.unsafeMetadata as UserMetadata;
      const surveyData = metadata?.surveyData;
      
      if (surveyData) {
        stats.surveyStats.totalSubmitted++;
        
        // Count roles
        if (surveyData.role) {
          stats.surveyStats.roleDistribution[surveyData.role] = 
            (stats.surveyStats.roleDistribution[surveyData.role] || 0) + 1;
        }
        
        // Count experience levels
        if (surveyData.experience) {
          stats.surveyStats.experienceDistribution[surveyData.experience] = 
            (stats.surveyStats.experienceDistribution[surveyData.experience] || 0) + 1;
        }
        
        // Count newsletter subscribers
        if (surveyData.newsletter) {
          stats.surveyStats.newsletterSubscribers++;
        }
        
        // Count interests
        if (Array.isArray(surveyData.interests)) {
          surveyData.interests.forEach((interest: string) => {
            interestsCount[interest] = (interestsCount[interest] || 0) + 1;
          });
        }
      }
    });
    
    // Calculate top interests
    stats.surveyStats.topInterests = Object.entries(interestsCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Get top 10 interests
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
}

export default withTelemetry(handler, {
  spanName: 'admin-user-stats',
  attributes: {
    'api.category': 'admin',
    'service': 'management',
  },
});
