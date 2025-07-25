import { motion } from 'framer-motion';
import { Heart, Star, Users, Code, Calendar, Twitter, Github, Linkedin, Globe, Mail, UserPlus, Shirt, CreditCard, RefreshCw, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getUpcomingEvents, getPastEvents } from '@/sanity/queries';

// Define our TypeScript interfaces (keeping for compatibility)
// interface SupportTier {
//   id: string;
//   name: string;
//   price: string;
//   priceId: string;
//   description: string;
//   type: 'one-time' | 'recurring' | 'custom';
//   highlighted?: boolean;
//   icon: React.ReactNode;
// }

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
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'monthly' | 'oneoff' | 'custom'>('monthly');
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState('');
  const [pricesData, setPricesData] = useState<SupportPricesData | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);

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
      } finally {
        setPricesLoading(false);
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
      if (selectedType === 'monthly' && monthlyOptions.length > 0) {
        setSelectedAmount(monthlyOptions[0].id);
      } else if (selectedType === 'oneoff' && oneOffOptions.length > 0) {
        setSelectedAmount(oneOffOptions[0].id);
      }
    }
  }, [pricesData, selectedType, selectedAmount, monthlyOptions, oneOffOptions]);

  // Function to handle Stripe checkout
  const handleSupportClick = async () => {
    if (selectedType === 'custom' && !customAmount) {
      alert('Please enter a custom amount');
      return;
    }

    if (selectedType === 'custom' && parseFloat(customAmount) < 5) {
      alert('Minimum amount is CHF 5');
      return;
    }

    if (selectedType !== 'custom' && !selectedAmount) {
      alert('Please select an amount');
      return;
    }

    setLoading(true);
    
    try {
      const requestBody: {
        priceId?: string;
        amount?: number;
      } = {};

      if (selectedType === 'custom') {
        requestBody.amount = parseFloat(customAmount);
      } else {
        requestBody.priceId = selectedAmount;
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
          type: selectedType,
          amount: selectedType === 'custom' ? customAmount : selectedAmount,
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

        {/* Hero Section */}
        <Section variant="gradient" padding="lg">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-4">
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
                className="flex flex-col basis-1/2 lg:basis-2/3"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                Show Some Love to ZurichJS ❤️
              </h1>
              <p className="text-xl mb-6 text-gray-900">
                Help us keep the community thriving and create better experiences for everyone!
              </p>
              <p className="text-lg mb-8 text-gray-900">
                Your love and support allows us to organize amazing meetups, invite world-class speakers, provide great food and drinks, 
                and create an inclusive space where JavaScript enthusiasts can learn, connect, and grow together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => {
                    setSelectedType('monthly');
                    document.getElementById('support-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-8 rounded-full 
                  shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 
                  flex items-center gap-2 md:text-lg justify-center"
                >
                  <Heart size={20} className="animate-pulse text-red-500" />
                  <span>Show Monthly Love</span>
                </Button>
                <Link href="/tshirt">
                  <Button
                    variant="outline"
                    className="py-3 px-8 rounded-full font-medium flex items-center gap-2 md:text-lg justify-center"
                  >
                    <Shirt size={20} />
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
                className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3 text-gray-900">Show Some Love ❤️</h2>
                <p className="text-xl text-gray-700">
                  Choose how you&apos;d like to support ZurichJS
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                {/* Support Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Support Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setSelectedType('monthly')}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        selectedType === 'monthly' 
                          ? 'border-js-dark bg-js-dark/10 text-gray-900' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <RefreshCw size={24} className="mx-auto mb-2 text-blue-500" />
                      <div className="font-medium">Monthly</div>
                      <div className="text-sm text-gray-500">Recurring</div>
                    </button>
                    <button
                      onClick={() => setSelectedType('oneoff')}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        selectedType === 'oneoff' 
                          ? 'border-js-dark bg-js-dark/10 text-gray-900' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Zap size={24} className="mx-auto mb-2 text-yellow-500" />
                      <div className="font-medium">One-time</div>
                      <div className="text-sm text-gray-500">Single payment</div>
                    </button>
                    <button
                      onClick={() => setSelectedType('custom')}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        selectedType === 'custom' 
                          ? 'border-js-dark bg-js-dark/10 text-gray-900' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard size={24} className="mx-auto mb-2 text-green-500" />
                      <div className="font-medium">Custom</div>
                      <div className="text-sm text-gray-500">Your amount</div>
                    </button>
                  </div>
                </div>

                {/* Amount Selection */}
                {pricesLoading ? (
                  <div className="mb-6">
                    <div className="h-4 bg-gray-200 rounded mb-3 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div className="mb-6">
                    {selectedType === 'monthly' && monthlyOptions.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Monthly Amount</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {monthlyOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setSelectedAmount(option.id)}
                              className={`p-3 rounded-lg border-2 transition-all text-center ${
                                selectedAmount === option.id
                                  ? 'border-js-dark bg-js-dark/10'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="font-semibold">{option.currency.toUpperCase()} {option.amount}</div>
                              <div className="text-sm text-gray-500">per month</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedType === 'oneoff' && oneOffOptions.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">One-time Amount</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {oneOffOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setSelectedAmount(option.id)}
                              className={`p-3 rounded-lg border-2 transition-all text-center ${
                                selectedAmount === option.id
                                  ? 'border-js-dark bg-js-dark/10'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="font-semibold">{option.currency.toUpperCase()} {option.amount}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedType === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Custom Amount</label>
                        <div className="mb-3">
                          <div className="flex gap-2 flex-wrap mb-3">
                            {[15, 25, 50, 100].map(amount => (
                              <button
                                key={amount}
                                onClick={() => setCustomAmount(String(amount))}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                  customAmount === String(amount)
                                    ? 'bg-js-dark text-black'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                CHF {amount}
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            placeholder="Enter amount in CHF (min. 5)"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js-dark"
                            min="5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Support Button */}
                <Button
                  onClick={handleSupportClick}
                  disabled={loading || pricesLoading || (selectedType !== 'custom' && !selectedAmount) || (selectedType === 'custom' && !customAmount)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 px-8 rounded-lg 
                  shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 
                  flex items-center gap-3 justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Heart size={20} className="text-red-500" />
                      <span>
                        {selectedType === 'monthly' ? 'Start Monthly Support' :
                         selectedType === 'oneoff' ? 'Make One-time Payment' :
                         'Support with Custom Amount'}
                      </span>
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
                className="bg-gradient-to-r from-gray-50 to-gray-100 p-8 rounded-lg"
            >
              <h3 className="text-2xl font-bold mb-6 text-center text-gray-900">More Ways to Support Our Community</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/tshirt">
                  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-js-dark">
                    <div className="text-center">
                      <Shirt className="mx-auto mb-3 text-gray-700" size={32} />
                      <h4 className="text-lg font-semibold mb-2 text-gray-900">Get Your ZurichJS T-Shirt</h4>
                      <p className="text-gray-600">Rep ZurichJS in style and support us at the same time!</p>
                    </div>
                  </div>
                </Link>
                <a href="mailto:hello@zurichjs.com">
                  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-js-dark">
                    <div className="text-center">
                      <Mail className="mx-auto mb-3 text-gray-700" size={32} />
                      <h4 className="text-lg font-semibold mb-2 text-gray-900">Give Us Feedback</h4>
                      <p className="text-gray-600">Share your ideas and help us improve our events!</p>
                    </div>
                  </div>
                </a>
                <Link href="/cfv">
                  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-js-dark">
                    <div className="text-center">
                      <UserPlus className="mx-auto mb-3 text-gray-700" size={32} />
                      <h4 className="text-lg font-semibold mb-2 text-gray-900">Volunteer With Us</h4>
                      <p className="text-gray-600">Join our team and help shape the future of ZurichJS!</p>
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
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Have questions about supporting ZurichJS? We&apos;ve got answers!
            </p>
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
                Currently, ZurichJS is not registered as a non-profit organization, so contributions are not tax-deductible. We&apos;re exploring this
                option for the future to make your support even more impactful.
              </p>
            </motion.div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: 0.3}}
                className="bg-gray-50 p-6 rounded-lg"
            >
              <h3 className="text-xl font-bold mb-2 text-gray-900">Can I cancel my monthly support?</h3>
              <p className="text-gray-700">
                Yes, you can cancel your monthly support at any time. Just email us at hello@zurichjs.com and we&apos;ll help you manage your
                subscription.
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
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Together, We&apos;re Building Something Beautiful ✨</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Every bit of love and support helps us create a thriving community where developers grow, connect, and create amazing things together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => {
                  setSelectedType('monthly');
                  document.getElementById('support-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-white py-3 px-8 rounded-full bg-gray-900 hover:bg-gray-800 transition-all duration-300 
                transform hover:scale-105 hover:shadow-md font-medium flex items-center gap-2 justify-center"
              >
                <Heart size={20} className="text-red-500" />
                <span>Show Some Love Today!</span>
              </Button>
              <Link href="/tshirt">
                <Button
                  variant="outline"
                  className="py-3 px-8 rounded-full font-medium border-white text-white hover:bg-white hover:text-black transition-all duration-300 flex items-center gap-2 justify-center"
                >
                  <Shirt size={20} />
                  <span>Get Your ZurichJS T-Shirt</span>
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
