import { useUser } from '@clerk/nextjs';
import { Gift, ArrowLeft, Award, Star, ShoppingBag, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState } from 'react';

import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { useReferrals } from '@/hooks/useReferrals';

interface RewardItem {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  icon: JSX.Element;
}

export default function RewardsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { referralData, addCredits } = useReferrals();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [showEarnInfo, setShowEarnInfo] = useState(false);

  if (!isLoaded || !user) {
    return (
      <Layout>
        <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Loading...</h1>
              <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Available rewards
  const rewards: RewardItem[] = [
    {
      id: 'workshop_discount',
      name: 'Workshop Discount (50%)',
      description: 'Get a 50% discount code for any upcoming workshop',
      creditCost: 500,
      icon: <Star className="w-6 h-6 text-purple-600" />
    },
    {
      id: 'pro_meetup',
      name: 'Free Pro Meetup Ticket',
      description: 'Get a free ticket to any pro ZurichJS event',
      creditCost: 100,
      icon: <Gift className="w-6 h-6 text-blue-600" />
    },
    {
      id: 'tshirt',
      name: 'ZurichJS T-shirt',
      description: 'High-quality ZurichJS branded t-shirt',
      creditCost: 250,
      icon: <ShoppingBag className="w-6 h-6 text-green-600" />
    },
    {
      id: 'sticker_pack',
      name: 'Sticker Pack',
      description: 'Collection of ZurichJS branded stickers',
      creditCost: 50,
      icon: <Award className="w-6 h-6 text-yellow-600" />
    }
  ];

  const handleRedeem = async (rewardId: string) => {
    setRedeeming(rewardId);
    
    try {
      // Find the reward
      const reward = rewards.find(r => r.id === rewardId);
      
      if (!reward) {
        throw new Error('Reward not found');
      }
      
      // Check if user has enough credits
      if ((referralData?.credits || 0) < reward.creditCost) {
        alert('You don\'t have enough credits for this reward');
        setRedeeming(null);
        return;
      }
      
      // In a real implementation, you would make an API call to your backend
      // to record the redemption and generate any necessary codes
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Deduct credits (this is a simplified implementation)
      addCredits(-reward.creditCost);
      
      // Show success message
      setRedeemSuccess(rewardId);
      setTimeout(() => setRedeemSuccess(null), 3000);
    } catch (error) {
      console.error('Error redeeming reward:', error);
      alert('There was an error redeeming your reward. Please try again.');
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <Layout>
      <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </button>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Your Rewards</h1>
            <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            <p className="text-black text-lg md:text-xl max-w-2xl mx-auto">
              Redeem your credits for exclusive ZurichJS rewards
            </p>
          </div>
          
          {/* Credit Balance Card */}
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl shadow-lg p-6 mb-10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Credit Balance</h2>
                <p className="text-gray-700">Earn more credits by referring friends to ZurichJS</p>
              </div>
              <div className="bg-white bg-opacity-90 rounded-lg px-5 py-3">
                <span className="text-3xl font-bold text-indigo-700">{referralData?.credits || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {rewards.map((reward) => (
              <div 
                key={reward.id}
                className={`bg-white rounded-xl shadow-md p-6 border-2 ${
                  redeemSuccess === reward.id ? 'border-green-500' : 'border-transparent'
                } transition-all duration-200 flex flex-col h-full`}
              >
                <div className="flex items-start mb-4">
                  <div className="bg-gray-100 p-2 rounded-full mr-4 flex-shrink-0">
                    {reward.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{reward.name}</h3>
                    <p className="text-gray-600">{reward.description}</p>
                  </div>
                </div>
                
                <div className="mt-auto pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">{reward.creditCost} credits</span>
                  </div>
                  
                  <Button
                    variant={(referralData?.credits || 0) >= reward.creditCost ? "primary" : "outline"}
                    disabled={(referralData?.credits || 0) < reward.creditCost || redeeming !== null}
                    className={`${
                      (referralData?.credits || 0) >= reward.creditCost 
                        ? "bg-indigo-600 hover:bg-indigo-700" 
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    } w-full`}
                    onClick={() => handleRedeem(reward.id)}
                  >
                    {redeeming === reward.id ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing
                      </span>
                    ) : redeemSuccess === reward.id ? (
                      "Redeemed!"
                    ) : (
                      "Redeem"
                    )}
                  </Button>
                  
                  {(referralData?.credits || 0) < reward.creditCost && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      You need {reward.creditCost - (referralData?.credits || 0)} more credits
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* How to Earn More Credits - Expandable Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
            <button 
              onClick={() => setShowEarnInfo(!showEarnInfo)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-2xl font-bold text-gray-900">How to Earn More Credits</h2>
              {showEarnInfo ? 
                <ChevronUp className="w-5 h-5 text-gray-600" /> : 
                <ChevronDown className="w-5 h-5 text-gray-600" />
              }
            </button>
            
            {showEarnInfo && (
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-yellow-100 p-2 rounded-full mr-4 mt-1 flex-shrink-0">
                      <span className="text-lg">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Share Your Referral Link</h3>
                      <p className="text-gray-600">
                        Copy your unique referral link from your profile and share it with friends and colleagues
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-yellow-100 p-2 rounded-full mr-4 mt-1 flex-shrink-0">
                      <span className="text-lg">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Friends Sign Up & Make Purchases</h3>
                      <p className="text-gray-600">
                        When someone uses your link and makes a purchase, you&apos;ll automatically earn credits
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-yellow-100 p-2 rounded-full mr-4 mt-1 flex-shrink-0">
                      <span className="text-lg">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Redeem for Rewards</h3>
                      <p className="text-gray-600">
                        Use your accumulated credits to redeem exclusive ZurichJS rewards and benefits
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Credit Calculation</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Referral Signup</span>
                      <span className="font-medium">5 credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">T-shirt Purchase (25 CHF)</span>
                      <span className="font-medium">25 credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Workshop Ticket</span>
                      <span className="font-medium">1:1 with price in CHF</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                      <span className="text-gray-700 font-medium">All Purchases</span>
                      <span className="font-medium">1 CHF = 1 credit</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Credits are calculated based on the exact amount spent by your referrals (1 CHF = 1 credit). It may take up to 48 hours for credits to be added to your account.
                  </p>
                </div>
                
                <div className="flex items-start p-4 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    For any issues with your credits or if you have questions about the referral program, please email us at <a href="mailto:hello@zurichjs.com" className="font-medium underline">hello@zurichjs.com</a>
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Referral History */}
          {referralData?.referrals && referralData.referrals.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Referral History</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credits
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {referralData.referrals.map((referral, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {referral.email}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(referral.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {referral.type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          +{referral.creditValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-8 text-center">
            <Button
              href="/profile"
              variant="outline"
              className="px-8"
            >
              Back to Your Profile
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
} 