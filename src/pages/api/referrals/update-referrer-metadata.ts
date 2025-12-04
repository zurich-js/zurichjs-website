import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';



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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Add logging to track API calls
  console.log('update-referrer-metadata API called', new Date().toISOString());

  try {
    // Get current user session to verify authentication
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { 
      referrerId, 
      refereeId, 
      refereeName, 
      refereeEmail, 
      date, 
      type, 
      creditValue 
    } = req.body;

    console.log('Request payload:', { referrerId, refereeId, type });

    // Validate required fields
    if (!referrerId || !refereeId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Prevent circular references - don't allow someone to be referred by someone they referred
    if (referrerId === refereeId) {
      console.log('Prevented self-referral attempt');
      return res.status(400).json({ 
        success: false, 
        message: 'Self-referrals are not allowed' 
      });
    }

    // Verify this is a legitimate request
    if (userId !== refereeId) {
      console.log('Unauthorized referral attempt:', { userId, refereeId });
      return res.status(403).json({ message: 'Forbidden: User can only update their own referral data' });
    }

    try {
      // Initialize the clerk client
      const client = await clerkClient();
      
      // Get the referrer user from Clerk
      const user = await client.users.getUser(referrerId);

      if (!user) {
        return res.status(404).json({ message: 'Referrer not found' });
      }

      // Get current metadata
      const currentMetadata = user.unsafeMetadata as UserMetadata;
      
      // Check if the referrer has a referredBy property pointing to the referee (circular reference)
      if (currentMetadata?.referredBy && (currentMetadata.referredBy as ReferredBy).userId === refereeId) {
        console.log('Prevented circular reference detected:', { referrerId, refereeId });
        return res.status(409).json({
          success: false,
          message: 'Circular reference detected. Cannot create mutual referral relationship.'
        });
      }
      
      // Initialize or update the referrals array
      const referrals = currentMetadata?.referrals || [];
      
      // Check if the referee is already in the referrer's referrals list
      const existingReferral = referrals.find(ref => ref.userId === refereeId);
      
      if (existingReferral) {
        // Already in the list, no need to add again
        console.log('Referral already exists:', { referrerId, refereeId });
        return res.status(200).json({ 
          success: true, 
          message: 'Referrer metadata already updated previously' 
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
      return res.status(200).json({ 
        success: true, 
        message: 'Referrer metadata updated successfully'
      });
    } catch (error) {
      console.error('Error updating referrer in Clerk:', error);
      return res.status(500).json({ message: 'Error updating referrer metadata' });
    }
  } catch (error) {
    console.error('Error in update-referrer-metadata API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default handler;
