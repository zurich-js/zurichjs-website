import { useAuth, useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import Button from '@/components/ui/Button';
import { encodePaymentData } from '@/utils/encoding';

interface CashPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketTitle: string;
  price: number;
  eventId?: string;
  workshopId?: string;
  ticketType: 'workshop' | 'event';
}

export default function CashPaymentModal({
  isOpen,
  onClose,
  ticketTitle,
  price,
  eventId,
  workshopId,
  ticketType,
}: CashPaymentModalProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [streetAndNumber, setStreetAndNumber] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [agreeToPayment, setAgreeToPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowModal, setShouldShowModal] = useState(isOpen);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');

  // Sync modal state with isOpen prop
  useEffect(() => {
    setShouldShowModal(isOpen);
  }, [isOpen]);

  // Prefill form with user data if available
  useEffect(() => {
    if (user) {
      if (user.firstName && user.lastName) {
        setName(`${user.firstName} ${user.lastName}`);
      }
      if (user.primaryEmailAddress) {
        setEmail(user.primaryEmailAddress.emailAddress);
      }
    }
  }, [user]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShouldShowModal(false);
        onClose();
      }
    };
    
    if (shouldShowModal) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [shouldShowModal, onClose]);

  // If modal is closed or not on client, don't render anything
  if (!shouldShowModal) return null;
  if (typeof window === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !streetAndNumber || !postcode || !city || !country || !agreeToPayment) {
      setError('Please fill out all fields and agree to the payment obligation.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cash-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          streetAndNumber,
          postcode,
          city,
          country,
          ticketTitle,
          price,
          userId: isSignedIn ? user?.id : undefined,
          eventId,
          workshopId,
          ticketType,
          paymentMethod,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment reservation');
      }
      
      // Successfully created the reservation, now navigate to success page
      await response.json(); // Just consume the response
      
      // Encode payment data for the success page
      const paymentData = {
        name,
        email,
        streetAndNumber,
        postcode,
        city,
        country,
        ticket: ticketTitle,
        price: price.toString(),
        method: paymentMethod,
        type: ticketType,
        event_id: eventId,
        workshop_id: workshopId,
        // Add coupon if it exists in the URL
        coupon: router.query.coupon as string || undefined
      };
      
      const encodedData = encodePaymentData(paymentData);
      router.push(`/success?data=${encodedData}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {shouldShowModal && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999999 }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            style={{ zIndex: 9999998 }}
            onClick={() => {
              setShouldShowModal(false);
              onClose();
            }}
          ></motion.div>

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 400,
              duration: 0.3
            }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative mx-4 sm:mx-0 border border-green-100"
            style={{ zIndex: 9999999 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-5 py-3 flex justify-between items-center rounded-t-xl">
              <h2 className="text-lg font-bold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
                Reserve Your Ticket
              </h2>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 focus:outline-none"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5">
              <div className="mb-4">
                <div className="bg-green-50 p-3 rounded-lg mb-3 border border-green-100">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-base text-green-800">Ticket Details</h3>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                      Reservation
                    </span>
                  </div>
                  <p className="text-sm mb-1"><span className="font-medium">Type:</span> {ticketTitle}</p>
                  <p className="text-base font-bold text-green-700">Amount due: CHF {price}</p>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  Hey there! 👋 Choose your payment method and fill in your details below.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-700 p-2 rounded-lg border border-red-200 text-xs mb-3 flex items-start">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-3">
                  {/* Payment Method Selection */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-800 mb-2">Choose payment method</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-2 rounded-lg border flex flex-col items-center transition cursor-pointer ${
                          paymentMethod === 'cash'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <DollarSign className={`h-5 w-5 mb-1 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-500'}`} />
                        <span className={`text-xs font-medium ${paymentMethod === 'cash' ? 'text-green-800' : 'text-gray-700'}`}>Cash on Site</span>
                        {paymentMethod === 'cash' && (
                          <CheckCircle className="h-3 w-3 absolute top-1 right-1 text-green-600" />
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank')}
                        className={`p-2 rounded-lg border flex flex-col items-center transition cursor-pointer ${
                          paymentMethod === 'bank'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CreditCard className={`h-5 w-5 mb-1 ${paymentMethod === 'bank' ? 'text-green-600' : 'text-gray-500'}`} />
                        <span className={`text-xs font-medium ${paymentMethod === 'bank' ? 'text-green-800' : 'text-gray-700'}`}>Bank Transfer</span>
                        {paymentMethod === 'bank' && (
                          <CheckCircle className="h-3 w-3 absolute top-1 right-1 text-green-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {paymentMethod === 'cash' 
                        ? "Pay at the event entrance. Please arrive 15 minutes early!" 
                        : "You'll receive bank details by email to complete your payment."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder="Your email address"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Address Fields */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-800">Billing Address</h4>
                    
                    <div>
                      <label htmlFor="streetAndNumber" className="block text-xs font-medium text-gray-700 mb-1">
                        Street & Number
                      </label>
                      <input
                        type="text"
                        id="streetAndNumber"
                        value={streetAndNumber}
                        onChange={(e) => setStreetAndNumber(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder="e.g. Bahnhofstrasse 123"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="postcode" className="block text-xs font-medium text-gray-700 mb-1">
                          Postcode
                        </label>
                        <input
                          type="text"
                          id="postcode"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          placeholder="8001"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="city" className="block text-xs font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                          placeholder="Zurich"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="country" className="block text-xs font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        placeholder="Switzerland"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeToPayment}
                        onChange={(e) => setAgreeToPayment(e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        required
                      />
                      <span className="ml-2 text-xs text-gray-700">
                        I understand and agree to pay <span className="font-bold">CHF {price}</span> {paymentMethod === 'cash' ? 'in cash at the event entrance' : 'via bank transfer'}. If I don&apos;t show up{paymentMethod === 'cash' ? ' or pay' : ''}, an invoice will be sent.
                      </span>
                    </label>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !agreeToPayment}
                    className="w-full bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 py-2 rounded-lg font-semibold text-sm"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Confirm Reservation'}
                  </Button>
                  
                  <div className="text-xs text-center bg-blue-50 text-blue-700 p-2 rounded-lg border border-blue-100">
                    {paymentMethod === 'cash' 
                      ? "You'll receive a confirmation email with your ticket. Bring it to the event and pay at the entrance!" 
                      : "You'll receive bank transfer details by email. Once payment is confirmed, we'll send your ticket."}
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
} 