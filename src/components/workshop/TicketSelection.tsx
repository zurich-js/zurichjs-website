import { motion } from 'framer-motion';
import { CheckCircle, Star, Zap, Ticket, Tag, DollarSign } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import Button from '@/components/ui/Button';
import CashPaymentModal from '@/components/ui/CashPaymentModal';
import { useAuthenticatedCheckout } from '@/hooks/useAuthenticatedCheckout';
import { useCoupon } from '@/hooks/useCoupon';

export interface TicketOption {
  id: string;
  title: string;
  description: string;
  price: number;
  features: string[];
  testPriceId?: string;
  autoSelect?: boolean;
  ticketType: 'workshop' | 'event';
  eventId?: string;
  workshopId?: string;
  availableUntil?: string;
  availableFrom?: string;
}

interface TicketSelectionProps {
  options: TicketOption[];
  onCheckout?: (priceId: string) => void;
  className?: string;
  buttonText?: string;
  workshopId?: string;
  eventId?: string;
  ticketType?: 'workshop' | 'event';
}

const isTestMode = process.env.NODE_ENV === 'development';

export default function TicketSelection({
  options,
  onCheckout,
  className = '',
  workshopId,
  eventId,
  ticketType,
}: TicketSelectionProps) {
  // Find auto-select ticket or default to first one if only one option
  const defaultTicket = options.find(option => option.autoSelect) || 
                      (options.length === 1 ? options[0] : null);
  
  const [selectedTicket, setSelectedTicket] = useState<string | null>(
    defaultTicket ? (isTestMode && defaultTicket.testPriceId ? defaultTicket.testPriceId : defaultTicket.id) : null
  );

  // Cash payment modal state
  const [showCashModal, setShowCashModal] = useState(false);

  // Ref for payment buttons section
  const paymentButtonsRef = useRef<HTMLDivElement>(null);
  const [highlightButtons, setHighlightButtons] = useState(false);
  
  const { startCheckout, isLoading, isSignedIn } = useAuthenticatedCheckout({
    onError: (error) => {
      alert(error.message);
    },
  });
  const { couponCode, couponData, isLoading: isCouponLoading, error: couponError } = useCoupon();

  // Determine what discount to display
  const hasCoupon = couponData && couponData.isValid;
  const communityDiscount = isSignedIn && !hasCoupon;

  // Scroll to payment buttons and highlight when ticket is selected
  useEffect(() => {
    if (selectedTicket && paymentButtonsRef.current) {
      // Scroll to payment buttons with center alignment
      paymentButtonsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Trigger highlight animation
      setHighlightButtons(true);
      const timer = setTimeout(() => setHighlightButtons(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedTicket]);

  const handleCheckout = async () => {
    if (!selectedTicket) return;

    if (onCheckout) {
      onCheckout(selectedTicket);
      return;
    }

    try {
      const selectedOption = options.find(option => getPriceId(option) === selectedTicket);
      
      // Determine ticket type and ID
      const type = ticketType || selectedOption?.ticketType || (workshopId ? 'workshop' : 'event');
      
      await startCheckout({
        priceId: selectedTicket,
        workshopId: type === 'workshop' ? (selectedOption?.workshopId || workshopId) : undefined,
        eventId: type === 'event' ? (selectedOption?.eventId || eventId) : undefined,
        ticketType: type,
        couponCode: couponCode,
      });
    } catch (error) {
      // Error is already handled by the hook
      console.error('Checkout failed:', error);
    }
  };
  
  const handleCashPayment = () => {
    if (!selectedTicket) return;
    setShowCashModal(true);
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

  // Calculate discount percentage or amount for display
  const getDiscountLabel = () => {
    if (hasCoupon) {
      if (couponData.percentOff) {
        return `${couponData.percentOff}%`;
      } else if (couponData.amountOff) {
        return `CHF ${(couponData.amountOff / 100).toFixed(0)}`;
      }
    } else if (communityDiscount) {
      return '20%';
    }
    return '';
  };
  
  // Get the currently selected ticket details
  const getSelectedTicketDetails = () => {
    if (!selectedTicket) return null;
    return options.find(option => getPriceId(option) === selectedTicket);
  };
  
  const selectedTicketDetails = getSelectedTicketDetails();

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
            {" "}with coupon: {couponData.code}
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
          className={`relative rounded-lg border-2 p-5 transition-all ${
            selectedTicket === getPriceId(ticket)
              ? 'border-js bg-js/5'
              : 'border-gray-200 hover:border-js/50'
          }`}
        >
          <button
            onClick={() => setSelectedTicket(getPriceId(ticket))}
            className="w-full text-left"
          >
            <div className="flex flex-col space-y-4">
              {/* Title and description */}
              <div>
                <h4 className="text-lg font-bold text-gray-900">{ticket.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
              </div>
              
              {/* Price card */}
              <div className="flex justify-between items-center">
                {/* Price information */}
                <div className="flex flex-col">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900">CHF {(hasCoupon || communityDiscount) 
                      ? getDiscountedPrice(ticket.price).toFixed(0) 
                      : ticket.price}
                    </span>
                    
                    {(hasCoupon || communityDiscount) && (
                      <span className="ml-3 text-sm line-through text-gray-500">CHF {ticket.price}</span>
                    )}
                    <span className="text-xs text-gray-600 block ml-1">per person</span>
                  </div>
                </div>
                
                {/* Discount badge */}
                {(hasCoupon || communityDiscount) && (
                  <div className="flex-shrink-0">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-md">
                      <Tag size={10} className="shrink-0" />
                      <span>{getDiscountLabel()}</span>
                      <span className="uppercase text-[10px] bg-orange-600 px-1 py-0.5 rounded">OFF</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
      {/* Features list */}
      {/* features are the same, so just pull it to the top and have easy button selection */}
      <ul className="space-y-2">
        {(defaultTicket?.features || []).map((feature, index) => (
          <li key={index} className="flex items-center text-sm text-gray-700">
            <CheckCircle className="h-4 w-4 text-js mr-2 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Payment options section */}
      <div ref={paymentButtonsRef} className="mt-6">
        {/* Instruction banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mb-4 p-3 rounded-lg border-2 transition-all ${
            selectedTicket
              ? 'bg-js/10 border-js'
              : 'bg-gray-50 border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {selectedTicket ? (
              <>
                <CheckCircle className="h-5 w-5 text-js flex-shrink-0" />
                <p className="text-sm font-semibold text-gray-900">
                  Great! Now choose your payment method:
                </p>
              </>
            ) : (
              <>
                <Ticket className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-600">
                  Select a ticket above to continue
                </p>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          animate={highlightButtons ? {
            scale: [1, 1.02, 1],
            boxShadow: [
              "0 0 0 0px rgba(234, 179, 8, 0)",
              "0 0 0 4px rgba(234, 179, 8, 0.3)",
              "0 0 0 0px rgba(234, 179, 8, 0)"
            ]
          } : {}}
          transition={{ duration: 0.6 }}
        >
          <Button
            onClick={handleCheckout}
            disabled={!selectedTicket || isLoading || isCouponLoading}
            className="w-full bg-zurich text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 font-semibold shadow-md hover:shadow-lg transition-all py-3 rounded-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
            {isLoading || isCouponLoading ? 'Processing...' : 'Pay Online'}
          </Button>

          <Button
            onClick={handleCashPayment}
            disabled={!selectedTicket || isLoading || isCouponLoading}
            className="w-full bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 font-semibold shadow-md hover:shadow-lg transition-all py-3 rounded-lg flex items-center justify-center"
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Pay in Person
          </Button>
        </motion.div>
      </div>

      <div className="text-xs text-gray-600 text-center mt-4 flex flex-col gap-2 bg-gray-50 p-3 rounded-lg">
        <p>Secure payment options. All prices include VAT.</p>
        {isTestMode && (
          <div className="block p-2 bg-red-50 border border-red-200 rounded-md">
            <span className="text-red-500 font-medium">
              Test Mode Active
            </span>
          </div>
        )}
      </div>
      
      {/* Cash Payment Modal */}
      {selectedTicketDetails && (
        <CashPaymentModal
          isOpen={showCashModal}
          onClose={() => setShowCashModal(false)}
          ticketTitle={selectedTicketDetails.title}
          price={hasCoupon || communityDiscount 
            ? getDiscountedPrice(selectedTicketDetails.price)
            : selectedTicketDetails.price}
          eventId={ticketType === 'event' ? eventId : undefined}
          workshopId={ticketType === 'workshop' ? workshopId : undefined}
          ticketType={ticketType || (workshopId ? 'workshop' : 'event')}
        />
      )}
    </div>
  );
} 
