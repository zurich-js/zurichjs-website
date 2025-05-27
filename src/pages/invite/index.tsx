import { SignInButton, useUser } from '@clerk/nextjs';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

import Layout from '@/components/layout/Layout';

export default function InvitePage() {
  const router = useRouter();
  const { token, ref } = router.query;
  const { isLoaded, isSignedIn } = useUser();

  // If a specific token is provided, redirect to that token's page
  useEffect(() => {
    if (token && typeof token === 'string') {
      router.replace(`/invite/${token}`);
    }
    
    // Store ref param in localStorage if provided
    if (ref && typeof ref === 'string') {
      localStorage.setItem('zurichjs_referral', ref);
    }
  }, [token, ref, router]);

  // If already signed in, redirect to profile
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/profile');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <Layout>
      <Head>
        <title>Join ZurichJS | JavaScript Community in Zurich</title>
        <meta name="description" content="Join the ZurichJS community! Access exclusive events, workshops, and connect with JavaScript developers in Zurich." />
      </Head>
      <div className="w-full pt-16 sm:pt-24 pb-16 px-4 sm:px-6 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-yellow-400 h-1 w-24 md:w-32 mx-auto mb-6"></div>
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Join ZurichJS</h1>
            <p className="text-lg text-gray-700">
              Become part of the JavaScript community in Zurich
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center py-4">
              <div className="inline-block bg-yellow-100 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Your Account</h2>
              <p className="text-gray-600 mb-6">
                Sign up to access exclusive workshops, events, and connect with JavaScript developers in Zurich.
              </p>

              {/* Community Benefits */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-indigo-900 mb-3">Community Benefits:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">✓</span>
                    <span className="text-indigo-900">20% off all paid events</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">✓</span>
                    <span className="text-indigo-900">Priority access to limited seats</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">✓</span>
                    <span className="text-indigo-900">Earn credits through referrals</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-500 mr-2">✓</span>
                    <span className="text-indigo-900">Personalized event recommendations</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <SignInButton mode="modal" forceRedirectUrl="/profile">
                  <button
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium py-3 text-lg rounded-md shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Sign Up Now
                  </button>
                </SignInButton>
                
                <Link href="/" className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Learn more about ZurichJS first
                </Link>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500">
            By joining, you agree to our <Link href="/policies/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link href="/policies/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </Layout>
  );
} 