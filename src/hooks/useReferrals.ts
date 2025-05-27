import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import { sendPlatformNotification } from '@/lib/notification';

interface ReferralData {
  credits: number;
  referrals: {
    userId: string;
    email: string;
    date: string;
    type: 'workshop' | 'event' | 'other';
    creditValue: number;
  }[];
  // Reward credit costs
  workshopDiscount: number;
  tshirt: number;
  workshopEntry: number;
  // Referral information
  referredBy?: {
    userId: string;
    name: string;
    date: string;
  };
}

interface ReferredBy {
  userId: string;
  name: string;
  date: string;
}

export const useReferrals = () => {
  const { user } = useUser();
  const router = useRouter();
  const [referralData, setReferralData] = useState<ReferralData>({ 
    credits: 0, 
    referrals: [], 
    workshopDiscount: 100, 
    tshirt: 500, 
    workshopEntry: 1000 
  });
  const [referredBy, setReferredBy] = useState<ReferredBy | null>(null);
  const [referralLink, setReferralLink] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Generate a secure referral token based on user ID
  const generateReferralToken = (userId: string): string => {
    // In a real implementation, you might want to use JWT or a more secure approach
    // For simplicity, we'll use base64 encoding with a salt
    const salt = 'ZurichJS_2024';
    return btoa(`${salt}_${userId}`);
  };

  // Get the current base URL (works in browser environments)
  const getBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    return '';
  };

  // Check if there's a referral in the URL or localStorage
  useEffect(() => {
    const checkForReferral = () => {
      // Check URL for referral token
      const { ref } = router.query;
      
      if (ref && typeof ref === 'string') {
        // Store referral in localStorage
        localStorage.setItem('zurichjs_referral', ref);
      }
    };
    
    checkForReferral();
  }, [router.query]);

  // Load referral data for the current user
  useEffect(() => {
    const loadReferralData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // In a real implementation, this would be an API call to your backend
        // For now, we'll mock data from localStorage
        const storedData = localStorage.getItem(`referral_data_${user.id}`);
        
        // Check if user was referred (from metadata)
        const referredByData = user.unsafeMetadata?.referredBy as ReferredBy;
        
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          
          // If there's referral data in metadata but not in local storage, add it
          if (referredByData && !parsedData.referredBy) {
            parsedData.referredBy = referredByData;
            localStorage.setItem(`referral_data_${user.id}`, JSON.stringify(parsedData));
          }
          
          setReferralData(parsedData);
          
          if (referredByData) {
            setReferredBy(referredByData);
          }
        } else {
          // Initialize with default values if no data exists
          const defaultData: ReferralData = {
            credits: 0,
            referrals: [],
            workshopDiscount: 100,
            tshirt: 500,
            workshopEntry: 1000,
            referredBy: referredByData || undefined
          };
          setReferralData(defaultData);
          localStorage.setItem(`referral_data_${user.id}`, JSON.stringify(defaultData));
          
          if (referredByData) {
            setReferredBy(referredByData);
          }
        }

        // Generate referral link
        if (user.id) {
          const token = generateReferralToken(user.id);
          const baseUrl = getBaseUrl();
          setReferralLink(`${baseUrl}/invite/${token}`);
        }
      } catch (error) {
        console.error('Error loading referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [user]);

  // Add credits to the user's account
  const addCredits = (amount: number) => {
    if (!user) return;
    
    const updatedData = {
      ...referralData,
      credits: referralData.credits + amount
    };
    
    setReferralData(updatedData);
    localStorage.setItem(`referral_data_${user.id}`, JSON.stringify(updatedData));
  };

  // Record a new referral
  const recordReferral = (
    referredUserId: string, 
    referredEmail: string, 
    type: 'workshop' | 'event' | 'other' = 'other',
    creditValue: number = 100
  ) => {
    if (!user) return;
    
    const newReferral = {
      userId: referredUserId,
      email: referredEmail,
      date: new Date().toISOString(),
      type,
      creditValue
    };
    
    const updatedData = {
      ...referralData,
      referrals: [...referralData.referrals, newReferral],
      credits: referralData.credits + creditValue
    };
    
    setReferralData(updatedData);
    localStorage.setItem(`referral_data_${user.id}`, JSON.stringify(updatedData));
  };

  // Get the current user's referrer (if any)
  const getCurrentReferrer = (): string | null => {
    const storedReferral = localStorage.getItem('zurichjs_referral');
    
    if (storedReferral) {
      try {
        // Decode the referral token to get the referrer's user ID
        const decoded = atob(storedReferral);
        const salt = 'ZurichJS_2024';
        const userId = decoded.replace(`${salt}_`, '');
        return userId;
      } catch (e) {
        console.error('Error decoding referral:', e);
        return null;
      }
    }
    
    return null;
  };

  // Record the referral relationship in Clerk metadata
  const saveReferralToMetadata = async (referrerId: string, referrerName: string) => {
    if (!user) return false;
    
    try {
      // Get current metadata to ensure we don't overwrite other values
      const currentMetadata = user.unsafeMetadata || {};
      
      // Check if there's already a referrer to avoid overwriting
      if (currentMetadata.referredBy) {
        console.log('User already has a referrer in metadata:', currentMetadata.referredBy);
        return true; // Already set up, consider it a success
      }
      
      // Create the referredBy data
      const referredByData = {
        userId: referrerId,
        name: referrerName,
        date: new Date().toISOString()
      };
      
      // Save referrer to the current user's metadata
      await user.update({
        unsafeMetadata: {
          ...currentMetadata,
          referredBy: referredByData
        }
      });
      
      // Update local state
      setReferredBy(referredByData);
      
      return true;
    } catch (error) {
      console.error('Error saving referral metadata:', error);
      return false;
    }
  };

  // Process a new user signup with referral
  const processReferralSignup = async (referrerId: string, referrerName: string) => {
    if (!user) return false;
    
    try {
      // 1. Save referrer to user metadata
      const metadataSaved = await saveReferralToMetadata(referrerId, referrerName);
      
      if (!metadataSaved) {
        throw new Error('Failed to save referral metadata');
      }
      
      // 2. Add initial signup credits (5 credits)
      addCredits(5);
      
      // 3. Update referralData with referredBy information
      const updatedReferralData = {
        ...referralData,
        referredBy: {
          userId: referrerId,
          name: referrerName,
          date: new Date().toISOString()
        }
      };
      setReferralData(updatedReferralData);
      localStorage.setItem(`referral_data_${user.id}`, JSON.stringify(updatedReferralData));
      
      // 4. Update referrer's metadata to include this user as a referral
      try {
        // Make an API call to update the referrer's metadata
        const response = await fetch('/api/referrals/update-referrer-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referrerId: referrerId,
            refereeId: user.id,
            refereeName: user.fullName || user.username || 'New User',
            refereeEmail: user.primaryEmailAddress?.emailAddress || '',
            date: new Date().toISOString(),
            type: 'signup',
            creditValue: 5
          }),
        });
        
        if (!response.ok) {
          console.error('Failed to update referrer metadata:', await response.text());
        }
      } catch (error) {
        console.error('Error updating referrer metadata:', error);
        // Continue even if this fails, as we've already updated the current user's metadata
      }
      
      // 5. Send platform notification
      try {
        await sendPlatformNotification({
          title: 'New Referral Signup',
          message: `${referrerName} successfully referred ${user.fullName || user.username || 'New User'} to ZurichJS!`,
          priority: 0,
          sound: 'success',
        });
      } catch (error) {
        console.error('Error sending platform notification:', error);
        // Continue even if notification fails
      }
      
      return true;
    } catch (error) {
      console.error('Error processing referral signup:', error);
      return false;
    }
  };

  return {
    referralData,
    referralLink,
    referredBy,
    loading,
    addCredits,
    recordReferral,
    getCurrentReferrer,
    saveReferralToMetadata,
    processReferralSignup
  };
}; 