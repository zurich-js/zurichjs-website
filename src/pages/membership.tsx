import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Head from 'next/head';
import { useState, useRef, FormEvent } from 'react';

import Layout from '@/components/layout/Layout';

type Tier = 'basic' | 'supporter';
type BillingCycle = 'quarterly' | 'yearly';

const tiers = {
  basic: {
    name: 'Basic Member',
    tagline: 'For curious Zurchers who want in.',
    quarterly: 50,
    yearly: 175,
    monthly: 14.5,
    benefits: [
      'Cancel anytime',
      'Stay informed and vote on small decisions',
    ],
    comparisons: [
      'simple bouquet of tulips',
      '250g coffee refill from MAME',
      'less than an AI tool subscription',
      'less than 3 Halb-tax trips in Zurich',
    ],
  },
  supporter: {
    name: 'Supporter',
    tagline: 'For tech-scene shapers',
    quarterly: 75,
    yearly: 250,
    monthly: 21,
    benefits: [
      'Exclusive events access',
      'Free or discounted workshops',
      'Voting rights',
    ],
    benefitsLabel: 'You also get',
    comparisons: [
      'still cheaper than Netflix 4k',
      'one takeaway lunch',
      '30% less than what we pay for meetup.com',
    ],
  },
} as const;

function PricingCard({
  tier,
  onSelect,
}: {
  tier: typeof tiers.basic | typeof tiers.supporter;
  onSelect: () => void;
}) {
  return (
    <div className="bg-gray-900 rounded-2xl p-8 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">{tier.name}</h2>
        <p className="text-sm text-gray-400 mb-6">{tier.tagline}</p>

        <div className="flex items-end gap-8 mb-8">
          <div>
            <span className="text-sm text-gray-400">CHF </span>
            <span className="text-5xl font-black text-white">{tier.quarterly}</span>
            <p className="text-xs text-gray-400 mt-1">Per quarter</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">CHF </span>
            <span className="text-5xl font-black text-white">{tier.yearly}</span>
            <p className="text-xs text-gray-400 mt-1">Per year</p>
          </div>
        </div>

        {'benefitsLabel' in tier && (
          <p className="text-sm text-gray-400 mb-2">{tier.benefitsLabel}</p>
        )}

        <ul className="space-y-2">
          {tier.benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm text-white">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onSelect}
        className="mt-8 w-full bg-white text-black font-bold py-4 px-8 rounded-2xl hover:bg-gray-100 transition-colors duration-200"
      >
        Select {tier.name}
      </button>
    </div>
  );
}

function Comparisons({
  monthly,
  comparisons,
}: {
  monthly: number;
  comparisons: readonly string[];
}) {
  return (
    <div>
      <p className="text-xl font-black text-gray-900 mb-2">
        That&apos;s CHF <span className="text-3xl">{monthly}</span>/month
      </p>
      <ul className="space-y-1">
        {comparisons.map((item) => (
          <li key={item} className="text-sm text-gray-700">
            ... {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MembershipPage() {
  const [selectedTier, setSelectedTier] = useState<Tier>('basic');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('quarterly');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const selectTier = (tier: Tier) => {
    setSelectedTier(tier);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentTier = tiers[selectedTier];
  const price = billingCycle === 'quarterly' ? currentTier.quarterly : currentTier.yearly;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/verein-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          tier: currentTier.name,
          billingCycle,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit');
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Membership - ZurichJS</title>
        <meta
          name="description"
          content="Join ZurichJS as a member. Support the Zurich JavaScript community as a Basic Member or Supporter."
        />
      </Head>

      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
              Become a Member
            </h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              ZurichJS is officially registered as a Swiss Verein (association).
              Join us and help shape the Zurich JavaScript community.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid md:grid-cols-2 gap-6 mb-8"
          >
            <PricingCard
              tier={tiers.basic}
              onSelect={() => selectTier('basic')}
            />
            <PricingCard
              tier={tiers.supporter}
              onSelect={() => selectTier('supporter')}
            />
          </motion.div>

          {/* Comparisons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6 mb-16"
          >
            <Comparisons
              monthly={tiers.basic.monthly}
              comparisons={tiers.basic.comparisons}
            />
            <Comparisons
              monthly={tiers.supporter.monthly}
              comparisons={tiers.supporter.comparisons}
            />
          </motion.div>

          {/* Inquiry Form */}
          <motion.div
            ref={formRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Sign up for membership
            </h2>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-green-800 font-semibold text-lg">
                  Inquiry sent!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  We&apos;ll get back to you soon with next steps.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setMessage('');
                  }}
                  className="mt-4 text-sm text-green-700 underline"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Tier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership tier
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['basic', 'supporter'] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-colors ${
                          selectedTier === tier
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {tiers[tier].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Billing Cycle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing cycle
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('quarterly')}
                      className={`py-3 px-4 rounded-xl border-2 text-sm transition-colors ${
                        billingCycle === 'quarterly'
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span className="font-semibold">Quarterly</span>
                      <span className="block text-xs mt-0.5 opacity-75">
                        CHF {currentTier.quarterly}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`py-3 px-4 rounded-xl border-2 text-sm transition-colors ${
                        billingCycle === 'yearly'
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span className="font-semibold">Yearly</span>
                      <span className="block text-xs mt-0.5 opacity-75">
                        CHF {currentTier.yearly}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">
                    Selected: <span className="font-semibold text-gray-900">{currentTier.name}</span>
                    {' '}&middot;{' '}
                    <span className="font-semibold text-gray-900">CHF {price}/{billingCycle === 'quarterly' ? 'quarter' : 'year'}</span>
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label
                    htmlFor="membership-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="membership-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors"
                    placeholder="Your name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="membership-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="membership-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="membership-message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Message <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="membership-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors resize-none"
                    placeholder="Anything else you'd like us to know..."
                  />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black text-white font-bold py-4 px-8 rounded-2xl hover:bg-black/90 transition-colors duration-200 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : `Join as ${currentTier.name} — CHF ${price}/${billingCycle === 'quarterly' ? 'quarter' : 'year'}`}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </Layout>
    </>
  );
}
