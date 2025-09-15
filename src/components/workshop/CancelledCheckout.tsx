import { Send, TicketX, PartyPopper } from 'lucide-react';
import { useRouter } from 'next/router';
import React from 'react';

import KitButton from "@/components/v2/kit/button/KitButton";
import KitInputText from "@/components/v2/kit/inputs/KitInputText";
import KitSelect from "@/components/v2/kit/inputs/KitSelect";

interface CancelledCheckoutProps {
  workshopId: string;
  workshopTitle: string;
}

export default function CancelledCheckout({
                                            workshopId, workshopTitle
}: CancelledCheckoutProps) {
  const [reason, setReason] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const router = useRouter();
  const { canceled } = router.query;

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

  React.useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => () => {
        // Remove the canceled query parameter
        const { pathname, query } = router;
        const newQuery = { ...query };
        delete newQuery.canceled;

        router.replace({
          pathname,
          query: newQuery,
        }, undefined, { shallow: true });
      }, 5000); // Redirect after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [submitted, router]);

  if (!canceled) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col px-4 py-5 gap-4 rounded-lg border border-kit-orange">
        <h3 className="flex items-center text-kit-md text-kit-orange gap-2 font-medium">
          {submitted ? (
              <>
                <PartyPopper size={18} />
                Thank you for the feedback!
              </>
          ) : (
            <>
              <TicketX size={18} />
              Checkout canceled
            </>
          )}
        </h3>
        <p>
          {submitted ?
            'Your input helps us improve the experience for everyone!'
            : 'Looks like you have canceled the checkout process. Would you mind sharing some feedback as to why?'
          }
        </p>
        {!submitted && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="py-2 space-y-4">
              <KitSelect
                label="Why did you abort the order? (optional)"
                options={[
                  { value: 'price', label: 'Price too high' },
                  { value: 'time', label: "Workshop time doesn't work for me" },
                  { value: 'topic', label: "Topic isn't what I expected" },
                  { value: 'payment', label: 'Payment issues' },
                  { value: 'other', label: 'Other reason' },
                ]}
                onChange={setReason}
              />
              <KitInputText
                label="May we reach out to you? (optional)"
                type="email"
                placeholder="Your email address"
                extra="We'll use this to follow up about any concerns"
                onChange={setEmail}
              />
            </div>
            <div className="flex items-center gap-2">
              <KitButton
                variant="white"
                lucideIcon={Send}
                type="submit"
                busy={isSubmitting}
              >
                Send Feedback
              </KitButton>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
