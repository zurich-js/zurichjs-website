import { useUser } from '@clerk/nextjs';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import AccountCreationIncentive from '@/components/checkout/AccountCreationIncentive';
import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import Button from '@/components/ui/Button';


export default function SuccessPage() {
  const router = useRouter();
  const { session_id, workshop_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [errorMessage] = useState('');
  const { user, isLoaded } = useUser();

  // Get workshop information based on the workshop_id
  let workshopName = 'the workshop';
  let workshopPath = '/workshops';
  
  if (workshop_id === 'nodejs-threads') {
    workshopName = 'Node.js Threads Workshop';
    workshopPath = '/workshops/nodejs-threads';
  } else if (workshop_id === 'astro-zero-to-hero') {
    workshopName = 'Astro: Zero to Hero Workshop';
    workshopPath = '/workshops/astro-zero-to-hero';
  }

  useEffect(() => {
    // Only proceed if session_id exists
    if (!session_id || !isLoaded) {
      if (isLoaded && !session_id) {
        setLoading(false);
      }
      return;
    }

    const notifyPurchase = async () => {
      try {
        // Get the user's email if signed in
        const userEmail = user?.primaryEmailAddress?.emailAddress || 'No email available';

        // Send notification about successful purchase
        await fetch('/api/notify/purchase-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session_id,
            workshopId: workshop_id as string || 'unknown',
            email: userEmail,
          }),
        });
      } catch (error) {
        console.error('Failed to notify purchase:', error);
        // We don't set an error here as it's just a notification
      } finally {
        setLoading(false);
      }
    };

    notifyPurchase();
  }, [session_id, workshop_id, user, isLoaded]);

  if (loading) {
    return (
      <Layout>
        <Section>
          <div className="max-w-2xl mx-auto text-center p-8">
            <div className="animate-pulse flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </Section>
      </Layout>
    );
  }

  if (errorMessage) {
    return (
      <Layout>
        <Section>
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-red-700 mb-4">
                There was a problem processing your order
              </h2>
              <p className="text-red-600 mb-4">{errorMessage}</p>
              <Link href={workshopPath}>
                <Button className="bg-red-600 text-white hover:bg-red-700">
                  Return to Workshop
                </Button>
              </Link>
            </div>
          </div>
        </Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Section>
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank You for Your Purchase!
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Your purchase for {workshopName} has been confirmed.
            </p>
            <p className="text-md text-gray-600 mb-8 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <strong>Important:</strong> Due to high demand, please allow up to 24 hours for your ticket to be delivered to your email.
              If you don&apos;t receive it within this timeframe, please contact us at <a href="mailto:hello@zurichjs.com" className="text-blue-600 underline">hello@zurichjs.com</a>.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Next Steps
            </h2>
            <ul className="space-y-3 text-left mb-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Check your email for purchase confirmation</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Your ticket will arrive within 24 hours</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Add the workshop date to your calendar</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Prepare any prerequisites for the workshop</span>
              </li>
            </ul>
            
            <Link href={workshopPath}>
              <Button className="flex items-center bg-zurich text-black hover:bg-zurich/90">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Workshop
              </Button>
            </Link>
          </div>

          <AccountCreationIncentive />
        </div>
      </Section>
    </Layout>
  );
} 