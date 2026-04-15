import { SignInButton, useAuth, useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';

interface WorkshopWaitlistProps {
  workshopId: string;
  workshopTitle: string;
  overbookingSeatsAvailable: number;
}

type WaitlistOutcome = 'walk-in' | 'email-when-available';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WorkshopWaitlist({
  workshopId,
  workshopTitle,
  overbookingSeatsAvailable,
}: WorkshopWaitlistProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { track } = useEvents();

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedOutcome, setJoinedOutcome] = useState<WaitlistOutcome | null>(null);

  const nextOutcome: WaitlistOutcome =
    overbookingSeatsAvailable > 0 ? 'walk-in' : 'email-when-available';

  useEffect(() => {
    if (user) {
      if (!email && user.primaryEmailAddress) {
        setEmail(user.primaryEmailAddress.emailAddress);
      }
      if (!name && user.firstName && user.lastName) {
        setName(`${user.firstName} ${user.lastName}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const openModal = () => {
    track('waitlist_clicked', {
      workshop_id: workshopId,
      next_outcome: nextOutcome,
    });
    setError(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const shouldPayInPerson = nextOutcome === 'walk-in';
  const waitlistIntro = shouldPayInPerson
    ? 'This workshop is sold out, but we can make room for a few extra people. Join the waitlist and show up on the day. You can pay in person.'
    : 'This workshop is sold out. Join the waitlist and we will reach out by email if a spot opens up.';
  const joinedMessage =
    joinedOutcome === 'walk-in'
      ? `You are on the waitlist for "${workshopTitle}". Please show up on the day and you can pay in person.`
      : `We will email ${email} if a seat opens up for "${workshopTitle}".`;
  const joinedSummary =
    joinedOutcome === 'walk-in'
      ? "You're on the waitlist. Please show up on the day and pay in person."
      : "You're on the waitlist. We'll be in touch if a spot opens up.";

  const primaryButtonClass =
    'w-full bg-js text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 disabled:bg-gray-300 disabled:text-gray-500 transition-colors';
  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-black focus:border-black disabled:bg-gray-50 disabled:text-gray-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      track('waitlist_submit_attempt', {
        workshop_id: workshopId,
        workshop_title: workshopTitle,
        outcome: nextOutcome,
      });

      const response = await fetch('/api/workshops/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          workshopTitle,
          email: trimmedEmail,
          name: name.trim() || undefined,
          outcome: nextOutcome,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join the waitlist');
      }

      setJoinedOutcome(data.outcome || nextOutcome);
      track('waitlist_joined', {
        workshop_id: workshopId,
        workshop_title: workshopTitle,
        outcome: data.outcome || nextOutcome,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join the waitlist';
      setError(message);
      track('waitlist_join_error', {
        workshop_id: workshopId,
        workshop_title: workshopTitle,
        error: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999999 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 9999998 }}
            onClick={closeModal}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400, duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative mx-4 sm:mx-0"
            style={{ zIndex: 9999999 }}
          >
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-100">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Mail size={18} />
                Join the Waitlist
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal} aria-label="Close">
                <X size={20} />
              </Button>
            </div>

            <div className="p-5">
              {joinedOutcome ? (
                <div className="text-center py-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">You&apos;re on the list!</h3>
                  <p className="text-sm text-gray-700 mb-5">{joinedMessage}</p>
                  <Button onClick={closeModal} className="w-full">
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-4">{waitlistIntro}</p>

                  {isLoaded && !isSignedIn && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-700">
                        Have an account? Sign in to use your saved email.
                      </span>
                      <SignInButton mode="modal">
                        <button
                          type="button"
                          onClick={() =>
                            track('waitlist_signin_clicked', { workshop_id: workshopId })
                          }
                          className="text-xs font-semibold text-black hover:underline whitespace-nowrap"
                        >
                          Sign in
                        </button>
                      </SignInButton>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 text-red-700 p-2 rounded-lg border border-red-200 text-xs mb-3 flex items-start">
                      <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="waitlist-email" className="block text-xs font-medium text-gray-700 mb-1">
                        Email address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="waitlist-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder="you@example.com"
                        required
                        autoFocus
                        disabled={!!isSignedIn && !!user?.primaryEmailAddress}
                      />
                      {isSignedIn && user?.primaryEmailAddress && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          Using the email from your account.
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="waitlist-name" className="block text-xs font-medium text-gray-700 mb-1">
                        Name <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="waitlist-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Your name"
                      />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Joining...
                        </span>
                      ) : (
                        'Join the Waitlist'
                      )}
                    </Button>

                    <p className="text-[11px] text-center text-gray-500">
                      We&apos;ll only use your email to contact you about this workshop.
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white/10 rounded-2xl p-8 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-3">Workshop Sold Out</h3>
          <p className="text-gray-300 text-sm mb-6">
            {joinedOutcome ? joinedSummary : waitlistIntro}
          </p>
          {joinedOutcome ? (
            <div className="bg-green-500/20 text-green-200 border border-green-500/40 rounded-xl px-6 py-3 font-semibold text-sm flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              You&apos;re on the list
            </div>
          ) : (
            <Button onClick={openModal} className={primaryButtonClass}>
              Join Waitlist
            </Button>
          )}
        </div>
      </div>

      {typeof window !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
