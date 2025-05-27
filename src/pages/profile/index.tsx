import { useUser } from "@clerk/nextjs";
import { User, CreditCard, Zap, Mail, Calendar, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import CouponsSection from '@/components/profile/CouponsSection';
import Button from '@/components/ui/Button';
import { useCheckUserSurvey } from '@/hooks/useCheckUserSurvey';
import { useReferrals } from '@/hooks/useReferrals';

export default function Profile() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { isValid, surveyData } = useCheckUserSurvey();
  const { 
    referralData, 
    referralLink, 
    loading: referralsLoading,
    getCurrentReferrer,
    processReferralSignup
  } = useReferrals();
  const [showCreditsInfo, setShowCreditsInfo] = useState(false);

  // Process pending referrals when the user visits the profile page
  useEffect(() => {
    const processPendingReferral = async () => {
      if (!user || referralsLoading) return;
      
      try {
        // Check if there's a pending referral in localStorage
        const referrerId = getCurrentReferrer();
        
        if (!referrerId) return;
        
        // Check if we've already processed this referral
        const processedReferrals = localStorage.getItem('zurichjs_processed_referrals');
        const processedList = processedReferrals ? JSON.parse(processedReferrals) : [];
        
        if (processedList.includes(referrerId)) {
          console.log('Referral already processed in profile page, skipping');
          return;
        }
        
        // Check if the user already has referredBy data
        const currentMetadata = user.unsafeMetadata || {};
        const alreadyHasReferrer = currentMetadata.referredBy || referralData?.referredBy;
        
        if (alreadyHasReferrer) {
          console.log('User already has a referrer in profile page, skipping');
          
          // Mark this referral as processed to avoid future attempts
          processedList.push(referrerId);
          localStorage.setItem('zurichjs_processed_referrals', JSON.stringify(processedList));
          return;
        }
        
        // Fetch referrer details
        const response = await fetch(`/api/users/${referrerId}`);
        
        if (response.ok) {
          const referrerData = await response.json();
          const referrerName = referrerData.fullName || 'ZurichJS Member';
          
          console.log('Processing referral in profile page with data:', {
            referrerId,
            referrerName,
            userId: user.id
          });
          
          // 1. Update user metadata directly
          try {
            // Update the user's metadata with referrer information
            await user.update({
              unsafeMetadata: {
                ...currentMetadata,
                referredBy: {
                  userId: referrerId,
                  name: referrerName,
                  date: new Date().toISOString()
                }
              }
            });
            console.log('Successfully updated referee metadata with referrer info in profile page');
          } catch (error) {
            console.error('Error updating user metadata in profile page:', error);
          }
          
          // 2. Update referrer's metadata
          try {
            const updateResponse = await fetch('/api/referrals/update-referrer-metadata', {
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
            
            const responseText = await updateResponse.text();
            console.log('Referrer metadata API response in profile page:', updateResponse.status, responseText);
            
            if (!updateResponse.ok) {
              console.error('Failed to update referrer metadata in profile page:', responseText);
            }
          } catch (error) {
            console.error('Error calling referrer metadata API in profile page:', error);
          }
          
          // 3. Send platform notification
          try {
            // Import the notification function dynamically to avoid SSR issues
            const { sendPlatformNotification } = await import('@/lib/notification');
            
            await sendPlatformNotification({
              title: 'New Referral Signup',
              message: `${referrerName} successfully referred ${user.fullName || user.username || 'New User'} to ZurichJS! They both earned 5 credits.`,
              priority: 0,
              sound: 'success'
            });
            
            console.log('Successfully sent platform notification about referral from profile page');
          } catch (error) {
            console.error('Error sending platform notification from profile page:', error);
          }
          
          // 4. Process the referral with useReferrals as a backup
          await processReferralSignup(referrerId, referrerName);
          
          // Mark this referral as processed
          processedList.push(referrerId);
          localStorage.setItem('zurichjs_processed_referrals', JSON.stringify(processedList));
          
          console.log('Referral processed successfully from profile page');
        } else {
          console.error('Failed to fetch referrer details in profile page', await response.text());
        }
      } catch (error) {
        console.error('Error processing referral from profile page:', error);
      }
    };
    
    processPendingReferral();
  }, [user, referralsLoading, referralData?.referredBy, getCurrentReferrer, processReferralSignup]);

  if (!isLoaded) {
    return (
      <Layout>
        <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Loading Profile...</h1>
              <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <Layout>
      <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Your ZurichJS Profile</h1>
            <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            <p className="text-black text-lg md:text-xl max-w-2xl mx-auto">
              Welcome back, <span className="font-bold">{user.firstName || user.username}</span>!
            </p>
          </div>
          
          {/* Member Benefits Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mt-8 -mr-8 bg-indigo-200 rounded-full opacity-70"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 -mb-6 -ml-6 bg-blue-200 rounded-full opacity-70"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your ZurichJS Member Benefits</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-100 p-2 rounded-full mt-1">
                    <CreditCard size={20} className="text-indigo-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Faster Checkout</p>
                    <p className="text-gray-700">Pre-filled email and details for quicker registration</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-full mt-1">
                    <Zap size={20} className="text-green-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">20% Off All Paid Events</p>
                    <p className="text-gray-700">Automatic discounts on workshops and pro events</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 p-2 rounded-full mt-1">
                    <Calendar size={20} className="text-purple-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Priority Access</p>
                    <p className="text-gray-700">Early access to limited-seat workshops</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-100 p-2 rounded-full mt-1">
                    <Mail size={20} className="text-yellow-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Personalized Updates</p>
                    <p className="text-gray-700">Get notified about events matching your interests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event CTAs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl shadow-md p-6 flex flex-col h-full">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Pro Events</h3>
                <p className="text-gray-700 mb-6">
                  Gain insights from industry experts with specialized deep-dive sessions and networking.
                </p>
              </div>
              <div className="mt-auto">
                <Button 
                  href="/events"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 w-full"
                >
                  Explore Pro Events
                </Button>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl shadow-md p-6 flex flex-col h-full">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Workshops</h3>
                <p className="text-gray-700 mb-6">
                  Hands-on learning experiences to level up your JavaScript skills with industry leaders.
                </p>
              </div>
              <div className="mt-auto">
                <Button 
                  href="/workshops"
                  variant="primary"
                  className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 w-full"
                >
                  Browse Workshops
                </Button>
              </div>
            </div>
          </div>

          <CouponsSection />

          {/* Slack CTA Banner */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl shadow-lg p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mt-8 -mr-8 bg-purple-200 rounded-full opacity-70"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 -mb-6 -ml-6 bg-blue-200 rounded-full opacity-70"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
              <div className="text-left mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect With Our Community!</h2>
                <p className="text-gray-700">Join our Slack workspace to engage directly with speakers, participate in polls, ask questions, and help shape the future of ZurichJS. It&apos;s where our community comes alive!</p>
              </div>
              <Button 
                href="https://join.slack.com/t/zurichjs/shared_invite/zt-35xc7fswg-NswAFDUErn1XoUF8ixH6fg"
                variant="primary"
                className="bg-[#4A154B] hover:bg-[#611f64] focus:ring-purple-500 flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base shadow-md transform transition-transform duration-200 hover:scale-105 whitespace-nowrap"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-1 sm:mr-2" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">
                  <g fill="none" fillRule="evenodd">
                    <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
                    <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
                    <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
                    <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
                  </g>
                </svg>
                <span className="font-medium">Join Slack</span>
              </Button>
            </div>
          </div>

          {/* Referral System */}
          <div className="bg-gradient-to-r from-green-100 to-teal-100 rounded-xl shadow-lg p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mt-8 -mr-8 bg-teal-200 rounded-full opacity-70"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 -mb-6 -ml-6 bg-green-200 rounded-full opacity-70"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="bg-teal-100 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-700">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 ml-3">Referral Program</h2>
              </div>
              
                              <p className="text-gray-700 mb-6">
                Invite friends to ZurichJS and earn credits! For each successful referral, you&apos;ll receive 
                credits that can be exchanged for workshop discounts, event tickets, merchandise, and more.
              </p>
              
              <div className="bg-white bg-opacity-90 rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div className="mb-3 sm:mb-0">
                    <p className="text-sm font-semibold text-gray-500 mb-1">Your Referral Link</p>
                    <p className="text-sm text-gray-900 truncate max-w-xs sm:max-w-md" id="referral-link">
                      {referralsLoading ? 'Generating your link...' : referralLink}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-teal-50 border-teal-200 hover:bg-teal-700 hover:text-white text-teal-800 transition-colors"
                    onClick={() => {
                      if (referralLink) {
                        navigator.clipboard.writeText(referralLink);
                        // You'd typically show a toast notification here
                        alert('Referral link copied to clipboard!');
                      }
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
                
                <button 
                  onClick={() => setShowCreditsInfo(!showCreditsInfo)}
                  className="flex items-center justify-between w-full text-left mt-4 pt-4 border-t border-gray-200"
                >
                  <div className="flex items-center">
                    <Info className="h-4 w-4 text-teal-600 mr-2" />
                    <span className="text-sm font-medium text-teal-700">How credits are calculated</span>
                  </div>
                  {showCreditsInfo ? 
                    <ChevronUp className="h-4 w-4 text-teal-600" /> : 
                    <ChevronDown className="h-4 w-4 text-teal-600" />
                  }
                </button>
                
                {showCreditsInfo && (
                  <div className="mt-3 text-sm text-gray-600 bg-teal-50 p-3 rounded-lg">
                    <div className="mb-2">Credits are awarded based on purchases made by your referrals:</div>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li>Referral Signup: <span className="font-medium">5 credits</span></li>
                      <li>T-shirt Purchase (25 CHF): <span className="font-medium">25 credits</span></li>
                      <li>Workshop Ticket: <span className="font-medium">1:1 with price in CHF</span></li>
                      <li>All Purchases: <span className="font-medium">1 CHF = 1 credit</span></li>
                    </ul>
                    <div>Credits may take up to 48 hours to be added to your account. For any issues, please contact <a href="mailto:hello@zurichjs.com" className="text-teal-700 underline">hello@zurichjs.com</a>.</div>
                  </div>
                )}
                
                {/* Social Sharing Options */}
                {referralLink && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Share your link:</p>
                    <div className="flex flex-wrap gap-2">
                      <a 
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me on ZurichJS, the JavaScript community in Zurich! ')}&url=${encodeURIComponent(referralLink)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Twitter
                      </a>
                      <a 
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm py-1.5 px-3 bg-blue-800 hover:bg-blue-900 text-white transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        LinkedIn
                      </a>
                      <a 
                        href={`mailto:?subject=${encodeURIComponent('Join ZurichJS - JavaScript Community')}&body=${encodeURIComponent('Hey! I thought you might be interested in joining ZurichJS, the JavaScript community in Zurich. Check it out: ' + referralLink)}`}
                        className="inline-flex items-center justify-center rounded-md text-sm py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Email
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-white bg-opacity-90 rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Your Credits</h3>
                  <span className="bg-teal-100 text-teal-800 text-lg font-bold px-4 py-2 rounded-lg">
                    {referralData?.credits || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">Workshop Discount (50%)</p>
                    <span className="font-medium text-gray-900">500 credits</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">ZurichJS T-shirt</p>
                    <span className="font-medium text-gray-900">250 credits</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">Free Pro Meetup Ticket</p>
                    <span className="font-medium text-gray-900">100 credits</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700">Sticker Pack</p>
                    <span className="font-medium text-gray-900">50 credits</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="primary"
                      className="w-full bg-teal-600 hover:bg-teal-700 focus:ring-teal-500"
                      onClick={() => {
                        router.push('/profile/rewards');
                      }}
                    >
                      Redeem Credits
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Active Referrals */}
              {referralData?.referrals && referralData.referrals.length > 0 && (
                <div className="bg-white bg-opacity-90 rounded-lg p-6 mt-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Your Active Referrals</h3>
                  <div className="space-y-3">
                    {referralData.referrals.slice(0, 5).map((referral, index) => (
                      <div key={index} className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{referral.email}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(referral.date).toLocaleDateString()} · {referral.type}
                          </p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                          +{referral.creditValue}
                        </span>
                      </div>
                    ))}
                    
                    {referralData.referrals.length > 5 && (
                      <Button
                        variant="outline"
                        className="text-teal-600 hover:text-teal-800 w-full mt-2"
                        onClick={() => {
                          router.push('/profile/rewards');
                        }}
                      >
                        View all {referralData.referrals.length} referrals
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Information Card */}
            <div className="bg-white bg-opacity-95 rounded-xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User size={24} className="text-blue-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 ml-3">Personal Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Full Name</p>
                  <p className="text-lg text-gray-900">{user.fullName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500">Email</p>
                  <p className="text-lg text-gray-900">{user.primaryEmailAddress?.emailAddress || 'Not provided'}</p>
                </div>
                {referralData?.referredBy && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Referred By</p>
                    <p className="text-lg text-gray-900">{referralData.referredBy.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Survey Information Card */}
            <div className="bg-white bg-opacity-95 rounded-xl shadow-lg p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <span className="text-xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 ml-3">Community Profile</h2>
              </div>
              
              {isValid ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Professional Role</p>
                    <p className="text-lg text-gray-900">{surveyData?.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Company/Organization</p>
                    <p className="text-lg text-gray-900">{surveyData?.company}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">JS Experience</p>
                    <p className="text-lg text-gray-900">{surveyData?.experience}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Interests</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {surveyData?.interests?.map((interest: string) => (
                        <span 
                          key={interest} 
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Newsletter</p>
                    <p className="text-lg text-gray-900">{surveyData?.newsletter ? 'Subscribed' : 'Not subscribed'}</p>
                  </div>
                  <div className="mt-6">
                    <Button 
                      href="/profile/survey" 
                      variant="outline"
                      className="w-full"
                    >
                      Update Community Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-700">
                    Complete your profile to unlock all ZurichJS benefits including personalized event 
                    recommendations and automatic 20% discount on all paid events!
                  </p>
                  <Button 
                    href="/profile/survey" 
                    variant="primary"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400"
                  >
                    Complete Your Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
