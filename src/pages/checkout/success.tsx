import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import ReferralTracker from '@/components/checkout/ReferralTracker';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { type = 'workshop' } = router.query;
  const [referrerInfo, setReferrerInfo] = useState<{ id: string; email: string } | null>(null);

  // Redirect to homepage after a delay if accessed directly
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!router.query.purchase_id) {
        router.push('/');
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);

  const handleReferralComplete = (info: { id: string; email: string } | null) => {
    setReferrerInfo(info);
    
    // In a real implementation, you might want to:
    // 1. Update the UI to show a thank you for the referral
    // 2. Show the name of the person who referred them
    // 3. Encourage them to refer others as well
  };

  return (
    <Layout>
      <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle size={48} className="text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You for Your Purchase!</h1>
            <div className="bg-yellow-400 h-1 w-24 mx-auto mb-6"></div>
            
            <p className="text-gray-700 mb-8">
              Your purchase was successful. You will receive a confirmation email shortly with all the details.
            </p>
            
            {referrerInfo && (
              <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 mb-6">
                <p className="text-teal-800">
                  Thanks for using a referral link! We&apos;ve credited your friend with ZurichJS points.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <Button 
                href="/profile"
                variant="primary"
                className="w-full"
              >
                Go to Your Profile
              </Button>
              
              <Button 
                href="/"
                variant="outline"
                className="w-full"
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Include the ReferralTracker component to process any referrals */}
      <ReferralTracker 
        type={typeof type === 'string' ? (type as 'workshop' | 'event' | 'other') : 'other'} 
        onComplete={handleReferralComplete} 
      />
    </Layout>
  );
} 