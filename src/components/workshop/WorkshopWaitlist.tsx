import { useAuth, useUser, SignInButton } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Mail, DoorOpen, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';

interface WorkshopWaitlistProps {
  workshopId: string;
  workshopTitle: string;
  /**
   * Number of seats still available in the room beyond the official cap.
   * E.g. if the workshop sells 20 tickets but the room fits 25, and 0 people
   * are already on the waitlist, this is 5. When > 0, the next signup is
   * told they can show up at the door and pay in person.
   */
  overbookingSeatsAvailable: number;
}

type WaitlistOutcome = 'walk-in' | 'email-when-available';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WorkshopWaitlist({
  workshopId,
  workshopTitle,
  overbookingSeatsAvailable,
}: WorkshopWaitlistProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { track } = useEvents();

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedOutcome, setJoinedOutcome] = useState<WaitlistOutcome | null>(null);

  // The outcome the next signup will see, computed from the page-level
  // overbookingSeatsAvailable count (manually maintained — see page config).
  const nextOutcome: WaitlistOutcome =
    overbookingSeatsAvailable > 0 ? 'walk-in' : 'email-when-available';

  // Prefill from Clerk when user becomes available
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

  // Close on Escape
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

  const closeModal = () => setIsOpen(false);

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

      setJoinedOutcome(nextOutcome);
      track('waitlist_joined', {
        workshop_id: workshopId,
        workshop_title: workshopTitle,
        outcome: nextOutcome,
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

  // Reusable class strings that match the workshop page's brand identity
  // (`bg-black text-js ... rounded-xl` for the hero CTA pattern).
  const primaryButtonClass =
    'w-full bg-black text-js font-bold px-6 py-3 rounded-xl hover:bg-gray-900 disabled:bg-gray-300 disabled:text-gray-500 transition-colors';
  const inputClass =
    'w-full px-3 py-2 text-sm border-2 border-black/10 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-0 disabled:bg-gray-50 disabled:text-gray-500';

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative mx-4 sm:mx-0 border-2 border-black"
            style={{ zIndex: 9999999 }}
          >
            {/* Header — matches the workshop hero (bg-js + black) */}
            <div className="bg-js px-5 py-4 flex justify-between items-center border-b-2 border-black">
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <Mail size={18} />
                Join the Waitlist
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-black hover:text-gray-700 focus:outline-none"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {joinedOutcome === 'walk-in' ? (
                <div className="text-center py-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-js flex items-center justify-center mb-3 border-2 border-black">
                    <DoorOpen className="h-6 w-6 text-black" />
                  </div>
                  <h3 className="text-lg font-black text-black mb-2">
                    You&apos;re in — show up at the door!
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    We have a small overbooking buffer and you fit in it. Just{' '}
                    <span className="font-semibold">come to the workshop</span> and pay{' '}
                    <span className="font-semibold">CHF 35 in cash on site</span>.
                  </p>
                  <p className="text-xs text-gray-500 mb-5">
                    We&apos;ve also sent ourselves a note with your email{' '}
                    (<span className="font-medium">{email}</span>) in case anything changes.
                  </p>
                  <Button onClick={closeModal} className={primaryButtonClass}>
                    Got it
                  </Button>
                </div>
              ) : joinedOutcome === 'email-when-available' ? (
                <div className="text-center py-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-zurich flex items-center justify-center mb-3">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-black mb-2">You&apos;re on the waitlist</h3>
                  <p className="text-sm text-gray-700 mb-5">
                    The room is full. We&apos;ll email{' '}
                    <span className="font-medium">{email}</span> if a seat opens up — usually
                    a day or two before the workshop.
                  </p>
                  <Button onClick={closeModal} className={primaryButtonClass}>
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {nextOutcome === 'walk-in' ? (
                    <div className="bg-js/40 border-2 border-black rounded-xl p-3 mb-4 text-xs text-black flex items-start gap-2">
                      <DoorOpen className="h-4 w-4 mt-0.5 flex-shrink-0 text-black" />
                      <span>
                        Tickets are sold out, but we have room for a few more. If you sign up now,
                        you can <span className="font-bold">show up at the door and pay CHF 35 in cash</span>.
                      </span>
                    </div>
                  ) : (
                    <div className="bg-zurich/10 border-2 border-zurich rounded-xl p-3 mb-4 text-xs text-zurich flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-zurich" />
                      <span>
                        The room is full. Drop your email and{' '}
                        <span className="font-bold">we&apos;ll reach out</span> if a seat opens up.
                      </span>
                    </div>
                  )}

                  {/* Sign-in option for guests */}
                  {isLoaded && !isSignedIn && (
                    <div className="bg-gray-50 border border-black/10 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-700">
                        Have an account? Sign in to use your saved email.
                      </span>
                      <SignInButton mode="modal">
                        <button
                          type="button"
                          onClick={() =>
                            track('waitlist_signin_clicked', { workshop_id: workshopId })
                          }
                          className="text-xs font-bold text-zurich hover:underline whitespace-nowrap"
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
                      <label htmlFor="waitlist-email" className="block text-xs font-bold text-black mb-1">
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
                      <label htmlFor="waitlist-name" className="block text-xs font-bold text-black mb-1">
                        Name <span className="font-normal text-gray-500">(optional)</span>
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
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-js"
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
                      ) : nextOutcome === 'walk-in' ? (
                        'Reserve my walk-in spot'
                      ) : (
                        'Join the waitlist'
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
          <h3 className="text-xl font-black text-white mb-3">Workshop Sold Out</h3>

          {joinedOutcome ? (
            <>
              <p className="text-gray-300 text-sm mb-6">
                {joinedOutcome === 'walk-in'
                  ? "You're in — show up at the door and pay in cash."
                  : "You're on the waitlist. We'll email you if a seat opens up."}
              </p>
              <div className="bg-js/20 text-js border border-js/40 rounded-xl px-6 py-3 font-bold text-sm flex items-center justify-center gap-2">
                <CheckCircle size={16} />
                You&apos;re on the list
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-300 text-sm mb-6">
                {nextOutcome === 'walk-in'
                  ? 'Tickets are sold out, but we have room for a few more — sign up to walk in and pay on site.'
                  : "The room is full. Join the waitlist and we'll email you if a seat opens up."}
              </p>
              <Button
                onClick={openModal}
                className="w-full bg-js text-black font-bold px-6 py-3 rounded-xl border-2 border-black hover:bg-js-dark transition-colors"
              >
                Join Waitlist
              </Button>
            </>
          )}
        </div>
      </div>

      {typeof window !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
