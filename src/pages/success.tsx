import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import Button from '@/components/ui/Button';

import AccountCreationIncentive from '@/components/checkout/AccountCreationIncentive';

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Get the session ID from the URL
    const { session_id } = router.query;
    if (session_id) {
      // TODO: Verify the session with Stripe if needed
      console.log('Session ID:', session_id);
    }
  }, [router.query]);

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
            <p className="text-lg text-gray-600 mb-8">
              Your ticket has been confirmed. We&apos;ve sent the details to your email.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Next Steps
            </h2>
            <ul className="space-y-4 text-left">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Check your email for the ticket confirmation</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Add the workshop to your calendar</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Prepare your development environment</span>
              </li>
            </ul>
          </div>

          <AccountCreationIncentive />

          <div className="mt-8">
            <Button
              onClick={() => router.push('/')}
              className="bg-zurich text-black hover:opacity-80"
            >
              Return to Homepage
            </Button>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            If you have any questions, please contact us at{' '}
            <a href="mailto:hello@zurichjs.org" className="text-zurich hover:underline">
              hello@zurichjs.org
            </a>
          </p>
        </div>
      </Section>
    </Layout>
  );
} 