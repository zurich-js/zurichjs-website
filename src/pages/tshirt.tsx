import { useUser } from '@clerk/nextjs';
import { Zap, Star, Ticket, Truck, Shirt, CheckCircle, Users, ChevronLeft, Loader2, Gift, Package, Shield, Clock, Heart, Award, ArrowRight, AlertTriangle, CreditCard, Banknote } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import PageLayout from '@/components/layout/Layout';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import CashPaymentModal from '@/components/ui/CashPaymentModal';
import { useAuthenticatedCheckout } from '@/hooks/useAuthenticatedCheckout';
import { useCoupon } from '@/hooks/useCoupon';
import useEvents from '@/hooks/useEvents';

const TSHIRT_PRICE_ID = 'price_1RneLaGxQziVA7Fs49QnVKbT' // TEST: price_1RneOpGxQziVA7FsQRe8QHGK;
const SHIPPING_RATE_ID = 'shr_1RneNbGxQziVA7FsmyQbFuTM'; // TEST: shr_1RnePLGxQziVA7FsEWPBRYAA
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const BASE_PRICE = 25;
const DELIVERY_ADDON = 10;

type SizeQuantity = {
  [size: string]: number;
};

export default function TshirtPage() {
  const [stock, setStock] = useState<Record<string, number>>({});
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState(false);
  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity>({ M: 1 });
  const [delivery, setDelivery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // User data for pre-filling forms
  const { user, isLoaded: userLoaded } = useUser();
  const [step, setStep] = useState(0); // 0: product config, 1: payment method, 2: address (cash only), 3: review, 4: confirmation
  const router = useRouter();
  const { couponCode, couponData, error: couponError, applyDiscount } = useCoupon();
  const { isSignedIn, userEmail } = useAuthenticatedCheckout();
  const { track } = useEvents();

  // Community discount logic
  const hasCoupon = couponData && couponData.isValid;
  const communityCouponCode = isSignedIn && !hasCoupon ? 'zurichjs-community' : undefined;
  const communityDiscount = Boolean(communityCouponCode);

  // Handle merch survey submission
  const handleMerchSurveySubmit = async () => {
    if (!merchSuggestion.trim() || surveySubmitting) return;
    
    setSurveySubmitting(true);
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '💡 New Merch Suggestion',
          message: `Someone suggested new merch: "${merchSuggestion.trim()}"\n\nFrom: ${userEmail || 'Anonymous user'}\nSource: T-shirt page survey`,
          type: 'merch-suggestion',
          priority: 'low',
          email: userEmail || ''
        })
      });
      
      setSurveySubmitted(true);
      track('merch_suggestion_submitted', {
        suggestion: merchSuggestion.trim(),
        isLoggedIn: !!isSignedIn
      });
    } catch (error) {
      console.error('Failed to submit merch suggestion:', error);
      // Still mark as submitted to avoid user frustration
      setSurveySubmitted(true);
    } finally {
      setSurveySubmitting(false);
    }
  };

  // Calculate totals from size quantities
  const totalQuantity = Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0);
  const tshirtTotal = BASE_PRICE * totalQuantity;
  let discountedTotal = tshirtTotal;
  if (hasCoupon) {
    discountedTotal = applyDiscount(tshirtTotal);
  } else if (communityDiscount) {
    discountedTotal = Math.round(tshirtTotal * 0.8);
  }
  if (delivery) discountedTotal += DELIVERY_ADDON;

  // Coupon/community discount banners
  const discountLabel = hasCoupon
    ? couponData?.percentOff
      ? `${couponData.percentOff}%`
      : couponData?.amountOff
      ? `CHF ${(couponData.amountOff / 100).toFixed(0)}`
      : ''
    : communityDiscount
    ? '20%'
    : '';

  // Fetch stock data from Stripe metadata
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await fetch('/api/get-stock?priceId=' + TSHIRT_PRICE_ID);
        if (response.ok) {
          const stockData = await response.json();
          setStock(stockData);
          setStockError(false);
        } else {
          setStockError(true);
          // Set empty stock on API failure
          setStock({});
        }
      } catch (error) {
        console.error('Failed to fetch stock:', error);
        setStockError(true);
        // Set empty stock on API failure
        setStock({});
      } finally {
        setStockLoading(false);
      }
    };

    fetchStock();
  }, []);

  // Track page view
  useEffect(() => {
    track('tshirt_page_viewed', {});
  }, [track]);

  // Pre-fill form data from user account
  useEffect(() => {
    if (userLoaded && user) {
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const email = user.primaryEmailAddress?.emailAddress || '';
      
      // Pre-fill cash payment details
      setCashPaymentDetails({
        firstName,
        lastName,
        email
      });
      
      // Pre-fill delivery address name and email
      setDeliveryAddress(prev => ({
        ...prev,
        name: `${firstName} ${lastName}`.trim(),
        email
      }));
    }
  }, [userLoaded, user]);

  // Cancellation recovery state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelEmail, setCancelEmail] = useState('');
  const [cancelFeedbackSubmitted, setCancelFeedbackSubmitted] = useState(false);
  const [cancelModalDismissed, setCancelModalDismissed] = useState(false);

  // Cash payment state
  const [showCashModal, setShowCashModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  
  // Delivery address state
  const [deliveryAddress, setDeliveryAddress] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'Switzerland'
  });

  // Cash payment form state
  const [cashPaymentDetails, setCashPaymentDetails] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  // Track notification state to prevent duplicates
  const [cardNotificationSent, setCardNotificationSent] = useState(false);

  // Merch survey state
  const [showMerchSurvey, setShowMerchSurvey] = useState(false);
  const [merchSuggestion, setMerchSuggestion] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  // Show cancel modal if canceled=true in URL
  useEffect(() => {
    if (router.isReady && router.query.canceled === 'true' && !cancelModalDismissed) {
      setShowCancelModal(true);
      setStep(0);
      track('tshirt_checkout_abandoned', {});
    }
  }, [router.isReady, router.query.canceled, track, cancelModalDismissed]);

  // Track purchase success
  useEffect(() => {
    if (router.query.success === 'true') {
      setStep(4);
      track('tshirt_purchase_success', {
        sizesOrdered: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
        totalQuantity,
        delivery,
        coupon: couponCode || '',
      });
      
      // Send platform notification for card payment (only once)
      if (!cardNotificationSent) {
        const sendCardPaymentNotification = async () => {
          try {
            await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: '💳 Card T-shirt Order',
                message: `New online payment t-shirt order\n\nSizes: ${Object.entries(sizeQuantities).filter(([, qty]) => qty > 0).map(([size, qty]) => `${size} (${qty})`).join(', ')}\nTotal Quantity: ${totalQuantity}\nDelivery: ${delivery ? 'Home Delivery' : 'Meetup Pickup'}\nPayment: Card/TWINT`,
                type: 'tshirt',
                priority: 'normal',
              })
            });
            setCardNotificationSent(true);
          } catch (error) {
            console.error('Failed to send card payment notification:', error);
          }
        };
        
        sendCardPaymentNotification();
      }
    }
  }, [router.query.success, sizeQuantities, totalQuantity, delivery, couponCode, track, cardNotificationSent]);

  // Validation functions
  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 0:
        // Check if at least one size has quantity > 0 and all quantities are within stock limits
        const hasItems = totalQuantity > 0;
        const allInStock = Object.entries(sizeQuantities).every(([size, qty]) => 
          qty === 0 || (qty > 0 && qty <= (stock[size] || 0))
        );
        return hasItems && !stockLoading && !stockError && allInStock;
      case 1:
        return paymentMethod !== null;
      case 2:
        // For cash payment, require personal details
        if (paymentMethod === 'cash') {
          return cashPaymentDetails.firstName.trim() && 
                 cashPaymentDetails.lastName.trim() && 
                 cashPaymentDetails.email.trim() && 
                 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cashPaymentDetails.email);
        }
        return true; // Online payment delivery step is always valid
      case 3:
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  // Final checkout handler (for review step)
  const handleFinalCheckout = async () => {
    if (paymentMethod === 'cash') {
      // Handle cash payment completion
      setStep(4); // Go to confirmation
      track('tshirt_cash_order_placed', {
        sizesOrdered: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
        totalQuantity,
        delivery: false,
      });
      
      // Send platform notification via API
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '💰 Cash T-shirt Order',
            message: `New cash payment t-shirt order from ${cashPaymentDetails.firstName} ${cashPaymentDetails.lastName} (${cashPaymentDetails.email})\n\nSizes: ${Object.entries(sizeQuantities).filter(([, qty]) => qty > 0).map(([size, qty]) => `${size} (${qty})`).join(', ')}\nTotal Quantity: ${totalQuantity}\nPickup: Meetup Collection`,
            type: 'tshirt',
            priority: 'normal',
          })
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
      
      return;
    }

    // Handle online payment
    setLoading(true);
    setCheckoutError('');
    track('tshirt_checkout_started', {
      sizesOrdered: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
      totalQuantity,
      delivery,
      paymentMethod: 'online',
      coupon: couponCode || communityCouponCode || '',
    });
    try {
      if (totalQuantity < 1 || totalQuantity > 10) {
        setCheckoutError('Invalid total quantity (min 1, max 10).');
        setLoading(false);
        return;
      }
      
      // Check stock for each size
      const stockIssues = Object.entries(sizeQuantities)
        .filter(([size, qty]) => qty > 0 && qty > (stock[size] || 0))
        .map(([size]) => size);
      
      if (stockIssues.length > 0) {
        setCheckoutError(`Not enough stock for sizes: ${stockIssues.join(', ')}`);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/checkout-tshirt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizeQuantities,
          delivery,
          priceId: TSHIRT_PRICE_ID,
          totalQuantity,
          isMember: Boolean(communityCouponCode || hasCoupon),
          shippingRateId: delivery ? SHIPPING_RATE_ID : undefined,
          couponCode: hasCoupon ? couponCode : communityCouponCode,
          email: userEmail,
          deliveryAddress: delivery ? deliveryAddress : undefined,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError('Could not start checkout.');
      }
    } catch {
      setCheckoutError('Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  // Coupon input state
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const handleApplyCoupon = () => {
    if (couponInput) {
      router.replace({
        pathname: router.pathname,
        query: { ...router.query, coupon: couponInput },
      }, undefined, { shallow: true });
      setCouponApplied(true);
    }
  };

  // Cancellation recovery handlers
  const handleTryAgain = () => {
    // Immediately hide the modal and mark as dismissed
    setShowCancelModal(false);
    setCancelModalDismissed(true);
    
    // Reset all cancellation-related state
    setCancelReason('');
    setCancelEmail('');
    setCancelFeedbackSubmitted(false);
    
    // Reset checkout state
    setStep(0);
    setLoading(false);
    setCheckoutError('');
    
    // Remove canceled parameter from URL
    const { pathname, query } = router;
    const newQuery = { ...query };
    delete newQuery.canceled;
    
    router.replace({
      pathname,
      query: newQuery,
    }, undefined, { shallow: true });
  };

  const handleCancelFeedback = async () => {
    if (!cancelReason) return;

    try {
      const response = await fetch('/api/notify/checkout-cancelled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'zurichjs-tshirt',
          ticketType: 'event',
          itemTitle: 'ZurichJS T-Shirt',
          reason: cancelReason,
          email: cancelEmail || '',
        }),
      });

      if (response.ok) {
        setCancelFeedbackSubmitted(true);
        track('tshirt_cancellation_feedback_submitted', {
          reason: cancelReason,
          hasEmail: Boolean(cancelEmail),
          sizesOrdered: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
          totalQuantity,
          delivery
        });
      } else {
        console.error('Failed to submit feedback: Server error');
        // Still allow the user to proceed even if API fails
        setCancelFeedbackSubmitted(true);
      }
    } catch (error) {
      console.error('Failed to submit cancellation feedback:', error);
      // Still allow the user to proceed even if API fails
      setCancelFeedbackSubmitted(true);
    }
  };

  // Step navigation handlers
  const handleNextStep = () => {
    if (step === 0) {
      setStep(1); // Go to payment method selection
    } else if (step === 1) {
      setStep(2); // Go to delivery selection
    } else if (step === 2) {
      setStep(3); // Go to review
    } else if (step === 3) {
      // Handle final checkout
      handleFinalCheckout();
    }
  };

  const handlePrevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Payment method selection handlers
  const handlePaymentMethodSelect = (method: 'online' | 'cash') => {
    setPaymentMethod(method);
    if (method === 'cash' && delivery) {
      setDelivery(false); // Force pickup for cash payments
    }
    track('tshirt_payment_method_selected', {
      method,
      sizesOrdered: Object.keys(sizeQuantities).filter(size => sizeQuantities[size] > 0).join(','),
      totalQuantity,
      delivery: method === 'cash' ? false : delivery
    });
  };

  // UI
  return (
    <PageLayout>
      <SEO
        title="ZurichJS T-Shirt - Rep Zurich, Rep JavaScript"
        description="Premium ZurichJS t-shirt. Show your love for Zurich and JavaScript with style. Limited edition design, unisex fit."
        openGraph={{
          title: 'ZurichJS T-Shirt - Rep Zurich, Rep JavaScript',
          description: 'Premium ZurichJS t-shirt. Show your love for Zurich and JavaScript with style.',
          type: 'website',
          image: '/images/merch/shirt-mock.png',
          url: '/tshirt',
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-js to-js-dark overflow-x-hidden w-full max-w-full">
        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 w-full">
          <Link href="/" className="inline-flex items-center text-black hover:text-gray-700 transition-colors group py-2 -ml-2 pl-2 rounded-lg">
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm sm:text-base">Back to Home</span>
          </Link>
        </div>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-20 overflow-x-hidden">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center w-full min-w-0">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8 text-center lg:text-left w-full min-w-0">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 bg-black/90 text-white px-4 py-2 rounded-full text-sm font-semibold">
                <Shield className="w-4 h-4" />
                <span>Limited Edition Design</span>
              </div>
              
              {/* Headlines */}
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                  Rep <span className="text-black relative inline-block">
                    Zurich
                    <div className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-2 sm:h-3 bg-js/80 -skew-x-12 -z-10"></div>
                  </span>, Rep <span className="text-black relative inline-block">
                    JavaScript
                    <div className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-2 sm:h-3 bg-js/80 -skew-x-12 -z-10"></div>
                  </span>
                </h1>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 break-words">
                  Where world-class JavaScript content meets Zurich&apos;s passionate tech community. Building something meaningful, one meetup at a time.
                </p>
              </div>

              {/* Value Props */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto lg:max-w-none lg:mx-0">
                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-js" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Made with Love</div>
                    <div className="text-sm text-gray-600">Quality you can feel</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-js" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Exclusive Design</div>
                    <div className="text-sm text-gray-600">Limited edition print</div>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
            </div>

            {/* Right - Product Image */}
            <div className="relative order-first lg:order-last w-full min-w-0">
              <div className="relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl mx-auto max-w-sm sm:max-w-md lg:max-w-none">
                {/* Stock Badge */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black text-js px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1 z-10">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Limited Stock</span>
                  <span className="xs:hidden">Limited</span>
                </div>
                
                <div className="relative">
                  <Image 
                    src="/images/merch/shirt-mock.png" 
                    alt="ZurichJS Premium T-shirt - Unisex fit, premium quality" 
                    width={400} 
                    height={400} 
                    className="w-full h-auto rounded-xl sm:rounded-2xl shadow-lg" 
                    priority 
                  />
                  
                  {/* Floating Features */}
                  <div className="absolute -right-1 sm:-right-2 lg:-right-4 bottom-1/4 bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg border">
                    <div className="text-xs text-gray-600 mb-1">Fit</div>
                    <div className="font-bold text-xs sm:text-sm text-gray-900">Unisex</div>
                  </div>
                </div>
              </div>
              
              {/* Background Elements */}
              <div className="absolute -top-4 sm:-top-8 -right-4 sm:-right-8 w-24 h-24 sm:w-32 sm:h-32 bg-js/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 sm:-bottom-8 -left-4 sm:-left-8 w-32 h-32 sm:w-40 sm:h-40 bg-js-dark/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </section>

        {/* Product Configuration */}
        <section className="max-w-7xl mx-auto px-4 pb-20 overflow-x-hidden">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 w-full min-w-0">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 w-full min-w-0">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 overflow-hidden">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 mb-8 sm:mb-10">
                  <div 
                    className={`flex flex-col items-center transition-all duration-500 cursor-pointer hover:scale-105 ${step === 0 ? 'text-black scale-110' : 'text-gray-400'} min-w-0 flex-shrink-0`}
                    onClick={() => step > 0 && setStep(0)}
                  >
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${step === 0 ? 'bg-black text-js shadow-lg animate-pulse' : step > 0 ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                      {step > 0 ? (
                        <CheckCircle size={16} className="sm:w-5 sm:h-5 animate-bounce" />
                      ) : (
                        <Shirt size={16} className="sm:w-5 sm:h-5" />
                      )}
                      {step === 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-js rounded-full animate-ping"></div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm mt-1 sm:mt-2 font-semibold text-center">Configure</span>
                  </div>
                  
                  <div className={`relative h-1 w-6 sm:w-8 md:w-10 lg:w-12 rounded-full transition-all duration-700 flex-1 max-w-[3rem] ${step > 0 ? 'bg-gradient-to-r from-black to-js' : 'bg-gray-200'}`}>
                    {step > 0 && (
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-js to-js-dark rounded-full animate-pulse"></div>
                    )}
                  </div>
                  
                  <div 
                    className={`flex flex-col items-center transition-all duration-500 cursor-pointer hover:scale-105 ${step === 1 ? 'text-black scale-110' : 'text-gray-400'} min-w-0 flex-shrink-0`}
                    onClick={() => step > 1 && setStep(1)}
                  >
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${step === 1 ? 'bg-black text-js shadow-lg animate-pulse' : step > 1 ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                      {step > 1 ? (
                        <CheckCircle size={16} className="sm:w-5 sm:h-5 animate-bounce" />
                      ) : (
                        <CreditCard size={14} className="sm:w-4 sm:h-4" />
                      )}
                      {step === 1 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-js rounded-full animate-ping"></div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm mt-1 sm:mt-2 font-semibold text-center">Payment</span>
                  </div>
                  
                  <div className={`relative h-1 w-4 sm:w-6 md:w-8 rounded-full transition-all duration-700 flex-1 max-w-[2rem] ${step > 1 ? 'bg-gradient-to-r from-black to-js' : 'bg-gray-200'}`}>
                    {step > 1 && (
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-js to-js-dark rounded-full animate-pulse"></div>
                    )}
                  </div>

                  <div 
                    className={`flex flex-col items-center transition-all duration-500 cursor-pointer hover:scale-105 ${step === 2 ? 'text-black scale-110' : 'text-gray-400'} min-w-0 flex-shrink-0`}
                    onClick={() => step > 2 && setStep(2)}
                  >
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${step === 2 ? 'bg-black text-js shadow-lg animate-pulse' : step > 2 ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                      {step > 2 ? (
                        <CheckCircle size={16} className="sm:w-5 sm:h-5 animate-bounce" />
                      ) : (
                        <Truck size={14} className="sm:w-4 sm:h-4" />
                      )}
                      {step === 2 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-js rounded-full animate-ping"></div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm mt-1 sm:mt-2 font-semibold text-center">Delivery</span>
                  </div>
                  
                  <div className={`relative h-1 w-4 sm:w-6 md:w-8 rounded-full transition-all duration-700 flex-1 max-w-[2rem] ${step > 2 ? 'bg-gradient-to-r from-black to-js' : 'bg-gray-200'}`}>
                    {step > 2 && (
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-js to-js-dark rounded-full animate-pulse"></div>
                    )}
                  </div>

                  <div 
                    className={`flex flex-col items-center transition-all duration-500 cursor-pointer hover:scale-105 ${step === 3 ? 'text-black scale-110' : 'text-gray-400'} min-w-0 flex-shrink-0`}
                    onClick={() => step > 3 && setStep(3)}
                  >
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${step === 3 ? 'bg-black text-js shadow-lg animate-pulse' : step > 3 ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                      {step > 3 ? (
                        <CheckCircle size={16} className="sm:w-5 sm:h-5 animate-bounce" />
                      ) : (
                        <Package size={14} className="sm:w-4 sm:h-4" />
                      )}
                      {step === 3 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-js rounded-full animate-ping"></div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm mt-1 sm:mt-2 font-semibold text-center">Review</span>
                  </div>
                  
                  <div className={`relative h-1 w-4 sm:w-6 md:w-8 rounded-full transition-all duration-700 flex-1 max-w-[2rem] ${step > 3 ? 'bg-gradient-to-r from-black to-js' : 'bg-gray-200'}`}>
                    {step > 3 && (
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-js to-js-dark rounded-full animate-pulse"></div>
                    )}
                  </div>
                  
                  <div className={`flex flex-col items-center transition-all duration-500 ${step === 4 ? 'text-black scale-110' : 'text-gray-400'} min-w-0 flex-shrink-0`}>
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${step === 4 ? 'bg-black text-js shadow-lg animate-pulse' : 'bg-gray-100'}`}>
                      <CheckCircle size={16} className="sm:w-5 sm:h-5" />
                      {step === 4 && (
                        <>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-js rounded-full animate-ping"></div>
                          <div className="absolute inset-0 rounded-full bg-js opacity-20 animate-ping"></div>
                        </>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm mt-1 sm:mt-2 font-semibold text-center">Complete</span>
                  </div>
                </div>

                {/* Step Content */}
                {step === 0 && (
                  <div className="space-y-6">
                    {/* Coupon Section */}
                    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-js" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900">Have a discount code?</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Enter your code to save on this order</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      placeholder="Enter discount code"
                      className="flex-1 rounded-lg sm:rounded-xl border border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
                      aria-label="Discount code input"
                    />
                    <Button 
                      onClick={handleApplyCoupon} 
                      className="bg-black hover:bg-gray-800 text-js font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                      Apply
                    </Button>
                  </div>
                  
                  {/* Discount Messages */}
                  {couponApplied && (
                    <div className="mt-4 flex items-center gap-2 text-green-700 font-semibold">
                      <CheckCircle className="w-5 h-5" />
                      <span>Discount code applied successfully!</span>
                    </div>
                  )}
                  
                  {communityDiscount && (
                    <div className="mt-4 bg-js text-black p-3 sm:p-4 rounded-lg sm:rounded-xl border border-black overflow-hidden">
                      <div className="flex items-center justify-center gap-2 font-bold text-sm sm:text-lg flex-wrap">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
                        <span className="text-center">🎉 20% Community Discount Applied!</span>
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
                      </div>
                      <p className="text-center text-xs sm:text-sm mt-1 opacity-80">Thanks for being part of our community!</p>
                    </div>
                  )}
                  
                  {hasCoupon && (
                    <div className="mt-4 bg-black text-js p-3 sm:p-4 rounded-lg sm:rounded-xl overflow-hidden">
                      <div className="flex items-center justify-center gap-2 font-bold text-sm sm:text-lg flex-wrap">
                        <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-js flex-shrink-0" />
                        <span className="text-center break-words">{discountLabel} off with code: {couponData?.code}</span>
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-js flex-shrink-0" />
                      </div>
                    </div>
                  )}
                  
                  {couponError && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                      {couponError}
                    </div>
                  )}
                  
                  {/* Login Incentive for Non-Members */}
                  {!isSignedIn && (
                    <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-green-900">🎉 Community Member Discount!</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Sign in to unlock your <strong>20% community discount</strong> on all merch
                          </p>
                        </div>
                        <a
                          href="/sign-in?redirect=/tshirt"
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                        >
                          Sign In
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Size & Quantity Selection */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-js" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg sm:text-xl text-gray-900">Choose Your Fit</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Unisex comfort for everyone • Perfect for meetups • Max 10 items total</p>
                    </div>
                  </div>
                  
                  {stockLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center gap-2 text-gray-600">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                        <span className="text-sm">Checking stock availability...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {SIZES.map((sz) => {
                        const stockCount = stock[sz] || 0;
                        const currentQty = sizeQuantities[sz] || 0;
                        const isLowStock = stockCount <= 5 && stockCount > 0 && !stockError;
                        const isOutOfStock = stockCount === 0 && !stockError;
                        const isStockUnknown = stockError;
                        
                        return (
                          <div key={sz} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            currentQty > 0 
                              ? 'bg-js/10 border-js shadow-md' 
                              : isOutOfStock && !isStockUnknown
                              ? 'bg-gray-50 border-gray-200 opacity-75'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                                currentQty > 0 
                                  ? 'bg-black text-js' 
                                  : isOutOfStock && !isStockUnknown
                                  ? 'bg-gray-200 text-gray-500'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {sz}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">Size {sz}</div>
                                <div className="text-sm text-gray-600">
                                  {!isStockUnknown && stockCount > 0 && (
                                    <span className={isLowStock ? 'text-orange-600' : 'text-green-600'}>
                                      {stockCount} in stock
                                    </span>
                                  )}
                                  {!isStockUnknown && isOutOfStock && (
                                    <span className="text-red-600">Sold out</span>
                                  )}
                                  {isStockUnknown && (
                                    <span className="text-yellow-600">Stock unknown</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button
                                className="w-8 h-8 rounded-lg border border-gray-300 bg-white font-bold text-lg hover:border-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-black"
                                onClick={() => setSizeQuantities(prev => ({ ...prev, [sz]: Math.max(0, (prev[sz] || 0) - 1) }))}
                                disabled={currentQty <= 0 || (isOutOfStock && !isStockUnknown)}
                                aria-label={`Decrease quantity for size ${sz}`}
                              >
                                −
                              </button>
                              
                              <div className="bg-gray-100 px-3 py-1 rounded-lg min-w-[3rem] text-center font-bold">
                                {currentQty}
                              </div>
                              
                              <button
                                className="w-8 h-8 rounded-lg border border-gray-300 bg-white font-bold text-lg hover:border-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-black"
                                onClick={() => setSizeQuantities(prev => ({ ...prev, [sz]: Math.min(stockCount, totalQuantity < 10 ? (prev[sz] || 0) + 1 : (prev[sz] || 0)) }))}
                                disabled={(isOutOfStock && !isStockUnknown) || currentQty >= stockCount || totalQuantity >= 10}
                                aria-label={`Increase quantity for size ${sz}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Order Summary */}
                      <div className="bg-gray-50 rounded-xl p-4 mt-6">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-900">Total Items:</span>
                          <span className="font-bold text-lg">{totalQuantity}</span>
                        </div>
                        {Object.entries(sizeQuantities)
                          .filter(([, qty]) => qty > 0)
                          .map(([size, qty]) => (
                            <div key={size} className="flex justify-between items-center text-sm text-gray-600">
                              <span>Size {size}:</span>
                              <span>{qty} × CHF {BASE_PRICE} = CHF {qty * BASE_PRICE}</span>
                            </div>
                          ))
                        }
                      </div>
                      
                      {!stockLoading && stockError && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                          ⚠️ Unable to check stock at the moment. Please reach out to support at hello@zurichjs.com for assistance.
                        </div>
                      )}
                      
                      {totalQuantity === 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                          💡 Select quantities for the sizes you want to add them to your cart.
                        </div>
                      )}
                      
                      {totalQuantity >= 10 && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                          ⚠️ Maximum 10 items per order reached.
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

                {/* Step 1: Payment Method */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Choose Payment Method</h3>
                      <p className="text-gray-600">Select how you&apos;d like to pay for your ZurichJS t-shirt</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <button
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 transform hover:scale-105 ${
                          paymentMethod === 'online'
                            ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-xl scale-105'
                            : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
                        }`}
                        onClick={() => handlePaymentMethodSelect('online')}
                      >
                        <div className="text-center">
                          <CreditCard className="w-12 h-12 mx-auto mb-3 text-green-600" />
                          <h4 className="font-bold text-lg mb-2">💳 Pay Online</h4>
                          <p className="text-sm text-gray-600">Card • TWINT • Instant • Home delivery available</p>
                        </div>
                      </button>
                      
                      <button
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transform hover:scale-105 ${
                          paymentMethod === 'cash'
                            ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-500 shadow-xl scale-105'
                            : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-md'
                        }`}
                        onClick={() => handlePaymentMethodSelect('cash')}
                      >
                        <div className="text-center">
                          <Banknote className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                          <h4 className="font-bold text-lg mb-2">💰 Pay Cash</h4>
                          <p className="text-sm text-gray-600">At meetup • Free pickup • Meet the community ✨</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Delivery Options */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Choose Delivery Method</h3>
                      <p className="text-gray-600">How would you like to receive your ZurichJS t-shirt?</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <button
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F1E271] transform hover:scale-105 ${
                          !delivery
                            ? 'bg-gradient-to-br from-[#F1E271] to-yellow-200 border-[#F1E271] shadow-xl scale-105'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                        onClick={() => setDelivery(false)}
                      >
                        <div className="text-center">
                          <Users className="w-12 h-12 mx-auto mb-3 text-gray-800" />
                          <h4 className="font-bold text-lg mb-2">🎪 Meetup Pickup</h4>
                          <div className="text-2xl font-bold mb-2 text-green-700">FREE</div>
                          <p className="text-sm text-gray-600">Join us at the next meetup • Meet fellow developers</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {paymentMethod === 'cash' 
                              ? 'Perfect for cash payment!' 
                              : 'Available with online or cash payment'
                            }
                          </p>
                        </div>
                      </button>
                      
                      <button
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F1E271] transform hover:scale-105 ${
                          delivery
                            ? 'bg-gradient-to-br from-[#F1E271] to-yellow-200 border-[#F1E271] shadow-xl scale-105'
                            : paymentMethod === 'cash'
                            ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                        onClick={() => {
                          if (paymentMethod === 'cash') return; // Prevent selection for cash
                          setDelivery(true);
                        }}
                        disabled={paymentMethod === 'cash'}
                      >
                        <div className="text-center">
                          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-800" />
                          <h4 className="font-bold text-lg mb-2">🚚 Home Delivery</h4>
                          <div className="text-2xl font-bold mb-2 text-gray-900">+CHF 10</div>
                          <p className="text-sm text-gray-600">Switzerland only • 5-10 business days</p>
                          <p className="text-xs text-gray-500 mt-1">Includes tracking & insurance</p>
                          {paymentMethod === 'cash' && (
                            <p className="text-xs text-red-600 mt-2">Not available with cash payment</p>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Cash Payment Details Form */}
                    {paymentMethod === 'cash' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Banknote className="w-5 h-5 text-amber-600" />
                          <h4 className="font-bold text-lg text-amber-900">Contact Details for Cash Payment</h4>
                        </div>
                        {userLoaded && user ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-green-700">
                              ✓ Information taken from your account profile
                            </p>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                            <input
                              type="text"
                              value={cashPaymentDetails.firstName}
                              onChange={(e) => setCashPaymentDetails(prev => ({ ...prev, firstName: e.target.value }))}
                              disabled={!!(userLoaded && user)}
                              className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                userLoaded && user ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                              }`}
                              placeholder="Your first name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                            <input
                              type="text"
                              value={cashPaymentDetails.lastName}
                              onChange={(e) => setCashPaymentDetails(prev => ({ ...prev, lastName: e.target.value }))}
                              disabled={!!(userLoaded && user)}
                              className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                userLoaded && user ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                              }`}
                              placeholder="Your last name"
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                            <input
                              type="email"
                              value={cashPaymentDetails.email}
                              onChange={(e) => setCashPaymentDetails(prev => ({ ...prev, email: e.target.value }))}
                              disabled={!!(userLoaded && user)}
                              className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                userLoaded && user ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                              }`}
                              placeholder="your.email@example.com"
                              required
                            />
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-700">
                            💡 We&apos;ll use this information to contact you about pickup details at the next meetup.
                          </p>
                        </div>
                      </div>
                    )}

                    {delivery && (
                      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                        <h4 className="font-bold text-lg text-gray-900 mb-4">Delivery Address</h4>
                        {userLoaded && user ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-green-700">
                              ✓ Name and email taken from your account profile
                            </p>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input
                              type="text"
                              value={deliveryAddress.name}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, name: e.target.value }))}
                              disabled={!!(userLoaded && user)}
                              className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${
                                userLoaded && user ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                              }`}
                              placeholder="Your full name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                              type="email"
                              value={deliveryAddress.email}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, email: e.target.value }))}
                              disabled={!!(userLoaded && user)}
                              className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${
                                userLoaded && user ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                              }`}
                              placeholder="your.email@example.com"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                            <input
                              type="text"
                              value={deliveryAddress.address}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, address: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                              placeholder="Street address"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <input
                              type="text"
                              value={deliveryAddress.city}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                              placeholder="City"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                            <input
                              type="text"
                              value={deliveryAddress.zipCode}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                              placeholder="ZIP code"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-sm text-amber-800">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">
                          {delivery
                            ? 'Delivery within 5-10 business days to Swiss addresses (includes tracking & insurance)'
                            : 'Available for pickup at our next meetup event'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Review Your Order</h3>
                      <p className="text-gray-600">Please review your order details before completing your purchase</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Product:</span>
                          <span>ZurichJS T-Shirt</span>
                        </div>
                        {Object.entries(sizeQuantities)
                          .filter(([, qty]) => qty > 0)
                          .map(([size, qty]) => (
                            <div key={size} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Size {size}:</span>
                              <span>{qty} × CHF {BASE_PRICE} = CHF {qty * BASE_PRICE}</span>
                            </div>
                          ))
                        }
                        <div className="flex justify-between items-center font-semibold pt-2 border-t">
                          <span>Total Items:</span>
                          <span>{totalQuantity}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Payment Method:</span>
                        <span>{paymentMethod === 'cash' ? 'Cash at Meetup' : 'Online Payment'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Delivery:</span>
                        <span>{delivery ? 'Home Delivery (+CHF 10)' : 'Meetup Pickup (Free)'}</span>
                      </div>
                      {(communityDiscount || hasCoupon) && (
                        <div className="flex justify-between items-center text-green-700">
                          <span className="font-medium">Discount:</span>
                          <span>-{discountLabel}</span>
                        </div>
                      )}
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-xl font-bold">
                          <span>Total:</span>
                          <span>CHF {discountedTotal}</span>
                        </div>
                      </div>
                    </div>
                    
                    {checkoutError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                        {checkoutError}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && (
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Order Confirmed! 🎉</h3>
                      <p className="text-gray-600 mb-6">
                        {paymentMethod === 'cash' 
                          ? "Amazing! We'll see you at the next meetup. Can't wait to welcome you to the community! 💛"
                          : "Welcome to the family! Your shirt is on its way. We'll keep you updated every step of the journey. 🚀"
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-100">
                    {step >= 2 && (
                      <Button
                        onClick={handlePrevStep}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
                      >
                        Back
                      </Button>
                    )}
                    {step < 2 && <div></div>}
                    <Button
                      onClick={handleNextStep}
                      disabled={!isStepValid(step) || loading || step === 4}
                      className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                        step === 4 
                          ? 'bg-green-500 text-white cursor-not-allowed'
                          : 'bg-black hover:bg-gray-800 text-js disabled:bg-gray-300 disabled:text-gray-500'
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : step === 4 ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Ordered
                        </>
                      ) : step === 3 ? (
                        paymentMethod === 'cash' ? 'Confirm Order' : 'Pay Now'
                      ) : step === 2 ? (
                        <>
                          Continue to Review
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : step === 1 ? (
                        <>
                          Continue to Delivery
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
              </div>
            </div>
            {/* Order Summary */}
            <div className="lg:col-span-1 w-full min-w-0">
              <div className="lg:sticky lg:top-6 space-y-6">
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-hidden">
                  {/* Header */}
                  <div className="text-center pb-3 sm:pb-4 border-b border-gray-100">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Order Summary</h2>
                  </div>
                  
                  {/* Product Details */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg sm:rounded-xl flex items-center justify-center text-js font-bold text-sm sm:text-base flex-shrink-0">
                          JS
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm sm:text-base lg:text-lg text-gray-900">ZurichJS T-Shirt</div>
                          <div className="text-xs sm:text-sm text-gray-600">{totalQuantity} items • {delivery ? 'Home Delivery' : 'Meetup Pickup'}</div>
                        </div>
                      </div>
                      
                      {/* Size breakdown */}
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-sm font-medium text-gray-700 mb-2">Items:</div>
                        {Object.entries(sizeQuantities)
                          .filter(([, qty]) => qty > 0)
                          .map(([size, qty]) => (
                            <div key={size} className="flex justify-between text-sm text-gray-600">
                              <span>Size {size}</span>
                              <span>{qty} × CHF {BASE_PRICE}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Price Breakdown */}
                  <div className="space-y-3 py-4 border-t border-gray-100 text-sm sm:text-base">
                    {Object.entries(sizeQuantities)
                      .filter(([, qty]) => qty > 0)
                      .map(([size, qty]) => (
                        <div key={size} className="flex justify-between items-center">
                          <span className="text-gray-600 truncate pr-2">Size {size} ({qty}x)</span>
                          <span className="font-semibold flex-shrink-0">CHF {BASE_PRICE * qty}</span>
                        </div>
                      ))
                    }
                    
                    {delivery && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 truncate pr-2">Delivery (tracked & insured)</span>
                        <span className="font-semibold flex-shrink-0">CHF {DELIVERY_ADDON}</span>
                      </div>
                    )}
                    
                    {communityDiscount && (
                      <div className="flex justify-between items-center text-green-700">
                        <span className="flex items-center gap-1 sm:gap-2 truncate pr-2">
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Member Discount (20%)</span>
                        </span>
                        <span className="font-bold flex-shrink-0">-CHF {Math.round(tshirtTotal * 0.2)}</span>
                      </div>
                    )}
                    
                    {hasCoupon && (
                      <div className="flex justify-between items-center text-amber-700">
                        <span className="flex items-center gap-1 sm:gap-2 truncate pr-2">
                          <Ticket className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">Coupon Discount</span>
                        </span>
                        <span className="font-bold flex-shrink-0">-CHF {Math.round(couponData?.amountOff || 0)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Total */}
                  <div className="border-t-2 border-gray-200 pt-4">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Total</span>
                      <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-black">CHF {discountedTotal}</span>
                    </div>
                    
                    {/* Step Navigation */}
                    <div className="flex justify-between pt-4">
                      <div></div> {/* Empty div for spacing */}
                      <Button
                        onClick={handleNextStep}
                        disabled={!isStepValid(step) || loading || step === 4}
                        className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                          step === 4 
                            ? 'bg-green-500 text-white cursor-not-allowed'
                            : 'bg-black hover:bg-gray-800 text-js disabled:bg-gray-300 disabled:text-gray-500'
                        }`}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : step === 4 ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Ordered
                          </>
                        ) : step === 3 ? (
                          paymentMethod === 'cash' ? 'Confirm Order' : 'Pay Now'
                        ) : step === 2 ? (
                          <>
                            Continue to Review
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : step === 1 ? (
                          <>
                            Continue to Delivery
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Continue to Payment
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Merch Survey - Right below order summary */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-purple-100">
                  <button
                    onClick={() => setShowMerchSurvey(!showMerchSurvey)}
                    className="w-full flex items-center justify-between text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-purple-900">What merch next?</h3>
                        <p className="text-xs sm:text-sm text-purple-700">Help us decide</p>
                      </div>
                    </div>
                    <div className={`transform transition-transform ${showMerchSurvey ? 'rotate-180' : ''}`}>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {showMerchSurvey && (
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      {!surveySubmitted ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-purple-900 mb-2">
                              What ZurichJS merch would you love to see?
                            </label>
                            <textarea
                              value={merchSuggestion}
                              onChange={(e) => setMerchSuggestion(e.target.value)}
                              placeholder="Hoodies, stickers, mugs, laptop sleeves...?"
                              className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleMerchSurveySubmit}
                              disabled={!merchSuggestion.trim() || surveySubmitting}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {surveySubmitting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Sending...
                                </>
                              ) : (
                                'Submit'
                              )}
                            </button>
                            <button
                              onClick={() => setShowMerchSurvey(false)}
                              className="text-purple-600 hover:text-purple-700 px-3 py-2 text-xs sm:text-sm font-medium"
                            >
                              Later
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <h4 className="font-bold text-sm text-green-900 mb-1">Thanks!</h4>
                          <p className="text-xs text-green-700">
                            We&apos;ll consider it for our next drop! 🎉
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        

        {/* Support Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 border border-blue-100">
            <div className="text-center max-w-3xl mx-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Questions? We&apos;re Here to Help</h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                Need help with sizing, have questions about delivery, or want to place a bulk order?
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Size Help</h3>
                  <p className="text-sm text-gray-600">Need sizing advice or want to exchange sizes?</p>
                </div>
                
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Group Orders</h3>
                  <p className="text-sm text-gray-600">Ordering for your team or company?</p>
                </div>
                
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Billing</h3>
                  <p className="text-sm text-gray-600">Need invoices or have payment questions?</p>
                </div>
                
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Other Issues</h3>
                  <p className="text-sm text-gray-600">Something else? Just ask!</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-js rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Email Support</div>
                      <div className="text-sm text-gray-600">Usually respond within 24 hours</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <a
                      href="mailto:hello@zurichjs.com?subject=T-shirt Order Support&body=Hi ZurichJS team,%0D%0A%0D%0AI need help with my t-shirt order:%0D%0A%0D%0A[Please describe your question or issue]%0D%0A%0D%0AThanks!"
                      className="bg-black hover:bg-gray-800 text-js px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Contact Support
                    </a>
                    <div className="text-sm text-gray-600 font-medium">
                      hello@zurichjs.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Social Proof Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 overflow-x-hidden">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Part of Something Meaningful</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Join our family of JavaScript lovers building something meaningful together
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-js" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">500+ Community Members</h3>
              <p className="text-sm sm:text-base text-gray-600">Passionate developers sharing knowledge and ideas</p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-js" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">World-Class Content</h3>
              <p className="text-sm sm:text-base text-gray-600">Bringing renowned speakers and valuable insights to Zurich</p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                <Award className="w-7 h-7 sm:w-8 sm:h-8 text-js" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Premium Quality</h3>
              <p className="text-sm sm:text-base text-gray-600">Carefully selected materials for comfort and durability</p>
            </div>
          </div>
        </section>
        
        {/* Cancellation Recovery Modal */}
        {showCancelModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleTryAgain();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleTryAgain();
              }
            }}
            tabIndex={-1}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
                 onClick={(e) => e.stopPropagation()}>
              <div className="bg-amber-50 border-b border-amber-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Checkout Cancelled</h3>
                      <p className="text-sm text-gray-600">Help us improve your experience</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTryAgain}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {!cancelFeedbackSubmitted ? (
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      We noticed you didn&apos;t complete your t-shirt purchase. Could you tell us why?
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for not completing purchase
                      </label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-js focus:border-transparent"
                      >
                        <option value="">Please select a reason</option>
                        <option value="Price too high">Price too high</option>
                        <option value="Size not available">Size not available</option>
                        <option value="Delivery options didn't work">Delivery options didn&apos;t work</option>
                        <option value="Payment issues">Payment issues</option>
                        <option value="Changed my mind">Changed my mind</option>
                        <option value="Other reason">Other reason</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (optional - for follow-up)
                      </label>
                      <input
                        type="email"
                        value={cancelEmail}
                        onChange={(e) => setCancelEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-js focus:border-transparent"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleTryAgain}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={handleCancelFeedback}
                        disabled={!cancelReason}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Thank You!</h4>
                      <p className="text-gray-600 mb-4">
                        Your feedback helps us improve the ZurichJS experience for everyone.
                      </p>
                      <Button
                        onClick={handleTryAgain}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                      >
                        Continue Shopping
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cash Payment Modal */}
        {showCashModal && (
          <CashPaymentModal
            isOpen={showCashModal}
            onClose={() => setShowCashModal(false)}
            ticketTitle="ZurichJS T-Shirt"
            price={discountedTotal}
            ticketType="event"
            eventId="zurichjs-tshirt"
          />
        )}
      </div>
    </PageLayout>
  );
} 