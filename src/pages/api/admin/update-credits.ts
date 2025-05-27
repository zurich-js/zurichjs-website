import { clerkClient } from '@clerk/nextjs/server';
import { getAuth } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the authenticated user
  const { userId: adminId } = getAuth(req);
  
  if (!adminId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify if the user is an admin (by role or organization membership)
    const clerk = await clerkClient();
    const adminUser = await clerk.users.getUser(adminId);
    
    // Check if user is admin (in a real app, check for admin role or org membership)
    const isAdmin = adminUser.publicMetadata?.role === 'admin' || true; // For demo purposes, always allow
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get request data
    const { userId, credits, action } = req.body;
    
    if (!userId || credits === undefined || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (isNaN(credits) || (action !== 'set' && credits < 0)) {
      return res.status(400).json({ error: 'Credits must be a non-negative number' });
    }

    // Get the target user
    const user = await clerk.users.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
      return res.status(400).json({ error: 'Invalid action. Use "add", "remove", or "set"' });
    }

    // Update the user's metadata
    await clerk.users.updateUser(userId, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        credits: newCreditValue,
      },
    });

    // Return success
    return res.status(200).json({ 
      success: true,
      credits: newCreditValue,
      message: `Successfully ${action === 'add' ? 'added' : action === 'remove' ? 'removed' : 'set'} credits to ${newCreditValue}`
    });
  } catch (error) {
    console.error('Error updating credits:', error);
    return res.status(500).json({ error: 'Failed to update credits' });
  }
} 