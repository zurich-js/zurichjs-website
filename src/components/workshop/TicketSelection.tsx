import { motion } from 'framer-motion';
import { CheckCircle, Star, Zap, Ticket } from 'lucide-react';
import { useState } from 'react';

import Button from '@/components/ui/Button';
import { useAuthenticatedCheckout } from '@/hooks/useAuthenticatedCheckout';
import { useCoupon } from '@/hooks/useCoupon';

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
  workshopId?: string;
}

const isTestMode = process.env.NODE_ENV === 'development';

export default function TicketSelection({
  options,
  onCheckout,
  className = '',
  buttonText = 'Proceed to Checkout',
  workshopId,
}: TicketSelectionProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const { startCheckout, isLoading, isSignedIn } = useAuthenticatedCheckout({
    onError: (error) => {
      alert(error.message);
    },
  });
  const { couponCode, couponData, isLoading: isCouponLoading, error: couponError } = useCoupon();

  // Determine what discount to display
  const hasCoupon = couponData && couponData.isValid;
  const communityDiscount = isSignedIn && !hasCoupon;

  const handleCheckout = async () => {
    if (!selectedTicket) return;

    if (onCheckout) {
      onCheckout(selectedTicket);
      return;
    }

    try {
      await startCheckout({
        priceId: selectedTicket,
        workshopId,
        couponCode: couponCode,
      });
    } catch (error) {
      // Error is already handled by the hook
      console.error('Checkout failed:', error);
    }
  };

  const getPriceId = (option: TicketOption) => {
    return isTestMode && option.testPriceId ? option.testPriceId : option.id;
  };

  // Calculate the discounted price
  const getDiscountedPrice = (originalPrice: number) => {
    if (hasCoupon) {
      if (couponData.percentOff) {
        return originalPrice * (1 - couponData.percentOff / 100);
      } else if (couponData.amountOff) {
        return Math.max(0, originalPrice - couponData.amountOff / 100);
      }
    } else if (communityDiscount) {
      return originalPrice * 0.8; // 20% off for community members
    }
    return originalPrice;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {communityDiscount && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg shadow-md mb-4 flex items-center justify-center"
        >
          <div className="bg-white p-1 rounded-full mr-2">
            <Zap size={14} className="text-green-600" />
          </div>
          <span className="font-bold text-sm">20% Community discount applied!</span>
          <Star size={14} className="text-yellow-300 ml-2" />
        </motion.div>
      )}

      {hasCoupon && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg shadow-md mb-4 flex items-center justify-center"
        >
          <div className="bg-white p-1 rounded-full mr-2">
            <Ticket size={14} className="text-indigo-600" />
          </div>
          <span className="font-bold text-sm">
            {couponData.percentOff ? `${couponData.percentOff}% off` : `CHF ${couponData.amountOff ? (couponData.amountOff / 100).toFixed(2) : 0} off`} 
            with coupon: {couponData.code}
          </span>
          <Star size={14} className="text-yellow-300 ml-2" />
        </motion.div>
      )}

      {couponError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">
          {couponError}
        </div>
      )}
      
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
                {hasCoupon || communityDiscount ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center">
                      <p className="text-sm line-through text-gray-400 mr-2">CHF {ticket.price}</p>
                      <p className="text-2xl font-bold text-gray-900">CHF {getDiscountedPrice(ticket.price).toFixed(0)}</p>
                    </div>
                    <p className="text-sm text-gray-600">per person</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-gray-900">CHF {ticket.price}</p>
                    <p className="text-sm text-gray-600">per person</p>
                  </div>
                )}
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
        disabled={!selectedTicket || isLoading || isCouponLoading}
        className="w-full bg-zurich text-black hover:opacity-80 disabled:bg-gray-300 disabled:text-gray-500 font-semibold shadow-md hover:shadow-lg transition-all"
      >
        {isLoading || isCouponLoading ? 'Processing...' : buttonText}
      </Button>

      <div className="text-xs text-gray-500 text-center mt-4 flex flex-col gap-2">
        <p>Secure payment powered by Stripe. All prices include VAT.</p>
        {isTestMode && (
          <div className="block p-2 bg-red-50 border border-red-200 rounded-md">
            <span className="text-red-500 font-medium">
              Test Mode Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 