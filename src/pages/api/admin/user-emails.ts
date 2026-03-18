import type { APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

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

export async function GET(_context: APIContext) {
  try {
    const client = await clerkClient();

    // Fetch all users
    const usersList = await client.users.getUserList({
      limit: 500, // Adjust limit as needed
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

    return new Response(JSON.stringify({
      users: usersWithEmails,
      totalUsers: usersWithEmails.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching user emails:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
