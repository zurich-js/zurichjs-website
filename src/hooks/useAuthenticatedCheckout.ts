import { useAuth, useUser } from '@clerk/nextjs';
import { useState } from 'react';

interface UseAuthenticatedCheckoutProps {
  onError?: (error: Error) => void;
}

interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  workshopId?: string;
  eventId?: string;
  ticketType?: 'workshop' | 'event';
  couponCode?: string;
}

export function useAuthenticatedCheckout({ onError }: UseAuthenticatedCheckoutProps = {}) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = async ({ 
    priceId, 
    quantity = 1, 
    workshopId,
    eventId,
    ticketType = workshopId ? 'workshop' : 'event',
    couponCode 
  }: CheckoutOptions) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          email: user?.primaryEmailAddress?.emailAddress,
          quantity,
          // If a custom coupon is provided, use it instead of the community discount
          couponCode: couponCode || (isSignedIn ? 'zurichjs-community' : undefined),
          workshopId,
          eventId,
          ticketType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      if (!url) {
        throw new Error('No checkout URL received');
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    startCheckout,
    isLoading,
    isSignedIn,
    userEmail: user?.primaryEmailAddress?.emailAddress,
  };
} 