import { motion } from 'framer-motion';
import { Users, CheckCircle, Home, Calendar, Wrench } from 'lucide-react';
import Image from 'next/image';
import { useState, ChangeEvent, FormEvent } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { getPartnersByType, getPartnersBySponsorshipTier, getRegularPartners } from '@/data';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getUpcomingEvents, getStats } from '@/sanity/queries';

// Define our TypeScript interfaces
interface PricingOption {
  label: string;
  amount: string;
  note?: string;
}

interface PartnershipTier {
  id: string;
  name: string;
  pricingOptions: PricingOption[];
  perks: string[];
  highlighted?: boolean;
  description?: string;
}

interface FormState {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  tierInterest: string;
  submitted: boolean;
  error: string;
  isSubmitting: boolean;
}

export default function Partnerships() {
  useReferrerTracking();
  const { track } = useEvents();

  // Form state
  const [formState, setFormState] = useState<FormState>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    message: '',
    tierInterest: 'champion',
    submitted: false,
    error: '',
    isSubmitting: false,
  });

  // Add state for venue-specific fields
  const [venueDetails, setVenueDetails] = useState({
    canProvideFoodDrinks: false,
    venueCapacity: '',
  });

  // Add state for expandable speakers section
  const [showAllSpeakers, setShowAllSpeakers] = useState(false);

  // Define partnership tiers
  const partnershipTiers: PartnershipTier[] = [
    {
      id: 'champion',
      name: 'Community Champion',
      pricingOptions: [
        { label: 'Yearly', amount: 'CHF 7\'500', note: '(2 months free)' },
        { label: 'Monthly', amount: 'CHF 750' },
        { label: 'One-time', amount: 'CHF 1\'000' },
      ],
      perks: [
        'XL logo on our site and partner list',
        'Branded photos of the event',
        'Sponsor slides or video at each meetup',
        'Personal shoutout and introduction at events',
        'Featured mention in event announcements',
        'Direct access to recruit from our talent pool',
        'Priority input on future meetup topics',
        'Co-host one exclusive workshop per year',
        'Swag distribution at events',
      ],
      highlighted: true,
    },
    {
      id: 'builder',
      name: 'Community Builder',
      pricingOptions: [
        { label: 'Yearly', amount: 'CHF 5\'000', note: '(2 months free)' },
        { label: 'Monthly', amount: 'CHF 500' },
        { label: 'One-time', amount: 'CHF 700' },
      ],
      perks: [
        'Large logo on our site and partner list',
        '2 sponsor slides in rotation at meetups',
        'Social media mentions and shoutouts',
        'Name-drop and recognition at events',
        'Access to post job opportunities',
        'Swag distribution at events',
      ],
    },
    {
      id: 'friend',
      name: 'Community Friend',
      pricingOptions: [
        { label: 'Yearly', amount: 'CHF 3\'000', note: '(2 months free)' },
        { label: 'Monthly', amount: 'CHF 300' },
        { label: 'One-time', amount: 'CHF 400' },
      ],
      perks: [
        'Medium logo on our site and partner list',
        '1 sponsor slide in rotation at meetups',
        'Name-drop and recognition at events',
        'Swag distribution at events',
      ],
    },
    {
      id: 'supporter',
      name: 'Community Supporter',
      pricingOptions: [
        { label: 'Yearly', amount: 'CHF 1\'500', note: '(2 months free)' },
        { label: 'Monthly', amount: 'CHF 150' },
        { label: 'One-time', amount: 'CHF 250' },
      ],
      perks: [
        'Small logo on our site and partner list',
        '1 sponsor slide in rotation at meetups',
        'Swag distribution at events',
      ],
    },
    {
      id: 'host',
      name: 'Community Host',
      pricingOptions: [
        { label: 'Venue Only', amount: 'Free', note: '(when hosting)' },
        { label: 'Venue + Speaker Travel', amount: 'CHF 1,500-2,500', note: '(becomes Community Friend)' },
      ],
      perks: [
        'Logo recognition for the event',
        'Company introduction at the hosted event',
        'Social media mentions',
        'Cover speaker travel costs and automatically qualify as Community Friend',
        'Food & beverage welcome but does not replace partnership tier',
      ],
      description: 'Host our meetup at your venue. Covering speaker travel (~CHF 1,500-2,500) automatically qualifies you as Community Friend sponsor.',
    },
  ];

  // Get partners by type (for regular partners section)
  const venuePartners = getPartnersByType('venue');
  const conferencePartners = getPartnersByType('conference');
  const communityPartners = getPartnersByType('community');
  const supportingPartners = getPartnersByType('supporting');

  // Get partners by sponsorship tier
  const championPartners = getPartnersBySponsorshipTier('champion');
  const builderPartners = getPartnersBySponsorshipTier('builder');
  const friendPartners = getPartnersBySponsorshipTier('friend');
  const supporterPartners = getPartnersBySponsorshipTier('supporter');
  const regularPartners = getRegularPartners();

  // Handle form input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  // Handle venue-specific checkbox changes
  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setVenueDetails((prev) => ({ ...prev, [name]: checked }));
  };

  // Handle venue capacity input
  const handleVenueCapacityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setVenueDetails((prev) => ({ ...prev, venueCapacity: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Form validation
    if (!formState.companyName || !formState.contactName || !formState.email) {
      setFormState((prev) => ({ ...prev, error: 'Please fill out all required fields' }));
      return;
    }

    try {
      // Set loading state
      setFormState((prev) => ({ ...prev, isSubmitting: true, error: '' }));

      // Track form submission attempt
      track('partnership_form_submit', {
        tierInterest: formState.tierInterest
      });

      // Send the form data to our API endpoint
      const response = await fetch('/api/partnership-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formState.companyName,
          contactName: formState.contactName,
          email: formState.email,
          phone: formState.phone,
          message: formState.message,
          tierInterest: formState.tierInterest,
          // Include venue details if the selected tier is 'host'
          ...(formState.tierInterest === 'host' && {
            venueDetails: {
              canProvideFoodDrinks: venueDetails.canProvideFoodDrinks,
              venueCapacity: venueDetails.venueCapacity
            }
          })
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update form state on success
        setFormState((prev) => ({ ...prev, submitted: true, error: '', isSubmitting: false }));

        // Track successful form submission
        track('partnership_form_success', {
          tierInterest: formState.tierInterest
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Failed to submit partnership inquiry:', error);
      setFormState((prev) => ({
        ...prev,
        error: 'There was an issue submitting your inquiry. Please try again.',
        isSubmitting: false
      }));

      // Track form submission error
      track('partnership_form_error', {
        tierInterest: formState.tierInterest,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Add a function to handle tier selection from buttons
  const selectTier = (tier: string) => {
    setFormState((prev) => ({ ...prev, tierInterest: tier }));

    // Track tier selection
    track('partnership_tier_selected', {
      tier: tier
    });

    // Scroll to the form
    const formElement = document.getElementById('inquiry-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Add tracking for partner logo clicks
  const handlePartnerClick = (partnerName: string, partnerTier?: string) => {
    track('partner_click_partnerships', {
      partnerName: partnerName,
      partnerTier: partnerTier || 'regular',
      page: 'partnerships'
    });
  };

  // Quick interest form state
  const [quickInterest, setQuickInterest] = useState({
    name: '',
    email: '',
    isSubmitting: false,
    submitted: false,
    error: ''
  });

  // Handle quick interest form submission
  const handleQuickInterest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!quickInterest.name || !quickInterest.email) {
      setQuickInterest(prev => ({ ...prev, error: 'Please fill out all fields' }));
      return;
    }

    try {
      setQuickInterest(prev => ({ ...prev, isSubmitting: true, error: '' }));

      // Track quick interest submission
      track('partnership_quick_interest_submit', {
        source: 'hero'
      });

      // Send notification to team
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '🚀 New Partnership Interest',
          message: `Quick interest from: ${quickInterest.name} (${quickInterest.email})`,
          type: 'other',
          priority: 'high',
          userData: {
            name: quickInterest.name,
            email: quickInterest.email,
            userId: '',
            isLoggedIn: false
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQuickInterest(prev => ({
          ...prev,
          submitted: true,
          isSubmitting: false
        }));

        // Track successful submission
        track('partnership_quick_interest_success', {
          source: 'hero'
        });
      } else {
        throw new Error(data.message || 'Failed to submit');
      }
    } catch (error) {
      console.error('Failed to submit quick interest:', error);
      setQuickInterest(prev => ({
        ...prev,
        error: 'There was an issue submitting your interest. Please try again.',
        isSubmitting: false
      }));

      // Track error
      track('partnership_quick_interest_error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <Layout>
      <SEO
        title="Partnership Opportunities | ZurichJS"
        description="Support the ZurichJS community and connect with JavaScript developers in Zurich. Explore our partnership opportunities and help grow the tech community."
        openGraph={{
          title: "Partner with ZurichJS",
          description: "Support the ZurichJS community and connect with JavaScript developers in Zurich.",
          image: "/api/og/partnerships",
          type: "website"
        }}
      />

      {/* Sticky CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          href="#inquiry-form"
          variant="primary"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
          onClick={() => track('sticky_cta_contact_click')}
        >
          Contact Us
        </Button>
      </motion.div>

      {/* Hero Section */}
      <Section variant="gradient" padding="lg" className="mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 text-gray-900 tracking-tight">
            Partner with ZurichJS
          </h1>
          <div className="space-y-6 text-lg md:text-xl text-gray-800 leading-relaxed mb-10">
            <p className="text-2xl font-semibold text-gray-900">
              900 members. Local and international speakers from companies like Google, AWS, Cloudflare, and more. Attendees and speakers have travelled in for the meetup from 7+ countries.
            </p>
            <p>
              In less than a year, ZurichJS went from a side project to a growing developer community—built on trust, quality content, and authentic connections.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="font-semibold text-gray-900">
                Partner with us to reach engaged developers who actually show up, connect with international tech talent, and build brand trust in the European JavaScript ecosystem.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-start">
            <Button
              href="#sponsorship-tiers"
              variant="primary"
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-white font-semibold"
              onClick={() => track('hero_become_sponsor_click')}
            >
              Become a Sponsor
            </Button>
            <Button
              href="#sponsorship-tiers"
              variant="outline"
              size="lg"
              className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-semibold"
              onClick={() => track('hero_host_event_click')}
            >
              Host an Event
            </Button>
            <Button
              href="mailto:hello@zurichjs.com?subject=ZurichJS Sponsorship Prospectus Request"
              variant="outline"
              size="lg"
              className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-semibold"
              onClick={() => track('hero_request_prospectus_click')}
            >
              Request the Prospectus
            </Button>
          </div>

          {/* Quick Interest Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-lg max-w-2xl"
          >
            {quickInterest.submitted ? (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto mb-3 text-green-600" size={48} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Thanks for your interest!</h3>
                <p className="text-gray-700">
                  We&apos;ll reach out soon to discuss within 24-48 hours.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Interest Form</h3>
                <p className="text-gray-700 mb-4 text-sm">
                  Want to chat? Drop your details and we&apos;ll reach out within 24-48 hours.
                </p>

                {quickInterest.error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                    {quickInterest.error}
                  </div>
                )}

                <form onSubmit={handleQuickInterest} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={quickInterest.name}
                    onChange={(e) => setQuickInterest(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={quickInterest.isSubmitting}
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={quickInterest.email}
                    onChange={(e) => setQuickInterest(prev => ({ ...prev, email: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={quickInterest.isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={quickInterest.isSubmitting}
                    className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors ${
                      quickInterest.isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {quickInterest.isSubmitting ? 'Submitting...' : 'Express Interest'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      </Section>

      {/* Stats Block - Social Proof */}
      <Section variant="white" padding="lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 tracking-tight">
              The Numbers Speak
            </h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Real engagement, real community, real reach.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              { number: '900', label: 'members across ZurichJS and Vue Zurich' },
              { number: '50-100', label: 'RSVPs per meetup, 70-80% confirmed participation' },
              { number: '15000+', label: 'website views in 6 months' },
              { number: '525+', label: 'LinkedIn followers' },
              { number: '35%', label: 'repeat attendees' },
              { number: '114', label: 'peak RSVP rate' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg shadow-sm border border-blue-100"
              >
                <div className="text-4xl font-black text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-700 leading-snug">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Growth Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg border-2 border-blue-200"
          >
            <p className="text-lg text-gray-800 leading-relaxed mb-4">
              <strong className="text-gray-900">International reach:</strong> Attendees and speakers have travelled in for the meetup from the Swiss French side 🇨🇭, Germany 🇩🇪, France 🇫🇷, Belgium 🇧🇪, Italy 🇮🇹, Greece 🇬🇷, and Albania 🇦🇱.
            </p>
            <p className="text-lg text-gray-800 leading-relaxed">
              <strong className="text-gray-900">Organic growth:</strong> Word of mouth and social channels drive our reach. We&apos;re now a recognized name within the wider European JavaScript network.
            </p>
          </motion.div>
        </div>
      </Section>

      {/* Why Partner with ZurichJS */}
      <Section variant="gray" padding="lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 tracking-tight">
              Why Partner with ZurichJS
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              We&apos;re not just another meetup. We&apos;re building a trusted platform that developers actually show up for.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-blue-600"
            >
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Quality Over Quantity</h3>
              <p className="text-gray-700 leading-relaxed">
                Conference-level content in an accessible meetup format. No shallow networking—just real technical depth and meaningful connections.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-green-600"
            >
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Real Momentum</h3>
              <p className="text-gray-700 leading-relaxed">
                From zero to 900 members in under a year. 70-80% show-up rate. People flying in from neighboring countries. This is a community that actually engages.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-sm border-t-4 border-purple-600"
            >
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Built on Trust</h3>
              <p className="text-gray-700 leading-relaxed">
                Authenticity and transparency are non-negotiable. We&apos;ve earned community trust by delivering consistently—and we protect it fiercely.
              </p>
            </motion.div>
          </div>

          {/* Core Team */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 pt-8 border-t border-gray-200"
          >
            <p className="text-sm font-semibold text-gray-600 mb-6">CORE TEAM</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Faris Aziz',
                  image: '/images/team/faris.jpg',
                  linkedin: 'https://linkedin.com/in/farisaziz12',
                  description: 'Co-founder · Staff Software Engineer, conference speaker'
                },
                {
                  name: 'Bogdan Mihai Ilie',
                  image: '/images/team/bogdan.jpg',
                  linkedin: 'https://linkedin.com/in/ilie-bogdan',
                  description: 'Co-founder · Frontend specialist, passionate about inclusive tech communities'
                },
                {
                  name: 'Nadja Hesselbjerg',
                  image: '/images/team/nadja.png',
                  linkedin: 'https://www.linkedin.com/in/nadja-r%C3%B8mer-hesselbjerg-47002a12b/',
                  description: 'Frontend developer with a flair for sleek, user-friendly experiences'
                }
              ].map((member, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{member.name}</h3>
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        aria-label={`${member.name}'s LinkedIn`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                        </svg>
                      </a>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">{member.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* What Your Partnership Supports */}
      <Section variant="white" padding="lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 tracking-tight">
              Where Your Investment Goes
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-4">
              ~100 hours of preparation per meetup. Your partnership funds the entire ecosystem.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 text-left max-w-3xl mx-auto rounded">
              <p className="text-gray-800 leading-relaxed">
                <strong className="text-gray-900">Transparency note:</strong> Food & drinks are appreciated, but they only cover one evening. Real costs include international speaker travel, software tools, content production, and building a brand developers trust.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: 'Speaker Travel',
                description: 'International flights, hotels, and logistics for quality speakers.',
                icon: '✈️'
              },
              {
                title: 'Production Tools',
                description: 'Software licenses, video editing, streaming, and design tools.',
                icon: '🛠️'
              },
              {
                title: 'Platform & Marketing',
                description: 'Meetup.com, social ads, email tools, domain hosting.',
                icon: '📢'
              },
              {
                title: 'Event Materials',
                description: 'Signage, name tags, branded materials, AV equipment.',
                icon: '🎬'
              },
              {
                title: 'Operations',
                description: 'Legal fees, insurance, accounting, admin costs.',
                icon: '⚙️'
              },
              {
                title: 'Content Creation',
                description: 'Photography, videography, editing, social content.',
                icon: '📸'
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Speaker Credibility */}
      <Section variant="gray" padding="lg">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 tracking-tight">
              Our Speakers
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Community-first with conference-level content. We feature local talent alongside industry leaders from companies like Google, AWS, Cloudflare, Node.js TSC, Smashing Magazine, and more.
            </p>
          </motion.div>

          {/* Speaker Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-6">
            {[
              { name: 'Matteo Collina', bio: 'Co-Founder/CTO @ Platformatic · Node.js TSC member · Fastify Lead Maintainer' },
              { name: 'Elian Van Cutsem', bio: 'Lead DevRel at React Bricks · CTO at Vulpo · Astro Maintainer · devs.gent meetup organiser' },
              { name: 'Ewa Gasperowicz', bio: 'Senior Developer Relations Engineer at Google' },
              { name: 'Harshil Agrawal', bio: 'Developer Educator @ Cloudflare' },
              { name: 'Indermohan Singh', bio: 'Senior Developer Advocate for Dynatrace Apps · Developer · Musician' },
              { name: 'Dani Coll', bio: 'Senior Developer Advocate @ Dynatrace' },
              { name: 'Vitaly Friedman', bio: 'Founder & Creative Lead at Smashing Magazine' },
              { name: 'Rahul Nanwani', bio: 'CEO @ ImageKit.io' },
              { name: 'Salih Güler', bio: 'Senior Developer Advocate, AWS' },
              { name: 'Wout Mertens', bio: 'Head of Product at StratoKit SA · Qwik Core Contributor' },
              { name: 'Nico Martin', bio: 'Frontend Developer and Google Developer Expert for Web Technologies and AI' },
              { name: 'Adam Berecz', bio: 'Founder of Vueform' },
              { name: 'Christian Wörz', bio: 'Expert Fullstack Engineer · Microsoft MVP (Web Dev & Dev Tools)' },
              { name: 'Savas Vedova', bio: 'Staff Frontend Engineer at GitLab · Founder at Stormkit' },
              { name: 'Samir Akarion', bio: 'Developer Advocate @ Gatling' },
              { name: 'Bert De Swaef', bio: 'Owner, Founder at Vulpo Digital Studio' },
              { name: 'Aleksej Dix', bio: 'Founder of Allyship.dev' },
              { name: 'Alex Suzuki', bio: 'Solopreneur · Author of STRICH (Barcode Scanning for Web Apps) · Father of two' },
              { name: 'Jan Hesters', bio: 'CTO @ ReactSquad & SocialKit' },
            ]
            .slice(0, showAllSpeakers ? undefined : 6)
            .map((speaker, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="border-b border-gray-200 pb-4"
              >
                <div className="font-bold text-gray-900">{speaker.name}</div>
                <div className="text-sm text-gray-700 mt-1">{speaker.bio}</div>
              </motion.div>
            ))}
          </div>

          {/* Show More/Less Button */}
          <div className="text-center mb-10">
            <button
              onClick={() => setShowAllSpeakers(!showAllSpeakers)}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold transition-all"
            >
              {showAllSpeakers ? 'Show Less Speakers' : 'Show All Speakers (19)'}
            </button>
          </div>

          {/* Speaker Quality Statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="bg-white p-8 rounded-lg border-2 border-gray-200 max-w-4xl mx-auto"
          >
            <p className="text-lg text-gray-800 leading-relaxed mb-4">
              We carefully balance <strong>community events</strong> to bring new talent to light and <strong>PRO events</strong> that bring in the best speakers at the meetup level. Every speaker is vetted, supported, and set up for success.
            </p>
            <p className="text-xl font-semibold text-gray-900">
              Your brand benefits from this same environment of quality and trust.
            </p>
          </motion.div>
        </div>
      </Section>

        {/* Sponsorship Tiers - 2x2 Grid + Host */}
        <Section variant="white" padding="lg" id="sponsorship-tiers">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12 text-center"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 tracking-tight">
                Choose Your Partnership Level
              </h2>
              <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto mb-6">
                Transparent pricing. Clear benefits. Flexible commitment options.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-600 max-w-3xl mx-auto text-left">
                <p className="text-gray-800 leading-relaxed">
                  <strong className="text-gray-900">💡 Pro tip:</strong> Not sure which tier fits? Use the quick form above or scroll to the bottom to start a conversation—we&apos;ll help you find the right match.
                </p>
              </div>
            </motion.div>

            {/* First 4 tiers in 2x2 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
              {partnershipTiers.slice(0, 4).map((tier, index) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className={`bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 flex flex-col h-full ${
                    tier.highlighted
                      ? 'border-yellow-400 ring-4 ring-yellow-100'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Tier Header */}
                  <div className={`p-6 ${tier.highlighted ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : 'bg-gray-50'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                      {tier.highlighted && (
                        <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                          POPULAR
                        </span>
                      )}
                    </div>

                    {/* Pricing Options */}
                    <div className="space-y-2">
                      {tier.pricingOptions.map((option, idx) => (
                        <div key={idx} className="flex items-baseline justify-between">
                          <span className="text-sm font-medium text-gray-600">{option.label}:</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">{option.amount}</span>
                            {option.note && (
                              <span className="text-xs text-gray-500">{option.note}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tier Perks */}
                  <div className="p-6 flex-grow flex flex-col">
                    <ul className="space-y-3 mb-6 flex-grow">
                      {tier.perks.map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle className={`${tier.highlighted ? 'text-yellow-500' : 'text-blue-500'} mt-0.5 flex-shrink-0`} size={18} />
                          <span className="text-gray-700 text-sm leading-relaxed">{perk}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => {
                        selectTier(tier.id);
                        track('sponsorship_tier_cta_click', {
                          name: tier.name,
                          tierId: tier.id
                        });
                      }}
                      variant={tier.highlighted ? 'primary' : 'outline'}
                      className={`w-full ${
                        tier.highlighted
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold'
                          : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      Become a Sponsor
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Host Tier - Full Width */}
            {partnershipTiers[4] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200 hover:border-blue-300"
              >
                <div className="md:flex">
                  {/* Left Side - Header and Pricing */}
                  <div className="md:w-1/3 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-b md:border-b-0 md:border-r border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Home className="text-blue-600" size={24} />
                      <h3 className="text-2xl font-bold text-gray-900">{partnershipTiers[4].name}</h3>
                    </div>

                    {partnershipTiers[4].description && (
                      <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                        {partnershipTiers[4].description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {partnershipTiers[4].pricingOptions.map((option, idx) => (
                        <div key={idx} className="flex items-baseline justify-between">
                          <span className="text-sm font-medium text-gray-600">{option.label}:</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-green-600">{option.amount}</span>
                            {option.note && (
                              <span className="text-xs text-gray-500">{option.note}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side - Perks and CTA */}
                  <div className="md:w-2/3 p-6 flex flex-col">
                    <ul className="space-y-3 mb-6 flex-grow">
                      {partnershipTiers[4].perks.map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                          <span className="text-gray-700 text-sm leading-relaxed">{perk}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => {
                        selectTier(partnershipTiers[4].id);
                        track('sponsorship_tier_cta_click', {
                          name: partnershipTiers[4].name,
                          tierId: partnershipTiers[4].id
                        });
                      }}
                      variant="outline"
                      className="w-full md:w-auto border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                    >
                      Contact Us About Hosting
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Section>

        {/* Current Partners - Sponsors First */}
        {(championPartners.length > 0 || supporterPartners.length > 0) && (
          <Section variant="gray">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 tracking-tight">Our Sponsors</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                These sponsors make ZurichJS possible. Join them in supporting our community.
              </p>
            </motion.div>

            {/* Champion Partners Section */}
            {championPartners.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">🥇</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">Community Champions</h3>
                  </div>
                </motion.div>

                <div className="space-y-16">
                  {championPartners.map((partner, index) => (
                    <motion.div
                      key={partner.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gradient-to-r from-yellow-50 to-amber-50 p-8 rounded-2xl border-2 border-yellow-200"
                    >
                      <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left">
                        <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
                          <motion.a
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              handlePartnerClick(partner.name, 'gold');
                              track('sponsor_logo_click', {
                                sponsorName: partner.name,
                                sponsorTier: 'gold',
                                sponsorUrl: partner.url
                              });
                            }}
                          >
                            <div className="w-56 h-28 sm:w-64 sm:h-32 lg:w-72 lg:h-36 relative bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                              <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </motion.a>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{partner.name}</h4>
                                                     {partner.blurb && (
                             <div className="text-gray-700 leading-relaxed text-base sm:text-lg lg:text-xl mb-6">
                               {partner.blurb.split('\n').map((line, index) => (
                                 <p key={index} className={index > 0 ? 'mt-2' : ''}>
                                   {line}
                                 </p>
                               ))}
                             </div>
                           )}
                          <div className="mt-4">
                                                         <Button
                               href={partner.url}
                               target="_blank"
                               rel="noopener noreferrer"
                               variant="primary"
                               className="bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto lg:w-auto"
                               onClick={() => {
                                 handlePartnerClick(partner.name, 'gold');
                                 track('sponsor_visit', {
                                   sponsorName: partner.name,
                                   sponsorTier: 'gold',
                                   sponsorUrl: partner.url
                                 });
                               }}
                             >
                               Discover {partner.name} →
                             </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Builder Partners Section */}
            {builderPartners.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-300 to-blue-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">🏗️</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">Community Builders</h3>
                  </div>
                </motion.div>

                <div className="space-y-12">
                  {builderPartners.map((partner, index) => (
                    <motion.div
                      key={partner.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gradient-to-r from-blue-50 to-sky-50 p-8 rounded-2xl border-2 border-blue-200"
                    >
                      <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left">
                        <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
                          <motion.a
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              handlePartnerClick(partner.name, 'builder');
                              track('sponsor_logo_click', {
                                sponsorName: partner.name,
                                sponsorTier: 'builder',
                                sponsorUrl: partner.url
                              });
                            }}
                          >
                            <div className="w-48 h-24 sm:w-56 sm:h-28 lg:w-64 lg:h-32 relative bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                              <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </motion.a>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{partner.name}</h4>
                                                     {partner.blurb && (
                             <div className="text-gray-700 leading-relaxed text-base sm:text-lg lg:text-xl mb-6">
                               {partner.blurb.split('\n').map((line, index) => (
                                 <p key={index} className={index > 0 ? 'mt-2' : ''}>
                                   {line}
                                 </p>
                               ))}
                             </div>
                           )}
                          <div className="mt-4">
                                                         <Button
                               href={partner.url}
                               target="_blank"
                               rel="noopener noreferrer"
                               variant="primary"
                               className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto lg:w-auto"
                               onClick={() => {
                                 handlePartnerClick(partner.name, 'builder');
                                 track('sponsor_visit', {
                                   sponsorName: partner.name,
                                   sponsorTier: 'builder',
                                   sponsorUrl: partner.url
                                 });
                               }}
                             >
                               Discover {partner.name} →
                             </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Friend Partners Section */}
            {friendPartners.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-300 to-green-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">🤝</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">Community Friends</h3>
                  </div>
                </motion.div>

                <div className="space-y-12">
                  {friendPartners.map((partner, index) => (
                    <motion.div
                      key={partner.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200"
                    >
                      <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                        <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-6">
                          <motion.a
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              handlePartnerClick(partner.name, 'friend');
                              track('sponsor_logo_click', {
                                sponsorName: partner.name,
                                sponsorTier: 'friend',
                                sponsorUrl: partner.url
                              });
                            }}
                          >
                            <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 relative bg-white p-3 md:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </motion.a>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3">{partner.name}</h4>
                                                     {partner.blurb && (
                             <div className="text-gray-700 leading-relaxed text-sm sm:text-base md:text-lg mb-4">
                               {partner.blurb.split('\n').map((line, index) => (
                                 <p key={index} className={index > 0 ? 'mt-2' : ''}>
                                   {line}
                                 </p>
                               ))}
                             </div>
                           )}
                          <div className="mt-4">
                                                         <Button
                               href={partner.url}
                               target="_blank"
                               rel="noopener noreferrer"
                               variant="outline"
                               className="border-green-400 text-green-700 hover:bg-green-700 hover:text-white w-full sm:w-auto"
                               onClick={() => {
                                 handlePartnerClick(partner.name, 'friend');
                                 track('sponsor_visit', {
                                   sponsorName: partner.name,
                                   sponsorTier: 'friend',
                                   sponsorUrl: partner.url
                                 });
                               }}
                             >
                               Discover {partner.name} →
                             </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Supporter Partners Section */}
            {supporterPartners.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">🥈</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">Community Supporters</h3>
                  </div>
                </motion.div>

                <div className="space-y-12">
                  {supporterPartners.map((partner, index) => (
                    <motion.div
                      key={partner.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border-2 border-gray-200"
                    >
                      <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left">
                        <div className="flex-shrink-0 mb-6 md:mb-0 md:mr-6">
                          <motion.a
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              handlePartnerClick(partner.name, 'silver');
                              track('sponsor_logo_click', {
                                sponsorName: partner.name,
                                sponsorTier: 'silver',
                                sponsorUrl: partner.url
                              });
                            }}
                          >
                            <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 relative bg-white p-3 md:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <Image
                                src={partner.logo}
                                alt={partner.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          </motion.a>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3">{partner.name}</h4>
                                                     {partner.blurb && (
                             <div className="text-gray-700 leading-relaxed text-sm sm:text-base md:text-lg mb-4">
                               {partner.blurb.split('\n').map((line, index) => (
                                 <p key={index} className={index > 0 ? 'mt-2' : ''}>
                                   {line}
                                 </p>
                               ))}
                             </div>
                           )}
                          <div className="mt-4">
                                                         <Button
                               href={partner.url}
                               target="_blank"
                               rel="noopener noreferrer"
                               variant="outline"
                               className="border-gray-400 text-gray-700 hover:bg-gray-700 hover:text-white w-full sm:w-auto"
                               onClick={() => {
                                 handlePartnerClick(partner.name, 'silver');
                                 track('sponsor_visit', {
                                   sponsorName: partner.name,
                                   sponsorTier: 'silver',
                                   sponsorUrl: partner.url
                                 });
                               }}
                             >
                               Discover {partner.name} →
                             </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Regular Partners */}
        {regularPartners.length > 0 && (
          <Section variant="white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 tracking-tight">Community Partners</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Collaborating to strengthen the European tech ecosystem.
              </p>
            </motion.div>

            {/* Partnership Types Navigation */}
            <div className="mb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="bg-blue-50 p-6 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors flex flex-col h-full"
                >
                  <div className="flex items-center mb-4">
                    <Home className="text-blue-700 mr-3" size={24} />
                    <h3 className="text-xl font-bold text-gray-900">Venue Partners</h3>
                  </div>
                  <p className="text-gray-700 mb-4 flex-grow">
                    Companies that provide their spaces for our meetups
                  </p>
                  <div className="text-sm text-blue-700 font-medium mt-auto">
                    {venuePartners.filter(p => !p.sponsorshipTier).length} Partners
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-purple-50 p-6 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors flex flex-col h-full"
                >
                  <div className="flex items-center mb-4">
                    <Calendar className="text-purple-700 mr-3" size={24} />
                    <h3 className="text-xl font-bold text-gray-900">Conference Partners</h3>
                  </div>
                  <p className="text-gray-700 mb-4 flex-grow">
                    Conferences offering exclusive discounts to our members
                  </p>
                  <div className="text-sm text-purple-700 font-medium mt-auto">
                    {conferencePartners.filter(p => !p.sponsorshipTier).length} Partners
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-green-50 p-6 rounded-lg border border-green-100 hover:border-green-200 transition-colors flex flex-col h-full"
                >
                  <div className="flex items-center mb-4">
                    <Users className="text-green-700 mr-3" size={24} />
                    <h3 className="text-xl font-bold text-gray-900">Community Partners</h3>
                  </div>
                  <p className="text-gray-700 mb-4 flex-grow">
                    Fellow tech communities we collaborate with
                  </p>
                  <div className="text-sm text-green-700 font-medium mt-auto">
                    {communityPartners.filter(p => !p.sponsorshipTier).length} Partners
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-orange-50 p-6 rounded-lg border border-orange-100 hover:border-orange-200 transition-colors flex flex-col h-full"
                >
                  <div className="flex items-center mb-4">
                    <Wrench className="text-orange-700 mr-3" size={24} />
                    <h3 className="text-xl font-bold text-gray-900">Supporting Partners</h3>
                  </div>
                  <p className="text-gray-700 mb-4 flex-grow">
                    Companies providing resources and tools
                  </p>
                  <div className="text-sm text-orange-700 font-medium mt-auto">
                    {supportingPartners.filter(p => !p.sponsorshipTier).length} Partners
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Venue Partners Section */}
            {venuePartners.filter(p => !p.sponsorshipTier).length > 0 && (
              <div className="mb-20">
                <div className="flex items-center mb-8">
                  <Home className="text-blue-700 mr-3" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Venue Partners</h3>
                </div>
                <p className="text-gray-700 mb-8 max-w-3xl">
                  Our venue partners generously provide their spaces for ZurichJS meetups, helping us create memorable events for our community.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 lg:gap-10 items-center justify-items-center">
                  {venuePartners.filter(p => !p.sponsorshipTier).map((partner) => (
                    <motion.a
                      key={partner.id}
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full max-w-[140px] sm:max-w-[180px] lg:max-w-[200px] h-24 sm:h-28 lg:h-32 relative group bg-white p-3 sm:p-4 lg:p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      whileHover={{
                        y: -5,
                        transition: { duration: 0.2 }
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      onClick={() => handlePartnerClick(partner.name, 'venue')}
                    >
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        fill
                        className="object-contain transition-all duration-300 filter grayscale group-hover:grayscale-0"
                      />
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {/* Conference Partners Section */}
            {conferencePartners.filter(p => !p.sponsorshipTier).length > 0 && (
              <div className="mb-20">
                <div className="flex items-center mb-8">
                  <Calendar className="text-purple-700 mr-3" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Conference Partners</h3>
                </div>
                <p className="text-gray-700 mb-8 max-w-3xl">
                  Our conference partners offer exclusive discounts and special access to ZurichJS members for their events.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 lg:gap-10 items-center justify-items-center">
                  {conferencePartners.filter(p => !p.sponsorshipTier).map((partner) => (
                    <motion.a
                      key={partner.id}
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full max-w-[140px] sm:max-w-[180px] lg:max-w-[200px] h-24 sm:h-28 lg:h-32 relative group bg-white p-3 sm:p-4 lg:p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      whileHover={{
                        y: -5,
                        transition: { duration: 0.2 }
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      onClick={() => handlePartnerClick(partner.name, 'conference')}
                    >
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        fill
                        className="object-contain transition-all duration-300 filter grayscale group-hover:grayscale-0"
                      />
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {/* Community Partners Section */}
            {communityPartners.filter(p => !p.sponsorshipTier).length > 0 && (
              <div className="mb-20">
                <div className="flex items-center mb-8">
                  <Users className="text-green-700 mr-3" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Community Partners</h3>
                </div>
                <p className="text-gray-700 mb-8 max-w-3xl">
                  Our community partners are fellow tech communities that we collaborate with to strengthen the JavaScript ecosystem in our region.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 lg:gap-10 items-center justify-items-center">
                  {communityPartners.filter(p => !p.sponsorshipTier).map((partner) => (
                    <motion.a
                      key={partner.id}
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full max-w-[140px] sm:max-w-[180px] lg:max-w-[200px] h-24 sm:h-28 lg:h-32 relative group bg-white p-3 sm:p-4 lg:p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      whileHover={{
                        y: -5,
                        transition: { duration: 0.2 }
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      onClick={() => handlePartnerClick(partner.name, 'community')}
                    >
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        fill
                        className="object-contain transition-all duration-300 filter grayscale group-hover:grayscale-0"
                      />
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {/* Supporting Partners Section */}
            {supportingPartners.filter(p => !p.sponsorshipTier).length > 0 && (
              <div className="mb-20">
                <div className="flex items-center mb-8">
                  <Wrench className="text-orange-700 mr-3" size={28} />
                  <h3 className="text-2xl font-bold text-gray-900">Supporting Partners</h3>
                </div>
                <p className="text-gray-700 mb-8 max-w-3xl">
                  Our supporting partners provide valuable resources, tools, and services that help us run ZurichJS more effectively.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 lg:gap-10 items-center justify-items-center">
                  {supportingPartners.filter(p => !p.sponsorshipTier).map((partner) => (
                    <motion.a
                      key={partner.id}
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full max-w-[140px] sm:max-w-[180px] lg:max-w-[200px] h-24 sm:h-28 lg:h-32 relative group bg-white p-3 sm:p-4 lg:p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      whileHover={{
                        y: -5,
                        transition: { duration: 0.2 }
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      onClick={() => handlePartnerClick(partner.name, 'supporting')}
                    >
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        fill
                        className="object-contain transition-all duration-300 filter grayscale group-hover:grayscale-0"
                      />
                    </motion.a>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Previous Partners and Sponsors - Auto-scrolling Section */}
        <Section variant="gray" padding="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Previous Partners and Sponsors</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We&apos;re grateful to all the companies and organizations that have supported ZurichJS over the years.
            </p>
          </motion.div>

          {/* Auto-scrolling logos container */}
          <div className="relative overflow-hidden">
            {/* Gradient overlays for smooth fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10" />

            {/* Scrolling container */}
            <div className="flex animate-scroll">
              {/* First set of logos - only showing previous partners/sponsors not currently displayed */}
              {[
                { name: 'Voxxed Days Zurich', logo: '/images/partners/voxxed-days-zurich.png' },
                { name: 'Stripe', logo: '/images/partners/stripe.png' },
                { name: 'DotJS', logo: '/images/partners/dotjs.png' },
                { name: 'React Paris', logo: '/images/partners/react-paris.png' },
                { name: 'Dynatrace', logo: '/images/partners/dynatrace.png' },
              ].map((partner, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 w-40 h-24 mx-6 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={160}
                    height={96}
                    className="object-contain max-w-full max-h-full"
                  />
                </div>
              ))}

              {/* Duplicate set for seamless loop */}
              {[
                { name: 'Voxxed Days Zurich', logo: '/images/partners/voxxed-days-zurich.png' },
                { name: 'Stripe', logo: '/images/partners/stripe.png' },
                { name: 'DotJS', logo: '/images/partners/dotjs.png' },
                { name: 'React Paris', logo: '/images/partners/react-paris.png' },
                { name: 'Dynatrace', logo: '/images/partners/dynatrace.png' },
              ].map((partner, index) => (
                <div
                  key={`second-${index}`}
                  className="flex-shrink-0 w-40 h-24 mx-6 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={160}
                    height={96}
                    className="object-contain max-w-full max-h-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Add CSS for the animation */}
          <style jsx>{`
            @keyframes scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-50%);
              }
            }

            .animate-scroll {
              animation: scroll 40s linear infinite;
            }

            .animate-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
        </Section>

        {/* Transition CTA - Before Form */}
        <Section variant="gradient" padding="lg" className="bg-gradient-to-br from-blue-600 to-indigo-700">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 tracking-tight">
              Ready to Get Started?
            </h2>
            <p className="text-xl md:text-2xl text-gray-900 leading-relaxed mb-8">
              Join 900+ developers, local and international speakers from companies like Google, AWS, and more, and a community that actually shows up. Partner with ZurichJS today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                href="#inquiry-form"
                variant="primary"
                size="lg"
                onClick={() => track('mid_page_cta_form_click')}
              >
                Start a Conversation
              </Button>
              <Button
                href="#sponsorship-tiers"
                variant="outline"
                size="lg"
                className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-semibold text-lg"
                onClick={() => track('mid_page_cta_tiers_click')}
              >
                View Tiers Again
              </Button>
            </div>
          </motion.div>
        </Section>

        {/* Partnership Inquiry Form */}
        <Section variant="white" id="inquiry-form">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 tracking-tight">Let&apos;s Talk Partnership</h2>
              <p className="text-xl text-gray-800 leading-relaxed mb-4 max-w-2xl">
                Interested in reaching 900+ engaged developers? We&apos;ll respond within 24-48 hours to discuss how we can help you achieve your goals.
              </p>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl">
                Fill out the form below or use the quick form at the top for an even faster response.
              </p>

              {formState.submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-lg text-center"
                >
                  <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-bold mb-2 text-gray-900">Thanks for reaching out!</h3>
                  <p className="mb-6 text-gray-700">
                    We&apos;ve received your partnership inquiry and we&apos;re super excited about the possibility of working together!
                    Our team will reach out to you within 48 hours to discuss next steps.
                  </p>
                  <p className="mb-6 text-gray-700">
                    In the meantime, feel free to check out our upcoming events and join our community!
                  </p>
                  <Button
                    href="/events"
                    variant="secondary"
                  >
                    Explore Our Community Events
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  onSubmit={handleSubmit}
                  className="bg-white p-8 rounded-lg shadow-md"
                >
                  {formState.error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md">
                      {formState.error}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Company Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="companyName" className="block text-gray-700 mb-2">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          id="companyName"
                          name="companyName"
                          value={formState.companyName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="tierInterest" className="block text-gray-700 mb-2">
                          Partnership Tier Interest
                        </label>
                        <select
                          id="tierInterest"
                          name="tierInterest"
                          value={formState.tierInterest}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="champion">Community Champion</option>
                          <option value="builder">Community Builder</option>
                          <option value="friend">Community Friend</option>
                          <option value="supporter">Community Supporter</option>
                          <option value="host">Community Host</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="contactName" className="block text-gray-700 mb-2">
                          Contact Name *
                        </label>
                        <input
                          type="text"
                          id="contactName"
                          name="contactName"
                          value={formState.contactName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formState.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formState.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="message" className="block text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formState.message}
                      onChange={handleInputChange}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Tell us a bit about your company and what you're hoping to achieve through a partnership with ZurichJS..."
                    />
                  </div>

                  {/* Venue-specific fields that only appear when "Community Host" is selected */}
                  {formState.tierInterest === 'host' && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-100">
                      <h3 className="text-xl font-bold mb-4 text-gray-900">Venue Information</h3>

                      <div className="mb-4">
                        <label className="flex items-center text-gray-700">
                          <input
                            type="checkbox"
                            name="canProvideFoodDrinks"
                            checked={venueDetails.canProvideFoodDrinks}
                            onChange={handleCheckboxChange}
                            className="mr-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span>Can you provide food/drinks for the event?</span>
                        </label>
                      </div>

                      <div>
                        <label htmlFor="venueCapacity" className="block text-gray-700 mb-2">
                          What is the capacity of your venue?
                        </label>
                        <input
                          type="text"
                          id="venueCapacity"
                          name="venueCapacity"
                          value={venueDetails.venueCapacity}
                          onChange={handleVenueCapacityChange}
                          placeholder="e.g., 50 people"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={formState.isSubmitting}
                      className={`bg-blue-700 hover:bg-blue-600 text-white ${
                        formState.isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {formState.isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        'Send Inquiry'
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </motion.div>
        </Section>

        {/* Final CTA */}
        <Section variant="gradient" padding="lg" className="bg-gradient-to-br from-gray-900 to-gray-800">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 tracking-tight">
                Your Brand. Our Community. Real Results.
              </h2>
              <p className="text-xl md:text-2xl text-gray-900 leading-relaxed mb-8">
                Partner with a community built on trust, quality, and authenticity. When you work with us, you&apos;re not just buying exposure—you&apos;re backing a platform that developers actually engage with.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  href="#inquiry-form"
                  variant="primary"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg shadow-xl"
                  onClick={() => track('partnership_final_cta_form_click')}
                >
                  Start the Conversation
                </Button>
                <Button
                  href="mailto:hello@zurichjs.com?subject=Partnership Inquiry"
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-semibold text-lg"
                  onClick={() => track('partnership_final_cta_email_click')}
                >
                  Email Us Directly
                </Button>
              </div>
            </motion.div>
        </Section>
    </Layout>
  );
}

export async function getStaticProps() {
  const upcomingEvents = await getUpcomingEvents();
  const stats = await getStats();

  return {
    props: {
      upcomingEvent: upcomingEvents[0],
      stats,
    },
  };
}
