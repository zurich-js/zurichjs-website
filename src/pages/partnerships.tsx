import { motion } from 'framer-motion';
import { Building, Users, Gift, Coffee, Rocket, CheckCircle, MapPin, Home, Calendar, Wrench } from 'lucide-react';
import Image from 'next/image';
import { useState, ChangeEvent, FormEvent } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { getPartnersByType, getPartnersBySponsorshipTier, getRegularPartners } from '@/data';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getUpcomingEvents } from '@/sanity/queries';

// Define our TypeScript interfaces
interface PartnershipTier {
  name: string;
  price: string;
  benefits: string[];
  highlighted?: boolean;
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

interface PartnershipPageProps {
  upcomingEvent: {
    title: string;
    date: string;
    location: string;
    image: string;
  };
}

export default function Partnerships({ upcomingEvent }: PartnershipPageProps) {
  useReferrerTracking();
  const { track } = useEvents();

  // Form state
  const [formState, setFormState] = useState<FormState>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    message: '',
    tierInterest: 'gold',
    submitted: false,
    error: '',
    isSubmitting: false,
  });

  // Add state for venue-specific fields
  const [venueDetails, setVenueDetails] = useState({
    canProvideFoodDrinks: false,
    venueCapacity: '',
  });

  // Define partnership tiers
  const partnershipTiers: PartnershipTier[] = [
    {
      name: 'Custom Partner',
      price: 'Negotiable',
      benefits: [
        'Tailored packages to meet specific sponsor needs',
        'Exclusive sponsorship of events or workshops',
        'Extended speaking opportunities',
        'Customized branding options',
        'Additional social media campaigns',
        'Dedicated email promotions',
        'Direct access to our network of international web experts',
      ],
    },
    {
      name: 'Venue Host',
      price: 'Free (provide venue)',
      benefits: [
        'Logo displayed for specific event',
        'Special recognition at hosted event',
        'Company introduction at the hosted event',
        'Social media mention for the event',
        'Opportunity to distribute company swag',
      ],
    },
    {
      name: 'Community Partner',
      price: 'CHF 700 / year or CHF 70 / month',
      benefits: [
        'Logo display on our website',
        'Recognition at relevant events',
        'Social media mentions',
      ],
    },
    {
      name: 'Silver Partner',
      price: 'CHF 1,500 / year or CHF 150 / month',
      benefits: [
        'Logo display on website and event materials',
        'Recognition at all events',
        'Opportunities for company pitches at events',
        'Job postings through our social channels',
        'Social media mentions',
        'Inclusion in swag bags',
        'Input on event themes and speaker suggestions',
      ],
    },
    {
      name: 'Gold Partner',
      price: 'CHF 2,500 / year or CHF 250 / month',
      benefits: [
        'Prominent logo display on website and event materials',
        'Recognition at all events',
        'Opportunities to speak at meetups',
        'Company pitches during events',
        'Booth space at larger gatherings',
        'Job postings through our social channels',
        'Regular social media mentions',
        'Inclusion in swag bags',
        'Option to host online/physical workshops',
        'Priority in suggesting event themes and speakers',
        'Access to our international network of web experts',
      ],
      highlighted: true,
    },
  ];

  // Get partners by type (for regular partners section)
  const venuePartners = getPartnersByType('venue');
  const conferencePartners = getPartnersByType('conference');
  const communityPartners = getPartnersByType('community');
  const supportingPartners = getPartnersByType('supporting');

  // Get partners by sponsorship tier
  const goldPartners = getPartnersBySponsorshipTier('gold');
  const silverPartners = getPartnersBySponsorshipTier('silver');
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
          // Include venue details if the selected tier is 'venue'
          ...(formState.tierInterest === 'venue' && {
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

      <Section variant="gradient" padding="lg" className="mt-20">
            <div className="flex flex-col lg:flex-row items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0"
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                  Partner with ZurichJS! 🤝
                </h1>
                <p className="text-xl mb-6 text-gray-900">
                  Join forces with Zurich&apos;s most vibrant JavaScript community and connect with talented developers passionate about JS!
                </p>
                <p className="text-lg mb-8 text-gray-900">
                  Support our mission to nurture the JavaScript ecosystem in Zurich while gaining visibility for your brand among developers, tech leads, and decision-makers.
                </p>
                <Button
                  href="#partnership-tiers"
                  variant="primary"
                  size="lg"
                  className="bg-blue-700 hover:bg-blue-600 text-white"
                >
                  Explore Partnership Options 🚀
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:w-1/2"
              >
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <div className="relative h-64 w-full mb-4 rounded overflow-hidden">
                    <Image
                      src={upcomingEvent.image}
                      alt="ZurichJS Meetup"
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="text-xl font-bold">{upcomingEvent.title}</h3>
                      <div className="flex items-center mt-2 text-sm">
                        <MapPin size={14} className="mr-1" />
                        <span>{upcomingEvent.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">Our next meetup is coming up soon! 📅</p>
                    <p className="text-gray-700">Become a partner and get featured at our events!</p>
                  </div>
                </div>
              </motion.div>
            </div>
        </Section>

        {/* Why Partner With Us */}
        <Section variant="white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Why Partner With ZurichJS? ✨</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Partnering with ZurichJS gives you unique access to connect with the JavaScript community in Zurich.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <Users size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Connect with Top Talent</h3>
                <p className="text-gray-700">
                  Get direct access to a community of 375+ JavaScript developers, from juniors to tech leads and CTOs.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <Building size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Enhance Your Brand</h3>
                <p className="text-gray-700">
                  Boost your company&apos;s visibility in the tech community and position yourself as a JavaScript supporter.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <Rocket size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Share Knowledge</h3>
                <p className="text-gray-700">
                  Showcase your technical expertise with speaking slots and contribute to the growth of the JS ecosystem.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <Coffee size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Host Memorable Events</h3>
                <p className="text-gray-700">
                  Open your office space for meetups and showcase your company culture to the community.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <Gift size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Provide Swag & Prizes</h3>
                <p className="text-gray-700">
                  Get your branded merchandise into the hands of engaged developers through giveaways and contests.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <Users size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Recruit Passionate Devs</h3>
                <p className="text-gray-700">
                  Find your next team member from a pool of passionate JavaScript developers interested in growth.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Build Credibility</h3>
                <p className="text-gray-700">
                  Establish your company as a trusted voice in the JavaScript ecosystem through consistent community engagement.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <MapPin size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Local Impact</h3>
                <p className="text-gray-700">
                  Make a meaningful contribution to Zurich&apos;s tech scene and help foster innovation in the local community.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <div className="text-blue-700 mb-4">
                  <Rocket size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Stay Ahead</h3>
                <p className="text-gray-700">
                  Keep your team updated with the latest JavaScript trends and technologies through our community events.
                </p>
              </motion.div>
            </div>
        </Section>

        {/* Current Partners - Sponsors First */}
        {(goldPartners.length > 0 || silverPartners.length > 0) && (
          <Section variant="white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold mb-4 text-blue-700">Our Sponsors 💛</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                These incredible sponsors help us keep the JavaScript passion beating strong in our community. We couldn&apos;t be more grateful for their support that allows us to thrive and create amazing events together! 🙏
              </p>
            </motion.div>

            {/* Gold Partners Section */}
            {goldPartners.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">🥇</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">Gold Sponsors</h3>
                  </div>
                  <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                    These phenomenal partners keep the JavaScript passion burning bright in our hearts. Their exceptional support helps our community thrive beyond our wildest dreams! 🔥
                  </p>
                </motion.div>

                <div className="space-y-16">
                  {goldPartners.map((partner, index) => (
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
                               Visit {partner.name} →
                             </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Silver Partners Section */}
            {silverPartners.length > 0 && (
              <div className="mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-center mb-12"
                >
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-2xl">🥈</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">Silver Sponsors</h3>
                  </div>
                  <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                    These wonderful partners nurture our JavaScript passion and help our community flourish. We&apos;re deeply grateful for their commitment to keeping our love for JS alive! 💙
                  </p>
                </motion.div>

                <div className="space-y-12">
                  {silverPartners.map((partner, index) => (
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
                               Visit {partner.name} →
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
          <Section variant="gray">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold mb-4 text-gray-900">Our Community Partners 🤝</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                We collaborate with these amazing organizations to strengthen the tech ecosystem in Zurich and beyond.
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

        {/* Partnership Tiers */}
        <Section variant="white" id="partnership-tiers">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Partnership Options 🌟</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Choose the partnership level that fits your goals and budget!
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {partnershipTiers.map((tier, index) => {
                // Calculate savings for yearly vs monthly payments
                const hasBothPrices = tier.price.includes('/') && tier.price.includes('month');
                let yearlyPrice = '';
                let monthlyPrice = '';
                let yearlySavings = 0;

                if (hasBothPrices) {
                  const priceText = tier.price;
                  const yearMatch = priceText.match(/CHF\s+([\d,]+)/);
                  const monthMatch = priceText.match(/CHF\s+([\d,]+)\s+\/\s+month/);

                  if (yearMatch && monthMatch) {
                    const yearlyAmount = parseInt(yearMatch[1].replace(',', ''));
                    const monthlyAmount = parseInt(monthMatch[1].replace(',', ''));

                    yearlyPrice = `CHF ${yearMatch[1]}`;
                    monthlyPrice = `CHF ${monthMatch[1]}/month`;
                    yearlySavings = (monthlyAmount * 12) - yearlyAmount;
                  }
                } else {
                  yearlyPrice = tier.price;
                }

                return (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`bg-white rounded-lg shadow-lg overflow-hidden border flex flex-col h-full ${
                      tier.highlighted ? 'border-blue-700 transform -translate-y-2 scale-105' : 'border-gray-200'
                    }`}
                  >
                    <div className={`p-6 ${tier.highlighted ? 'bg-blue-700 text-white' : 'bg-gray-50'} relative`}>
                      <h3 className="text-xl font-bold mb-1">{tier.name}</h3>

                      {hasBothPrices ? (
                        <div className="mt-2">
                          <div className="text-2xl font-bold">{yearlyPrice}/year</div>
                          <div className="text-sm mt-2">
                            or {monthlyPrice}
                          </div>
                          {yearlySavings > 0 && (
                            <div className={`text-sm mt-2 font-medium ${tier.highlighted ? 'text-yellow-300' : 'text-green-600'}`}>
                              Save CHF {yearlySavings} with yearly payment!
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-2xl font-bold">{yearlyPrice}</p>
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-grow flex flex-col">
                      <ul className="space-y-3 mb-6 flex-grow">
                        {tier.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start">
                            <CheckCircle className="text-blue-700 mt-1 mr-2 flex-shrink-0" size={16} />
                            <span className="text-gray-700">{benefit}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto">
                        <Button
                          onClick={() => {
                            selectTier(tier.name.toLowerCase().split(' ')[0]);
                            // Additional tracking for tier card CTA click
                            track('partnership_tier_cta_click', {
                              name: tier.name,
                              price: tier.price
                            });
                          }}
                          variant={tier.highlighted ? 'primary' : 'outline'}
                          className={`w-full text-sm transition-colors ${
                            tier.highlighted 
                              ? 'bg-blue-700 text-white hover:bg-blue-600' 
                              : 'border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white'
                          }`}
                        >
                          Become a {tier.name.split(' ')[0]} Partner
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
        </Section>

        {/* Partnership Inquiry Form */}
        <Section variant="gray" id="inquiry-form">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              <h2 className="text-3xl font-bold mb-6 text-center text-gray-900">Let&apos;s Talk Partnership! 🎯</h2>

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
                    View Upcoming Events
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
                          <option value="gold">Gold Partner</option>
                          <option value="silver">Silver Partner</option>
                          <option value="community">Community Partner</option>
                          <option value="venue">Venue Host</option>
                          <option value="custom">Custom Partner</option>
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

                  {/* Venue-specific fields that only appear when "Venue Host" is selected */}
                  {formState.tierInterest === 'venue' && (
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
                        'Submit Partnership Inquiry 🚀'
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </motion.div>
        </Section>

        {/* Final CTA */}
        <Section variant="black" padding="lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Grow with ZurichJS? 🚀</h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto">
                Let&apos;s join forces to create an even more vibrant JavaScript community in Zurich!
              </p>
              <Button
                onClick={() => {
                  selectTier('gold');
                  // Additional tracking for final CTA click
                  track('partnership_final_cta_click');
                }}
                variant="primary"
                size="lg"
                className="bg-blue-700 text-white hover:bg-blue-600"
              >
                Become a Partner Today! 💛
              </Button>
            </motion.div>
        </Section>
    </Layout>
  );
}

export async function getStaticProps() {
  const upcomingEvents = await getUpcomingEvents();

  return {
    props: {
      upcomingEvent: upcomingEvents[0],
    },
  };
}
