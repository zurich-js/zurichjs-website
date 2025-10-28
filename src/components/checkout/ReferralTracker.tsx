import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

import { useReferrals } from '@/hooks/useReferrals';

interface ReferralTrackerProps {
  type: 'workshop' | 'event' | 'other';
  onComplete?: (referrerInfo: { id: string; email: string } | null) => void;
}

/**
 * KitComponent to track referrals during checkout process
 *
 * Include this component in checkout/success pages to track when a referred user
 * completes a purchase, so the referrer can be credited.
 */
export default function ReferralTracker({ type, onComplete }: ReferralTrackerProps) {
  const { user } = useUser();
  const { getCurrentReferrer } = useReferrals();

  useEffect(() => {
    const processReferral = async () => {
      if (!user) return;

      // Get referrer from localStorage
      const referrerId = getCurrentReferrer();

      if (referrerId) {
        try {
          // Make API call to process the referral
          console.log(`Processing referral for user ${user.id} referred by ${referrerId}`);

          const response = await fetch('/api/referrals/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrerId,
              userId: user.id,
              userEmail: user.primaryEmailAddress?.emailAddress,
              purchaseType: type
            })
          });

          const data = await response.json();

          // Notify parent component if needed
          if (onComplete && data.success) {
            onComplete({
              id: data.referrer.id,
              email: data.referrer.email
            });
          }

          // Clear the referral after successful processing
          // Uncomment this if you want to clear the referral after first use
          // localStorage.removeItem('zurichjs_referral');
        } catch (error) {
          console.error('Error processing referral:', error);
          if (onComplete) onComplete(null);
        }
      } else {
        if (onComplete) onComplete(null);
      }
    };

    processReferral();
  }, [user, getCurrentReferrer, type, onComplete]);

  // This is a utility component that doesn't render anything
  return null;
}
