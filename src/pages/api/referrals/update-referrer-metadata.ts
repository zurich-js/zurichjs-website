import type { APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

interface ReferralInfo {
  userId: string;
  name: string;
  email: string;
  date: string;
  type: string;
  creditValue: number;
}

interface ReferredBy {
  userId: string;
  name: string;
  date: string;
}

interface UserMetadata {
  referrals?: ReferralInfo[];
  credits?: number;
  referredBy?: ReferredBy;
  [key: string]: unknown;
}

export async function POST(context: APIContext) {
  // Add logging to track API calls
  console.log('update-referrer-metadata API called', new Date().toISOString());

  try {
    // Get current user session to verify authentication
    const auth = context.locals.auth();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      referrerId,
      refereeId,
      refereeName,
      refereeEmail,
      date,
      type,
      creditValue
    } = await context.request.json();

    console.log('Request payload:', { referrerId, refereeId, type });

    // Validate required fields
    if (!referrerId || !refereeId) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent circular references - don't allow someone to be referred by someone they referred
    if (referrerId === refereeId) {
      console.log('Prevented self-referral attempt');
      return new Response(JSON.stringify({
        success: false,
        message: 'Self-referrals are not allowed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify this is a legitimate request
    if (userId !== refereeId) {
      console.log('Unauthorized referral attempt:', { userId, refereeId });
      return new Response(JSON.stringify({ message: 'Forbidden: User can only update their own referral data' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Initialize the clerk client
      const client = clerkClient(context);

      // Get the referrer user from Clerk
      const user = await client.users.getUser(referrerId);

      if (!user) {
        return new Response(JSON.stringify({ message: 'Referrer not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get current metadata
      const currentMetadata = user.unsafeMetadata as UserMetadata;

      // Check if the referrer has a referredBy property pointing to the referee (circular reference)
      if (currentMetadata?.referredBy && (currentMetadata.referredBy as ReferredBy).userId === refereeId) {
        console.log('Prevented circular reference detected:', { referrerId, refereeId });
        return new Response(JSON.stringify({
          success: false,
          message: 'Circular reference detected. Cannot create mutual referral relationship.'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Initialize or update the referrals array
      const referrals = currentMetadata?.referrals || [];

      // Check if the referee is already in the referrer's referrals list
      const existingReferral = referrals.find(ref => ref.userId === refereeId);

      if (existingReferral) {
        // Already in the list, no need to add again
        console.log('Referral already exists:', { referrerId, refereeId });
        return new Response(JSON.stringify({
          success: true,
          message: 'Referrer metadata already updated previously'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Add new referral
      const newReferral: ReferralInfo = {
        userId: refereeId,
        name: refereeName,
        email: refereeEmail || '',
        date: date || new Date().toISOString(),
        type: type || 'signup',
        creditValue: creditValue || 5
      };

      console.log('Adding new referral:', newReferral);

      // Update the referrer's metadata
      await client.users.updateUser(referrerId, {
        unsafeMetadata: {
          ...currentMetadata,
          referrals: [...referrals, newReferral],
          // Increment credits
          credits: ((currentMetadata?.credits || 0) + creditValue)
        },
      });

      console.log('Referrer metadata updated successfully');
      return new Response(JSON.stringify({
        success: true,
        message: 'Referrer metadata updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating referrer in Clerk:', error);
      return new Response(JSON.stringify({ message: 'Error updating referrer metadata' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in update-referrer-metadata API:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
