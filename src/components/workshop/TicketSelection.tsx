import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';

import Button from '@/components/ui/Button';
import { useAuthenticatedCheckout } from '@/hooks/useAuthenticatedCheckout';

export interface TicketOption {
  id: string;
  title: string;
  description: string;
  price: number;
  features: string[];
  testPriceId?: string;
}

interface TicketSelectionProps {
  options: TicketOption[];
  onCheckout?: (priceId: string) => void;
  className?: string;
  buttonText?: string;
}

const isTestMode = process.env.NODE_ENV === 'development';

export default function TicketSelection({
  options,
  onCheckout,
  className = '',
  buttonText = 'Proceed to Checkout',
}: TicketSelectionProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const { startCheckout, isLoading, isSignedIn } = useAuthenticatedCheckout({
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleCheckout = async () => {
    if (!selectedTicket) return;

    if (onCheckout) {
      onCheckout(selectedTicket);
      return;
    }

    try {
      await startCheckout({
        priceId: selectedTicket,
      });
    } catch (error) {
      // Error is already handled by the hook
      console.error('Checkout failed:', error);
    }
  };

  const getPriceId = (option: TicketOption) => {
    return isTestMode && option.testPriceId ? option.testPriceId : option.id;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {options.map((ticket) => (
        <motion.div
          key={ticket.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative rounded-lg border-2 p-4 transition-all ${
            selectedTicket === getPriceId(ticket)
              ? 'border-js bg-js/5'
              : 'border-gray-200 hover:border-js/50'
          }`}
        >
          <button
            onClick={() => setSelectedTicket(getPriceId(ticket))}
            className="w-full text-left"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-gray-900">{ticket.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">CHF {ticket.price}</p>
                <p className="text-sm text-gray-600">per person</p>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {ticket.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-js mr-2 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {selectedTicket === getPriceId(ticket) && (
              <div className="absolute -right-2 -top-2">
                <div className="bg-js text-black rounded-full p-1">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
            )}
          </button>
        </motion.div>
      ))}

      <Button
        onClick={handleCheckout}
        disabled={!selectedTicket || isLoading}
        className="w-full bg-zurich text-black hover:opacity-80 disabled:bg-gray-300 disabled:text-gray-500 font-semibold shadow-md hover:shadow-lg transition-all"
      >
        {isLoading ? 'Processing...' : buttonText}
      </Button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Secure payment powered by Stripe. All prices include VAT.
        {isTestMode && (
          <span className="block mt-1 text-red-500 font-medium">
            Test Mode Active
          </span>
        )}
        {isSignedIn && (
          <span className="block mt-1 text-green-500 font-medium">
            Community discount applied
          </span>
        )}
      </p>
    </div>
  );
} 