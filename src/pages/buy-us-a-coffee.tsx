import { motion } from 'framer-motion';
import { Heart, Star, Users, Code, Calendar, Twitter, Github, Linkedin, Globe, Mail, UserPlus, Shirt, RefreshCw, ChevronRight, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import Callout from "@/components/ui/Callout";
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getUpcomingEvents, getPastEvents } from '@/sanity/queries';

interface StripePrice {
  id: string;
  amount: number;
  currency: string;
  type: 'one_time' | 'recurring';
  interval?: string | null;
  interval_count?: number | null;
  nickname?: string | null;
}

interface SupportPricesData {
  oneTime: StripePrice[];
  recurring: StripePrice[];
  product: {
    id: string;
    name: string;
  };
}


interface SupportPageProps {
  recentSupporters: Array<{
    name: string;
    date: string;
    photo?: string;
    link?: string;
  }>;
  eventsHosted: number;
}

export default function Support({ recentSupporters, eventsHosted }: SupportPageProps) {
  useReferrerTracking();
  const { track } = useEvents();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [selectedPresetAmount, setSelectedPresetAmount] = useState<number | null>(20);
  const [pricesData, setPricesData] = useState<SupportPricesData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cancellationDisclosureIsOpen, setCancellationDisclosureIsOpen] = useState(false);

  // Check for success query parameter
  useEffect(() => {
    if (router.query.success === 'true') {
      setShowSuccess(true);

      // Send notification about the donation
      const sendDonationNotification = async () => {
        try {
          // Get donation details from URL parameters
          const donationType = router.query.donation_type as string;
          const amount = router.query.amount as string;
          const currency = router.query.currency as string;
          const customerEmail = router.query.customer_email as string;

          let donationInfo = '';

          if (amount && currency && donationType) {
            const typeLabels: Record<string, string> = {
              monthly: 'Monthly',
              oneoff: 'One-time',
              custom: 'Custom'
            };

            const typeLabel = typeLabels[donationType] || 'Unknown';
            donationInfo = `\n\n💰 Amount: ${currency} ${amount}\n🔄 Type: ${typeLabel}`;

            if (donationType === 'monthly') {
              donationInfo += ' (recurring)';
            }
          }

          if (customerEmail) {
            donationInfo += `\n📧 Email: ${customerEmail}`;
          }

          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: '💚 New ZurichJS Donation!',
              message: `Someone just showed some love to ZurichJS with a donation! 🎉${donationInfo}`,
              type: 'other',
              priority: 'normal'
            }),
          });
        } catch (error) {
          console.error('Error sending donation notification:', error);
        }
      };

      // Only send notification once per session to avoid duplicates
      const notificationSent = sessionStorage.getItem('donation-notification-sent');
      if (!notificationSent) {
        sendDonationNotification();
        sessionStorage.setItem('donation-notification-sent', 'true');
      }

      // Auto-hide success message after 10 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
        // Remove success query param from URL
        const { ...query } = router.query;
        router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
        // Clear the notification flag when cleaning up
        sessionStorage.removeItem('donation-notification-sent');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [router]);

  // Fetch Stripe prices on component mount
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/support-prices');
        const data = await response.json();

        console.log('data', data);
        setPricesData(data);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };
    fetchPrices();
  }, []);

  // Get available pricing options with useMemo to prevent dependency issues
  const monthlyOptions = useMemo(() =>
    pricesData?.recurring?.filter(p => p.interval === 'month').sort((a, b) => a.amount - b.amount) || [],
    [pricesData]
  );
  const oneOffOptions = useMemo(() =>
    pricesData?.oneTime?.sort((a, b) => a.amount - b.amount) || [],
    [pricesData]
  );

  // Set default selected amount when prices load
  useEffect(() => {
    if (pricesData && !selectedAmount) {
      if (isRecurring && monthlyOptions.length > 0) {
        setSelectedAmount(monthlyOptions[0].id);
      } else if (!isRecurring && oneOffOptions.length > 0) {
        setSelectedAmount(oneOffOptions[0].id);
      }
    }
  }, [pricesData, isRecurring, selectedAmount, monthlyOptions, oneOffOptions]);

  // Function to handle Stripe checkout
  const handleSupportClick = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedPresetAmount;

    if (!amount) {
      alert('Please select or enter an amount');
      return;
    }

    if (amount < 5) {
      alert('Minimum amount is CHF 5');
      return;
    }

    setLoading(true);

    try {
      // Find the appropriate Stripe price based on amount and recurring type
      const targetPrices = isRecurring ? monthlyOptions : oneOffOptions;
      const matchingPrice = targetPrices.find(p => p.amount === amount);

      const requestBody: {
        priceId?: string;
        amount?: number;
        recurring?: boolean;
      } = {};

      if (matchingPrice) {
        // Use existing Stripe price
        requestBody.priceId = matchingPrice.id;
      } else {
        // For custom amounts, create based on user's selection (recurring or one-time)
        requestBody.amount = amount;
        requestBody.recurring = isRecurring;
      }

      const response = await fetch('/api/checkout-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.url) {
        track('support_click', {
          type: isRecurring ? 'monthly' : 'oneoff',
          amount: amount,
          custom: !matchingPrice,
        });
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCancellationDisclosureIsOpen(false);
  }, [isRecurring]);

  return (
    <Layout>
      <SEO
        title="Show Love to ZurichJS | Support Our Community"
        description="Show some love to ZurichJS and help us keep our community thriving! Support us through donations, buying merch, volunteering, or giving feedback."
        openGraph={{
          title: "Show Love to ZurichJS",
          description: "Help us create amazing experiences for JavaScript enthusiasts in Zurich.",
          image: "/api/og/support",
          type: "website"
        }}
      />

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <motion.div
            initial={{opacity: 0, y: -50, scale: 0.9}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: -50, scale: 0.9}}
            className="bg-white border-l-4 border-green-500 rounded-lg shadow-xl p-6"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Heart className="h-6 w-6 text-green-500 animate-pulse"/>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Thank You! 💚
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Your support means the world to us! You&apos;re helping us build an amazing JavaScript community in Zurich.
                </p>
                <div className="mt-3 flex">
                  <button
                    onClick={() => setShowSuccess(false)}
                    className="text-sm font-medium text-green-600 hover:text-green-500 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hero Section */}
      <Section variant="gradient" padding="lg">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            className="flex flex-col basis-1/2 lg:basis-2/3"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 leading-tight">
              You&apos;re what keeps us running
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6 text-gray-900">
              Thank you for choosing to support ZurichJS with a kind donation
            </p>
            <p className="text-base sm:text-lg mb-6 sm:mb-8 text-gray-900 leading-relaxed">
              Your love and support allows us to organize amazing meetups, invite world-class speakers, provide great food and drinks,
              and create an inclusive space where JavaScript enthusiasts can learn, connect, and grow together.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button
                onClick={() => {
                  setIsRecurring(true);
                  document.getElementById('support-section')?.scrollIntoView({behavior: 'smooth'});
                }}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 sm:py-4 px-6 sm:px-8 rounded-full
                  shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105
                  flex items-center gap-3 text-base sm:text-lg justify-center min-h-[48px]"
              >
                <Heart size={18} className="animate-pulse text-red-500 mr-2"/>
                <span>Show Monthly Love</span>
              </Button>
              <Link href="/tshirt" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="py-3 sm:py-4 px-6 sm:px-8 rounded-full font-medium flex items-center gap-2 text-base sm:text-lg justify-center min-h-[48px] w-full"
                >
                  <Shirt size={18} className="mr-2"/>
                  <span>Get Your ZurichJS T-Shirt</span>
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.7, delay: 0.3}}
            className="grow basis-1/2 lg:basis-2/3"
          >
            <div className="bg-white p-6 rounded-lg shadow-xl border-4 border-gray-900">
              <div className="p-4 bg-gray-100 rounded-lg mb-6">
                <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">How Your Love Makes a Difference</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Heart className="text-red-500 mt-1 mr-3 flex-shrink-0" size={20}/>
                    <span>Keep our community space welcoming with great food & drinks</span>
                  </li>
                  <li className="flex items-start">
                    <Calendar className="text-red-500 mt-1 mr-3 flex-shrink-0" size={20}/>
                    <span>Organize regular meetups that bring people together</span>
                  </li>
                  <li className="flex items-start">
                    <Code className="text-red-500 mt-1 mr-3 flex-shrink-0" size={20}/>
                    <span>Create valuable learning experiences for everyone</span>
                  </li>
                  <li className="flex items-start">
                    <Star className="text-red-500 mt-1 mr-3 flex-shrink-0" size={20}/>
                    <span>Bring amazing speakers to share their expertise</span>
                  </li>
                  <li className="flex items-start">
                    <Users className="text-red-500 mt-1 mr-3 flex-shrink-0" size={20}/>
                    <span>Foster connections that last beyond our events</span>
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <p className="text-gray-900 mb-2"><span className="font-bold">{eventsHosted}+</span> events hosted to date</p>
                <p className="text-gray-900"><span className="font-bold">100%</span> volunteer-driven</p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Simple Support Section */}
      <Section id="support-section" variant="white">
        <motion.div
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.5}}
          className="max-w-2xl mx-auto sm:px-6"
        >
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 text-gray-900">Show Some Love ❤️</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-700">
              Choose how you&apos;d like to support ZurichJS
            </p>
          </div>

          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
            {/* Amount Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Amount</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                {[10, 20, 40, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setSelectedPresetAmount(amount);
                      setCustomAmount('');
                    }}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-center min-h-[60px] touch-manipulation ${
                      selectedPresetAmount === amount && !customAmount
                        ? 'border-js-dark bg-js-dark/10'
                        : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-base">CHF {amount}</div>
                  </button>
                ))}
              </div>

              {selectedPresetAmount && !customAmount && isRecurring && (
                <Callout
                  key={selectedPresetAmount}
                  className="mt-4 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  motionProps={{
                    transition: {duration: 0.3},
                    animate: {opacity: 1, y: 0},
                    initial: {opacity: 0, y: 10}
                  }}
                  type="stripped"
                  textClassName="italic text-center"
                >
                  {selectedPresetAmount === 10 && "CHF 10 per month helps us pay for Drive storage and other tooling"}
                  {selectedPresetAmount === 20 && "CHF 20 per month ensures we never run out of snacks"}
                  {selectedPresetAmount === 40 && "CHF 40 per month helps us cover the cost of a couple of beers for one meetup"}
                  {selectedPresetAmount === 50 && "CHF 50 per month helps cover two large pizzas at a meetup"}
                </Callout>
              )}
              {/* Custom Amount */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Or decide on your own</label>
                <input
                  type="number"
                  placeholder="Enter amount in CHF (min. 5)"
                  value={customAmount}
                  onChange={(e) => {
                    // force min 5 before even validating
                    setCustomAmount(Math.max(5, parseInt(e.target.value)).toString());
                    if (e.target.value) {
                      setSelectedPresetAmount(null);
                    }
                  }}
                  className="w-full px-4 py-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js-dark touch-manipulation"
                  min="5"
                  inputMode="decimal"
                />

              </div>
            </div>

            {/* Recurring Toggle */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">Recurring?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => setIsRecurring(true)}
                  className={`p-4 sm:p-5 sm:h-24 rounded-lg border-2 transition-all text-center touch-manipulation min-h-[70px] ${
                    isRecurring
                      ? 'border-js-dark bg-js-dark/10 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-base">Monthly</div>
                </button>
                <button
                  onClick={() => setIsRecurring(false)}
                  className={`p-4 sm:p-5 sm:h-24 rounded-lg border-2 transition-all text-center touch-manipulation min-h-[70px] ${
                    !isRecurring
                      ? 'border-js-dark bg-js-dark/10 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-base">One-time</div>
                </button>
              </div>

              {/* Monthly Subscription Cancellation Note */}
              {isRecurring && (
                <motion.div
                  initial={{opacity: 0, y: 10}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.3}}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="text-sm font-semibold text-left text-gray-600 hover:text-gray-800 hover:bg-gray-200 p-2 mt-2 rounded-sm cursor-pointer flex items-center transition-colors duration-300"
                      onClick={()=> setCancellationDisclosureIsOpen(!cancellationDisclosureIsOpen)}
                    >
                      <span>
                        <Info size={16} className="inline mr-2"/>
                        Cancel anytime, no questions asked
                      </span>
                      <ChevronRight className={`inline-block shrink-0 ml-auto ${cancellationDisclosureIsOpen ? 'rotate-90' : 'rotate-0'} transition-all duration-300`} size={16}/>
                    </button>
                    {cancellationDisclosureIsOpen && (
                      <motion.p
                        className="text-sm px-2"
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.3}}
                      >
                        <a
                          href="mailto:hello@zurichjs.com?subject=Cancel Monthly Support&body=Hi! I'd like to cancel my monthly support. I'm emailing from the same email address I used to subscribe."
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Send us an email
                        </a>
                        {" "}at hello@zurichjs.com with your registered address and we will promptly unsubscribe you, no questions asked.
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Support Button */}
            <Button
              onClick={handleSupportClick}
              disabled={loading || (!selectedPresetAmount && !customAmount)}
              className="w-full mt-10 bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 sm:py-5 px-6 sm:px-8 rounded-lg
                  shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95
                  flex items-center gap-3 justify-center text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation min-h-[56px]"
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin"/>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Heart size={20} className="text-red-500 mr-2 hidden sm:block"/>
                  <span>Send the love our way</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>


        {/* Other Ways to Support */}
        <motion.div
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.5}}
          className="bg-gradient-to-r from-gray-50 to-gray-100 p-8 rounded-lg mt-12"
        >
          <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900">Other ways to support</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Link href="/tshirt">
              <div
                className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-js-dark touch-manipulation">
                <div className="text-center">
                  <Shirt className="mx-auto mb-3 text-gray-700" size={28}/>
                  <h4 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Get a ZurichJS T-Shirt</h4>
                  <p className="text-sm sm:text-base text-gray-600">Or several, we won&#39;t judge 🙃</p>
                </div>
              </div>
            </Link>
            <a href="mailto:hello@zurichjs.com">
              <div
                className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-js-dark touch-manipulation">
                <div className="text-center">
                  <Mail className="mx-auto mb-3 text-gray-700" size={28}/>
                  <h4 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Give us Feedback</h4>
                  <p className="text-sm sm:text-base text-gray-600">Share your ideas and help us improve our events!</p>
                </div>
              </div>
            </a>
            <Link href="/cfv">
              <div
                className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-js-dark touch-manipulation sm:col-span-2 lg:col-span-1">
                <div className="text-center">
                  <UserPlus className="mx-auto mb-3 text-gray-700" size={28}/>
                  <h4 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Volunteer</h4>
                  <p className="text-sm sm:text-base text-gray-600">Join the team and help shape the future of ZurichJS!</p>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      </Section>

      {/* Recent Supporters */}
      {recentSupporters && recentSupporters.length > 0 ? (
        <Section variant="gray">
          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5}}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Recent Supporters 💛</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              A big thank you to these amazing people who&apos;ve supported ZurichJS recently!
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentSupporters.map((supporter, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {supporter.photo ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={supporter.photo}
                      alt={supporter.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-r from-amber-400 to-yellow-300 flex items-center justify-center">
                    <span className="text-4xl">🙏</span>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">{supporter.name}</h3>
                      {supporter.link && (
                        <div className="flex items-center">
                          {supporter.link.includes('twitter.com') && (
                            <a
                              href={supporter.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-blue-400 transition-colors"
                              aria-label={`${supporter.name}'s Twitter (opens in new tab)`}
                            >
                              <Twitter size={16}/>
                            </a>
                          )}
                          {supporter.link.includes('github.com') && (
                            <a
                              href={supporter.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-black transition-colors"
                              aria-label={`${supporter.name}'s GitHub (opens in new tab)`}
                            >
                              <Github size={16}/>
                            </a>
                          )}
                          {supporter.link.includes('linkedin.com') && (
                            <a
                              href={supporter.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-blue-700 transition-colors"
                              aria-label={`${supporter.name}'s LinkedIn (opens in new tab)`}
                            >
                              <Linkedin size={16}/>
                            </a>
                          )}
                          {!supporter.link.match(/twitter\.com|github\.com|linkedin\.com/) && (
                            <a
                              href={supporter.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-amber-600 transition-colors"
                              aria-label={`${supporter.name}'s website (opens in new tab)`}
                            >
                              <Globe size={16}/>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      {supporter.date}
                    </div>
                    <div className="text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd"
                              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                              clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section variant="gray">
          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5}}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Recent Supporters 💛</h2>
          </motion.div>

          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-8 rounded-lg text-center shadow-inner">
            <div className="text-4xl mb-4">🌟</div>
            <h3 className="text-xl font-bold mb-2">Be the First Supporter!</h3>
            <p className="text-gray-600 mb-4">Your contribution will help us grow the ZurichJS community.</p>
            <button
              className="bg-gradient-to-r from-js-dark to-yellow-500 text-white font-bold py-2 px-6 rounded-full
                    hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              onClick={() => document.getElementById('bmc-wbtn')?.click()}
            >
              Support Now
            </button>
          </div>
        </Section>
      )}

      {/* FAQ Section */}
      <Section variant="white">
        <motion.div
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.5}}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Frequently Asked Questions</h2>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5, delay: 0.1}}
            className="bg-gray-50 p-6 rounded-lg"
          >
            <h3 className="text-xl font-bold mb-2 text-gray-900">How is my support used?</h3>
            <p className="text-gray-700">
              Your support goes directly to covering community expenses such as venue rentals, refreshments at meetups, speaker support, educational
              materials, and website maintenance. We&apos;re a 100% volunteer-run community!
            </p>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5, delay: 0.2}}
            className="bg-gray-50 p-6 rounded-lg"
          >
            <h3 className="text-xl font-bold mb-2 text-gray-900">Is my support tax-deductible?</h3>
            <p className="text-gray-700">
              ZurichJS is now registered as a non-profit organization under the Swiss JavaScript Group! However, contributions are not yet
              tax-deductible as we&apos;re still
              working on getting the necessary approvals. We&apos;re actively pursuing this to make it easier for you to support.
            </p>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5, delay: 0.3}}
            className="bg-gray-50 p-6 rounded-lg"
            data-faq-cancel
          >
            <h3 className="text-xl font-bold mb-2 text-gray-900">Can I cancel my monthly support?</h3>
            <p className="text-gray-700 mb-3">
              Yes, you can cancel your monthly support at any time. To cancel your monthly recurring support, you can{' '}
              <a
                href="mailto:hello@zurichjs.com?subject=Cancel Monthly Support&body=Hi! I'd like to cancel my monthly support. I'm emailing from the same email address I used to subscribe."
                className="text-amber-600 hover:underline font-medium"
              >
                click here
              </a>{' '}
              and email us at hello@zurichjs.com with the same email you subscribed with and we&apos;ll cancel it.
            </p>
            <p className="text-gray-700">
              <strong>No questions asked, no explanation needed</strong> - simple, easy, and we&apos;re grateful nonetheless! ❤️
            </p>
          </motion.div>

          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5, delay: 0.4}}
            className="bg-gray-50 p-6 rounded-lg"
          >
            <h3 className="text-xl font-bold mb-2 text-gray-900">My company wants to sponsor. Is this the right place?</h3>
            <p className="text-gray-700">
              For larger corporate sponsorships with benefits like logo placement and speaking opportunities, please check out our <Link
              href="/partnerships" className="text-amber-600 hover:underline">partnerships page</Link>. This support page is primarily for
              individual contributions.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* Final CTA */}
      <Section variant="black" padding="lg">
        <motion.div
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true}}
          transition={{duration: 0.5}}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Together, we grow the Zurich tech scene ✨</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Every bit of support helps us create a thriving community where developers grow, connect, and create amazing things together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => {
                setIsRecurring(true);
                document.getElementById('support-section')?.scrollIntoView({behavior: 'smooth'});
              }}
              className="text-white py-3 px-8 rounded-full bg-gray-900 hover:bg-gray-800 transition-all duration-300
                  transform hover:scale-105 hover:shadow-md font-medium flex items-center gap-3 justify-center"
            >
              <Heart size={20} className="text-red-500 mr-2"/>
              <span>Show some love!</span>
            </Button>
            <Link href="/tshirt">
              <Button
                variant="outline"
                className="py-3 px-8 rounded-full font-medium border-white text-white hover:bg-white hover:!text-black transition-all duration-300 flex items-center gap-2 justify-center"
              >
                <Shirt size={20} className="mr-2"/>
                <span>Get your ZurichJS T-shirt</span>
              </Button>
            </Link>
          </div>
        </motion.div>
      </Section>
    </Layout>
  );
}

export async function getStaticProps() {
  // Fetch upcoming events
  const upcomingEvents = await getUpcomingEvents();

  // Fetch past events to count the number of events hosted
  const pastEvents = await getPastEvents();
  const eventsHosted = pastEvents.length;

  // Sample recent supporters data
  // In production, you would fetch this from your database
  const recentSupporters: Array<{
    name: string;
    date: string;
    photo?: string;
    link?: string;
  }> = [
    {
      name: 'MountainAsh',
      date: 'March 21, 2025',
      photo: '/images/supporter/mountainash.png',
      link: 'https://mountainash.id.au/',
    },
    {
      name: 'Patrick Stillhart',
      date: 'March 25, 2025',
      photo: '/images/supporter/patrick-stillhart.png',
      link: 'https://stillh.art/',
    },
    {
      name: 'Mario Vasile',
      date: 'May 16, 2025',
      // photo: '/images/supporter/nadja.png',
      link: 'https://www.linkedin.com/in/mariovasile/',
    },
  ];

  return {
    props: {
      upcomingEvent: upcomingEvents[0],
      recentSupporters,
      eventsHosted, // Pass the number of events hosted as a prop
    },
  };
}
