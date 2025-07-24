import { useAuth, useUser, SignInButton } from '@clerk/nextjs';
import { useState } from 'react';

import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';

interface EventInterestButtonProps {
  eventId: string;
  eventTitle: string;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function EventInterestButton({ 
  eventId, 
  eventTitle, 
  variant = 'primary', 
  size = 'lg',
  className = ''
}: EventInterestButtonProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { track } = useEvents();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegisterInterest = async () => {
    if (!isSignedIn) return;

    setIsRegistering(true);
    setError(null);

    try {
      // Track the interest registration attempt
      track('event_interest_register_attempt', {
        event_id: eventId,
        event_title: eventTitle,
        user_email: user?.primaryEmailAddress?.emailAddress || 'email not found'
      });

      const response = await fetch('/api/events/register-interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          eventTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register interest');
      }

      setIsRegistered(true);
      
      // Track successful registration
      track('event_interest_registered', {
        event_id: eventId,
        event_title: eventTitle,
        user_email: data.userEmail,
        user_name: data.userName
      });

    } catch (err) {
      console.error('Interest registration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to register interest');
      
      // Track the error
      track('event_interest_register_error', {
        event_id: eventId,
        event_title: eventTitle,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`${className} opacity-50 cursor-not-allowed`}
        disabled
      >
        Loading...
      </Button>
    );
  }

  // Show sign in button if user is not authenticated
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={() => {
            track('event_interest_signin_clicked', {
              event_id: eventId,
              event_title: eventTitle
            });
          }}
        >
          Sign In to Register Interest 🚀
        </Button>
      </SignInButton>
    );
  }

  // Show success state if already registered
  if (isRegistered) {
    return (
      <Button
        variant="primary"
        size={size}
        className={`${className} bg-green-600 text-white hover:bg-green-700 cursor-default`}
        disabled
      >
        ✅ Interest Registered! We&apos;ll notify you soon.
      </Button>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <Button
        variant="primary"
        size={size}
        className={`${className} bg-red-600 text-white hover:bg-red-700 min-w-max`}
        onClick={handleRegisterInterest}
        disabled={isRegistering}
        style={{ minWidth: '280px' }}
      >
        {isRegistering ? 'Registering Interest...' : 'Try Again'}
      </Button>
    );
  }

  // Show the main registration button
  return (
    <Button
      variant={variant}
      size={size}
      className={`${className} min-w-max`}
      onClick={handleRegisterInterest}
      disabled={isRegistering}
      style={{ minWidth: '280px' }}
    >
      {isRegistering ? 'Registering Interest...' : 'Register Interest & Get Notified 🔔'}
    </Button>
  );
}