import { clerkClient } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';

interface UserEmail {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  lastActiveAt: string | null;
  surveyData?: {
    role?: string;
    company?: string;
    interests?: string[];
    experience?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clerkClient();
    
    // Fetch all users
    const usersList = await client.users.getUserList({
      limit: 1000, // Adjust limit as needed
      orderBy: '-created_at',
    });
    const users = usersList.data;

    // Transform users to the format needed for email functionality
    const userEmails: UserEmail[] = users.map(user => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown';
      const email = user.primaryEmailAddress?.emailAddress || 'No email';
      const joinDate = new Date(user.createdAt).toISOString();
      const lastActiveAt = user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null;
      
      // Extract survey data from user metadata
      const metadata = user.unsafeMetadata || {};
      const surveyData = metadata.surveyData as {
        role?: string;
        company?: string;
        interests?: string[];
        experience?: string;
      } | undefined;

      return {
        id: user.id,
        name,
        email,
        joinDate,
        lastActiveAt,
        surveyData,
      };
    });

    // Filter out users without email addresses
    const usersWithEmails = userEmails.filter(user => user.email && user.email !== 'No email');

    return res.status(200).json({
      users: usersWithEmails,
      totalUsers: usersWithEmails.length,
    });

  } catch (error) {
    console.error('Error fetching user emails:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 