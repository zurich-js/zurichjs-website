import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, DollarSign, CreditCard, Calendar, FileText, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';

import AccountCreationIncentive from '@/components/checkout/AccountCreationIncentive';
import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import Button from '@/components/ui/Button';
import { decodePaymentData } from '@/utils/encoding';

export default function SuccessPage() {
  const router = useRouter();
  const [paymentData, setPaymentData] = useState<{
    session_id?: string;
    workshop_id?: string;
    event_id?: string;
    ticket_type?: string;
    name?: string;
    email?: string;
    streetAndNumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
    ticket?: string;
    price?: string;
    method?: string;
    type?: string;
    coupon?: string;
  }>({});
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const { user, isLoaded } = useUser();
  const notificationSent = useRef(false);
  
  // Decode data from URL when router is ready
  useEffect(() => {
    if (!router.isReady) return;

    // Get the session_id directly from URL parameters (for Stripe)
    const sessionId = router.query.session_id as string;
    
    // Get the encoded data from the URL
    const { data } = router.query;
    
    if (data && typeof data === 'string') {
      // Decode the base64 data
      const decodedData = decodePaymentData(data);
      
      // Make sure to include the session_id if it exists in URL parameters
      setPaymentData({
        ...decodedData,
        session_id: sessionId || decodedData.session_id
      });
    } else {
      // Fallback for direct query parameters (for backward compatibility)
      const { 
        workshop_id, event_id, ticket_type,
        name, email, ticket, price, method, type, coupon
      } = router.query;
      
      setPaymentData({
        session_id: sessionId,
        workshop_id: workshop_id as string,
        event_id: event_id as string,
        ticket_type: ticket_type as string,
        name: name as string,
        email: email as string,
        ticket: ticket as string,
        price: price as string,
        method: method as string,
        type: type as string,
        coupon: coupon as string
      });
    }
  }, [router.isReady, router.query]);
  
  // Extract values from payment data for easier access
  const {
    session_id, workshop_id, event_id, ticket_type,
    name, email, streetAndNumber, postcode, city, country,
    ticket, price, method, type, coupon
  } = paymentData;
  
  // Check if this is a manual payment flow
  const isManualPayment = Boolean(method && (method === 'cash' || method === 'bank'));

  // Determine correct item name and return path based on the ticket type
  let itemName = 'your purchase';
  let returnPath = '/';
  let itemType = 'item';
  
  if (ticket) {
    // For manual payment flow
    itemName = ticket;
    itemType = type || 'item';
    returnPath = event_id ? `/events/${event_id}` : (workshop_id ? `/workshops/${workshop_id}` : (itemType === 'workshop' ? '/workshops' : '/events'));
  } else if (ticket_type === 'workshop' || workshop_id) {
    itemType = 'workshop';
    if (workshop_id === 'nodejs-threads') {
      itemName = 'Node.js Threads Workshop';
      returnPath = '/workshops/nodejs-threads';
    } else if (workshop_id === 'astro-zero-to-hero') {
      itemName = 'Astro: Zero to Hero Workshop';
      returnPath = '/workshops/astro-zero-to-hero';
    } else {
      itemName = 'the workshop';
      returnPath = '/workshops';
    }
  } else if (ticket_type === 'event' || event_id) {
    itemType = 'event';
    itemName = 'the meetup event';
    returnPath = event_id ? `/events/${event_id}` : '/events';
  }

  useEffect(() => {
    // Only proceed if payment data is loaded, user is loaded, and notification hasn't been sent yet
    if (Object.keys(paymentData).length === 0 || !isLoaded || notificationSent.current) {
      return;
    }
    
    // Check if we have valid parameters
    if (!isManualPayment && !session_id) {
      setLoading(false);
      setErrorMessage('No session ID found. Your purchase may not have been completed.');
      return;
    }

    const notifyPurchase = async () => {
      try {
        // Set the flag to prevent multiple notifications
        notificationSent.current = true;
        
        // Get the user's email if signed in, otherwise use the provided email
        const userEmail = user?.primaryEmailAddress?.emailAddress || email || 'No email available';

        // For manual payment methods, we still want to notify of the reservation
        if (isManualPayment) {
          const response = await fetch('/api/notify/payment-reservation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              email: userEmail,
              streetAndNumber,
              postcode,
              city,
              country,
              ticketTitle: ticket,
              price,
              paymentMethod: method,
              workshopId: workshop_id,
              eventId: event_id,
              ticketType: type || itemType,
              coupon,
            }),
          });
          
          if (!response.ok) {
            console.warn('Failed to send reservation notification, but continuing');
          }
          
          setLoading(false);
          return;
        }

        // Regular Stripe purchase flow
        const response = await fetch('/api/notify/purchase-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session_id,
            workshopId: workshop_id,
            eventId: event_id,
            ticketType: ticket_type || itemType,
            email: userEmail,
            coupon,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to confirm purchase');
        }
      } catch (error) {
        console.error('Failed to notify purchase:', error);
        // We don't set an error here as it's just a notification
      } finally {
        setLoading(false);
      }
    };

    notifyPurchase();
  }, [paymentData, isLoaded]);

  if (loading) {
    return (
      <Layout>
        <Section>
          <div className="max-w-2xl mx-auto p-4 sm:p-8">
            <div className="animate-pulse flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </Section>
      </Layout>
    );
  }

  if (errorMessage) {
    return (
      <Layout>
        <Section>
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-red-700 mb-4">
                There was a problem processing your order
              </h2>
              <p className="text-red-600 mb-4">{errorMessage}</p>
              <Link href={returnPath}>
                <Button className="bg-red-600 text-white hover:bg-red-700">
                  Return to {itemType === 'workshop' ? 'Workshop' : 'Event'}
                </Button>
              </Link>
            </div>
          </div>
        </Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Section>
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6 sm:mb-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex justify-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center">
                {isManualPayment 
                  ? 'Your Reservation is Confirmed!' 
                  : 'Thank You for Your Purchase!'}
              </h1>
              <p className="text-lg text-gray-600 mb-4 text-center">
                {isManualPayment 
                  ? `Your reservation for ${itemName} has been confirmed.` 
                  : `Your purchase for ${itemName} has been confirmed.`}
              </p>
            </motion.div>
            
            {isManualPayment && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-100 rounded-xl p-5 mb-6 shadow-sm"
              >
                <div className="flex justify-center mb-4">
                  {method === 'cash' ? (
                    <div className="bg-green-100 p-3 rounded-full">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="bg-blue-100 p-3 rounded-full">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-medium mb-3 text-center">
                  {method === 'cash' 
                    ? 'Cash Payment Selected' 
                    : 'Bank Transfer Selected'}
                </h3>
                
                <p className="mb-4 text-center">
                  {method === 'cash'
                    ? 'Please bring the exact amount in cash to the event. Arrive 15 minutes early to complete your payment.'
                    : 'Please check your email for bank transfer details. Your reservation will be confirmed once payment is received.'}
                </p>
                
                <div className="flex justify-center">
                  <div className="bg-white rounded-lg p-3 inline-block font-mono text-sm shadow-sm">
                    Amount due: <span className="font-bold">CHF {price}</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            {!isManualPayment && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-100 shadow-sm mb-6 sm:mb-8"
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-100 p-2 rounded-full flex-shrink-0 mt-1">
                    <Mail className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-md text-gray-700">
                      <strong>Important:</strong> Due to high demand, please allow up to 24 hours for your ticket to be delivered to your email.
                      If you don&apos;t receive it within this timeframe, please contact us at <a href="mailto:hello@zurichjs.com" className="text-blue-600 underline">hello@zurichjs.com</a>.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center sm:text-left">
              Next Steps
            </h2>
            <div className="grid grid-cols-1 gap-3 mb-6">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                  <Mail className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <span className="text-gray-700">
                    {isManualPayment 
                      ? 'Check your email for reservation confirmation' 
                      : 'Check your email for purchase confirmation'}
                  </span>
                </div>
              </div>
              
              {method === 'bank' && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-700">Complete the bank transfer using the details in your email</span>
                  </div>
                </div>
              )}
              
              {method === 'cash' && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-700">Bring CHF {price} in cash to the event entrance</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <span className="text-gray-700">
                    {method === 'cash'
                      ? 'Your ticket will arrive within 24 hours'
                      : isManualPayment 
                        ? 'Your ticket information will be sent once payment is confirmed' 
                        : 'Your ticket will arrive within 24 hours'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <span className="text-gray-700">Add {itemType === 'workshop' ? 'the workshop' : 'the event'} date to your calendar</span>
                </div>
              </div>
              
              {itemType === 'workshop' && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 p-2 rounded-full mr-3 flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-700">Prepare any prerequisites for the workshop</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center sm:justify-start">
              <Link href={returnPath}>
                <Button className="flex items-center bg-zurich text-black hover:bg-zurich/90 w-full sm:w-auto">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to {itemType === 'workshop' ? 'Workshop' : 'Event'}
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* T-shirt Pre-order Reminder for Workshop Attendees */}
          {itemType === 'workshop' && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mb-8"
            >
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <span className="text-2xl">👕</span>
                  </div>
                </div>
                <h3 className="text-center text-xl font-bold text-gray-900 mb-3">
                  Don&apos;t Forget Your ZurichJS T-Shirt!
                </h3>
                <p className="text-center text-gray-700 mb-4">
                  Pre-order your official ZurichJS t-shirt now and have it ready for pickup at the workshop. Save time and guarantee your size!
                </p>
                <div className="bg-white/70 p-4 rounded-lg border border-purple-200 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600 font-bold">✓</span> 25 CHF (20% off for members)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600 font-bold">✓</span> Available in S-XXL
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600 font-bold">✓</span> Ready at workshop pickup
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <Link href="/tshirt">
                    <Button className="bg-purple-600 text-white hover:bg-purple-700 px-6 py-3 font-bold text-lg shadow-lg transform hover:scale-105 transition-all">
                      Pre-Order T-Shirt
                    </Button>
                  </Link>
                  <p className="text-xs text-purple-600 mt-2">
                    Order before the workshop for guaranteed availability
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Always show account creation incentive for manual payments too */}
          {method === 'cash' ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mb-8"
            >
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-100 rounded-xl p-4 sm:p-5 shadow-sm mb-6">
                <h3 className="text-center text-lg font-semibold text-gray-900 mb-3">
                  Create an Account Now and Get Benefits at the Event
                </h3>
                <p className="text-center text-gray-700 mb-0">
                  With a ZurichJS account, you&apos;ll have a smoother check-in process and be eligible for exclusive offers at the event.
                </p>
              </div>
              <AccountCreationIncentive />
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: itemType === 'workshop' ? 0.6 : 0.4, duration: 0.4 }}
            >
              <AccountCreationIncentive />
            </motion.div>
          )}
        </div>
      </Section>
    </Layout>
  );
} 