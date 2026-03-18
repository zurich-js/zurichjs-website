import type { APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

export async function GET(context: APIContext) {
  const { id } = context.params;

  if (!id || typeof id !== 'string') {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize the clerk client
    const client = clerkClient(context);

    // Get user by ID
    const user = await client.users.getUser(id);

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return a sanitized user object with just the needed fields
    return new Response(JSON.stringify({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      profileImageUrl: user.imageUrl,
      createdAt: user.createdAt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching user:', error);

    return new Response(JSON.stringify({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
