import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState } from 'react';

import Button from '@/components/ui/Button';

interface CancelledCheckoutProps {
  workshopId: string;
  workshopTitle: string;
}

export default function CancelledCheckout({ workshopId, workshopTitle }: CancelledCheckoutProps) {
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send notification to Pushover
      await fetch('/api/notify/checkout-cancelled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshopId,
          workshopTitle,
          reason: reason || 'No reason provided',
          email: email || 'Not provided',
        }),
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Failed to send feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    // Remove the canceled query parameter
    const { pathname, query } = router;
    const newQuery = { ...query };
    delete newQuery.canceled;
    
    router.replace({
      pathname,
      query: newQuery,
    }, undefined, { shallow: true });
  };

  if (submitted) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Thank You for Your Feedback</h3>
        <p className="text-gray-600">Your input helps us improve our checkout process.</p>
        <Button onClick={handleTryAgain} className="bg-zurich text-black">
          Return to Workshop
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 space-y-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-semibold text-yellow-800">Checkout Cancelled</h3>
          <p className="mt-2 text-sm text-yellow-700">
            You cancelled your checkout for {workshopTitle}. We&apos;d appreciate your feedback on why you decided not to complete your purchase.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            Why did you cancel? (optional)
          </label>
          <select
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-js focus:ring focus:ring-js focus:ring-opacity-20"
          >
            <option value="">Select a reason...</option>
            <option value="price">Price too high</option>
            <option value="time">Workshop time doesn&apos;t work for me</option>
            <option value="topic">Topic isn&apos;t what I expected</option>
            <option value="payment">Payment issues</option>
            <option value="other">Other reason</option>
          </select>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Your email (optional)
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-js focus:ring focus:ring-js focus:ring-opacity-20"
              placeholder="email@example.com"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">We&apos;ll use this to follow up about any concerns.</p>
        </div>

        <div className="flex justify-between space-x-4">
          <Button
            type="button"
            onClick={handleTryAgain}
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg flex items-center justify-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-zurich text-black hover:bg-zurich/80"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
} 