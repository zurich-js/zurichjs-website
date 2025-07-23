import { useUser, SignInButton } from '@clerk/nextjs';
import confetti from 'canvas-confetti';
import { UserPlus } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { useReferrals } from '@/hooks/useReferrals';

interface ReferrerInfo {
  name: string;
  id: string;
  loading: boolean;
  error: boolean;
}

export default function InvitePage() {
  const router = useRouter();
  const { token, signup } = router.query;
  const { user, isLoaded } = useUser();
  const { referralLink, processReferralSignup } = useReferrals();
  const [referrer, setReferrer] = useState<ReferrerInfo>({
    name: '',
    id: '',
    loading: true,
    error: false
  });
  const [processingSignup, setProcessingSignup] = useState(false);
  const [signupProcessed, setSignupProcessed] = useState(false);

  useEffect(() => {
    // Fire confetti when the page loads
    if (typeof window !== 'undefined') {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };
      
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        
        // Launch confetti from both sides
        confetti({
          particleCount: 3,
          angle: randomInRange(55, 125),
          spread: randomInRange(50, 70),
          origin: { x: randomInRange(0, 0.3), y: 0 },
          colors: ['#FFD700', '#4B0082', '#9370DB', '#4169E1'],
        });
        
        confetti({
          particleCount: 3,
          angle: randomInRange(55, 125),
          spread: randomInRange(50, 70),
          origin: { x: randomInRange(0.7, 1), y: 0 },
          colors: ['#FFD700', '#4B0082', '#9370DB', '#4169E1'],
        });
      }, 250);
      
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (!token || typeof token !== 'string') return;

    // Store the referral token in localStorage
    localStorage.setItem('zurichjs_referral', token);

    // Fetch referrer information
    const fetchReferrer = async () => {
      try {
        // Decode the token to get the referrer ID
        const salt = 'ZurichJS_2024';
        const decoded = atob(token);
        const referrerId = decoded.replace(`${salt}_`, '');
        
        // Make an API call to get referrer details
        const response = await fetch(`/api/users/${referrerId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        setReferrer({
          name: data.fullName || 'ZurichJS Member',
          id: referrerId,
          loading: false,
          error: false
        });
      } catch (error) {
        console.error('Error fetching referrer:', error);
        setReferrer({
          name: '',
          id: '',
          loading: false,
          error: true
        });
      }
    };

    fetchReferrer();
  }, [token]);

  // Process referral after user signs up
  useEffect(() => {
    const handleReferralSignup = async () => {
      // Only run if:
      // 1. User is loaded and exists
      // 2. We have valid referrer info
      // 3. We haven't processed the signup yet
      // 4. The signup parameter is in the URL (indicating completed signup)
      if (
        isLoaded && 
        user && 
        !referrer.error && 
        referrer.id && 
        !processingSignup && 
        !signupProcessed && 
        signup === 'complete'
      ) {
        try {
          setProcessingSignup(true);
          
          console.log('Processing referral signup with data:', {
            referrerId: referrer.id,
            referrerName: referrer.name,
            userId: user.id
          });
          
          // 1. Update user metadata directly
          try {
            // Check if the user already has referral data
            const currentMetadata = user.unsafeMetadata || {};
            
            if (!currentMetadata.referredBy) {
              // Update the user's metadata with referrer information
              await user.update({
                unsafeMetadata: {
                  ...currentMetadata,
                  referredBy: {
                    userId: referrer.id,
                    name: referrer.name,
                    date: new Date().toISOString()
                  }
                }
              });
              console.log('Successfully updated referee metadata with referrer info');
            } else {
              console.log('User already has referredBy data:', currentMetadata.referredBy);
            }
          } catch (error) {
            console.error('Error updating user metadata:', error);
          }
          
          // 2. Update referrer's metadata
          try {
            const response = await fetch('/api/referrals/update-referrer-metadata', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                referrerId: referrer.id,
                refereeId: user.id,
                refereeName: user.fullName || user.username || 'New User',
                refereeEmail: user.primaryEmailAddress?.emailAddress || '',
                date: new Date().toISOString(),
                type: 'signup',
                creditValue: 5
              }),
            });
            
            const responseText = await response.text();
            console.log('Referrer metadata API response:', response.status, responseText);
            
            if (!response.ok) {
              console.error('Failed to update referrer metadata:', responseText);
            }
          } catch (error) {
            console.error('Error calling referrer metadata API:', error);
          }
          
          // 3. Send platform notification
          try {
            const response = await fetch('/api/notifications/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: 'New Referral Signup',
                message: `${referrer.name} successfully referred ${user.fullName || user.username || 'New User'} to ZurichJS! They both earned 5 credits.`,
                type: 'referral',
                priority: 'normal'
              }),
            });
            
            if (!response.ok) {
              console.error('Failed to send platform notification:', response.status);
            } else {
              console.log('Successfully sent platform notification about referral');
            }
          } catch (error) {
            console.error('Error sending platform notification:', error);
          }
          
          // 4. Process the referral with useReferrals as a backup
          await processReferralSignup(referrer.id, referrer.name);
          
          setSignupProcessed(true);
        } catch (error) {
          console.error('Error processing referral signup:', error);
        } finally {
          setProcessingSignup(false);
        }
      }
    };
    
    handleReferralSignup();
  }, [isLoaded, user, referrer, signup, processingSignup, signupProcessed, processReferralSignup]);

  return (
    <Layout>
      <Head>
        <title>Join ZurichJS | You&apos;ve Been Invited</title>
        <meta name="description" content="You&apos;ve been invited to join the ZurichJS community by a friend. Join our vibrant JavaScript community in Zurich!" />
      </Head>
      <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">You&apos;re Invited!</h1>
            <p className="text-lg text-gray-700">
              Join the ZurichJS community of JavaScript developers in Zurich
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            {referrer.loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-8 h-8 border-t-2 border-b-2 border-yellow-500 rounded-full animate-spin"></div>
              </div>
            ) : referrer.error ? (
              <div className="text-center py-6">
                <p className="text-red-600 mb-4">There was an error with this invitation link.</p>
                <p className="text-gray-600">
                  The invitation may have expired or is invalid. You can still join ZurichJS by visiting our homepage.
                </p>
              </div>
            ) : isLoaded && user ? (
              // User is already logged in
              <div className="text-center py-4">
                <div className="inline-block bg-purple-100 p-3 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {signupProcessed ? 'Welcome to ZurichJS!' : 'Oops! You Already Have an Account'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {signupProcessed 
                    ? `You've successfully joined ZurichJS through ${referrer.name}'s invitation! You've earned 5 credits.` 
                    : `${referrer.name} tried to invite you, but it looks like you're already part of the ZurichJS community!`}
                </p>
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg mb-6">
                  <p className="text-purple-800 font-medium mb-2">Let&apos;s create a referral train!</p>
                  <p className="text-gray-700 mb-4">
                    Invite someone to join in on the fun and earn credits for workshops, events, and exclusive merch!
                  </p>
                </div>
                <div className="space-y-4">
                  <Button 
                    href="/profile"
                    variant="primary"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Go to Your Profile
                  </Button>
                  {referralLink && (
                    <div className="flex flex-col items-center mt-6 border border-purple-100 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
                      <p className="text-sm font-medium text-purple-800 mb-3">Share Your Own Referral Link:</p>
                      <div className="bg-white p-3 rounded-lg w-full flex flex-col gap-3">
                        <div className="flex items-center">
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-gray-500 mb-1">Your personal invite link:</p>
                            <p className="text-sm font-medium text-gray-700 truncate">{referralLink}</p>
                          </div>
                          <Button
                            variant="outline"
                            className="ml-2 text-xs py-1 px-3 h-auto bg-indigo-50 hover:bg-indigo-700 hover:text-white border-indigo-200 text-indigo-700 transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(referralLink);
                              alert('Referral link copied to clipboard!');
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          <a 
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me on ZurichJS, the JavaScript community in Zurich! ')}&url=${encodeURIComponent(referralLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md text-xs py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                          >
                            Share on Twitter
                          </a>
                          <a 
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md text-xs py-1 px-2 bg-blue-800 hover:bg-blue-900 text-white transition-colors"
                          >
                            Share on LinkedIn
                          </a>
                          <a 
                            href={`mailto:?subject=${encodeURIComponent('Join ZurichJS - JavaScript Community')}&body=${encodeURIComponent('Hey! I thought you might be interested in joining ZurichJS, the JavaScript community in Zurich. Check it out: ' + referralLink)}`}
                            className="inline-flex items-center justify-center rounded-md text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                          >
                            Email
                          </a>
                        </div>
                      </div>
                      <p className="text-xs text-purple-700 mt-3">You&apos;ll earn points for each new member who joins with your link!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // New user flow
              <>
                <div className="text-center mb-6">
                  <div className="inline-block bg-yellow-100 p-3 rounded-full mb-4">
                    <UserPlus size={32} className="text-yellow-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {referrer.name} has invited you to join ZurichJS
                  </h2>
                  <p className="text-gray-600">
                    Create an account to access exclusive workshops, events, and connect with the JavaScript community in Zurich.
                  </p>
                </div>
                
                {/* Community Highlights */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-indigo-900 mb-3">Join Our Vibrant Community!</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="bg-indigo-100 p-1 rounded-full mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-indigo-900 flex-1">
                        <span className="font-medium">Priority Registration</span> for workshops and events with limited seating
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-indigo-100 p-1 rounded-full mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-indigo-900 flex-1">
                        <span className="font-medium">Express Checkout</span> for faster registration with saved preferences
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-indigo-100 p-1 rounded-full mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-indigo-900 flex-1">
                        <span className="font-medium">Networking Events</span> to connect with local developers and companies
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-indigo-100 p-1 rounded-full mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-indigo-900 flex-1">
                        <span className="font-medium">Community Slack</span> for job opportunities and technical discussions
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-indigo-900 mb-2">Member Benefits:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-indigo-500 mr-2">✓</span>
                      <span className="text-indigo-900">Loyalty rewards for active participation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-indigo-500 mr-2">✓</span>
                      <span className="text-indigo-900">20% discount on all paid events</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-indigo-500 mr-2">✓</span>
                      <span className="text-indigo-900">Streamlined registration with saved preferences</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-indigo-500 mr-2">✓</span>
                      <span className="text-indigo-900">Personalized updates based on your interests</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <SignInButton mode="modal" forceRedirectUrl={`/invite/${token}?signup=complete`}>
                    <button
                      className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:ring-indigo-400 text-white font-medium py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 border-0 rounded-md"
                    >
                      Create Your Account
                    </button>
                  </SignInButton>
                  
                  <Button 
                    href="/"
                    variant="outline"
                    className="w-full"
                  >
                    Learn More First
                  </Button>
                  
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Already have an account? <SignInButton mode="modal"><span className="text-blue-600 hover:underline cursor-pointer">Sign in</span></SignInButton>
                  </p>
                </div>
              </>
            )}
          </div>
          
          <p className="text-center text-sm text-gray-500">
            By joining, you agree to our <Link href="/policies/terms-and-conditions" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link href="/policies/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </Layout>
  );
} 