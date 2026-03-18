import type { APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

export async function POST(context: APIContext) {
  // Get the authenticated user
  const { userId: adminId } = context.locals.auth();

  if (!adminId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify if the user is an admin (by role or organization membership)
    const clerk = await clerkClient();
    const adminUser = await clerk.users.getUser(adminId);

    // Check if user is admin (in a real app, check for admin role or org membership)
    const isAdmin = adminUser.publicMetadata?.role === 'admin' || true; // For demo purposes, always allow

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get request data
    const { userId, credits, action } = await context.request.json();

    if (!userId || credits === undefined || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (isNaN(credits) || (action !== 'set' && credits < 0)) {
      return new Response(JSON.stringify({ error: 'Credits must be a non-negative number' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the target user
    const user = await clerk.users.getUser(userId);

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get current credits or initialize if it doesn't exist
    const currentCredits = user.unsafeMetadata?.credits as number || 0;

    let newCreditValue: number;

    if (action === 'add') {
      newCreditValue = currentCredits + credits;
    } else if (action === 'remove') {
      newCreditValue = Math.max(0, currentCredits - credits);
    } else if (action === 'set') {
      newCreditValue = Math.max(0, credits); // Ensure we don't set negative credits
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "add", "remove", or "set"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the user's metadata
    await clerk.users.updateUser(userId, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        credits: newCreditValue,
      },
    });

    // Return success
    return new Response(JSON.stringify({
      success: true,
      credits: newCreditValue,
      message: `Successfully ${action === 'add' ? 'added' : action === 'remove' ? 'removed' : 'set'} credits to ${newCreditValue}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating credits:', error);
    return new Response(JSON.stringify({ error: 'Failed to update credits' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
