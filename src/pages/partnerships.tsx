import Head from 'next/head';
import Image from 'next/image';
import { useState, ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Building, Users, Gift, Coffee, Rocket, CheckCircle, MapPin } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { getPartners } from '@/data';
import { getUpcomingEvents } from '@/sanity/queries';

// Define our TypeScript interfaces
interface Partner {
  id: string;
  name: string;
  logo: string;
  url: string;
  description?: string;
}

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
}

interface PartnershipPageProps {
  partners: Partner[];
  upcomingEvent: {
    title: string;
    date: string;
    location: string;
    image: string;
  };
}

export default function Partnerships({ partners, upcomingEvent }: PartnershipPageProps) {
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
  });

  // Define partnership tiers
  const partnershipTiers: PartnershipTier[] = [
    {
      name: 'Gold Partner',
      price: 'CHF 2,000 / year',
      benefits: [
        'Logo prominently displayed on website',
        'Recognition at all events',
        'Option to speak at one meetup per year',
        '5-minute company pitch at two events',
        'Booth space at larger events',
        'Job postings on our website and newsletter',
        'Social media shoutouts (6x per year)',
        'Access to our community Slack channel',
      ],
      highlighted: true,
    },
    {
      name: 'Silver Partner',
      price: 'CHF 1,000 / year',
      benefits: [
        'Logo displayed on website',
        'Recognition at all events',
        '5-minute company pitch at one event',
        'Job postings on our website',
        'Social media shoutouts (3x per year)',
        'Access to our community Slack channel',
      ],
    },
    {
      name: 'Community Partner',
      price: 'CHF 500 / year',
      benefits: [
        'Logo displayed on website',
        'Recognition at events',
        'Job postings on our website',
        'Social media shoutout (1x per year)',
        'Access to our community Slack channel',
      ],
    },
    {
      name: 'Venue Host',
      price: 'Free (provide venue)',
      benefits: [
        'Logo displayed for specific event',
        'Special recognition at hosted event',
        '5-minute company intro at the hosted event',
        'Social media mention for the event',
        'Opportunity to distribute company swag',
      ],
    },
  ];

  // Handle form input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Form validation
    if (!formState.companyName || !formState.contactName || !formState.email) {
      setFormState((prev) => ({ ...prev, error: 'Please fill out all required fields' }));
      return;
    }

    // Simulate successful submission
    setFormState((prev) => ({ ...prev, submitted: true, error: '' }));
    
    // In reality, you would submit to your API here
    // sendPartnershipInquiry(formState);
  };

  return (
    <Layout>
      <Head>
        <title>Partnership Opportunities | ZurichJS</title>
        <meta name="description" content="Support the ZurichJS community and connect with JavaScript developers in Zurich. Explore our partnership opportunities and help grow the tech community." />
      </Head>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-yellow-400 py-16">
          <div className="container mx-auto px-6">
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
          </div>
        </section>

        {/* Why Partner With Us */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
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
            </div>
          </div>
        </section>

        {/* Current Partners */}
        {partners.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold mb-3 text-blue-700">Our Amazing Partners 💛</h2>
                <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                  These awesome companies help make ZurichJS possible. Thank you for your support!
                </p>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-center justify-items-center">
                {partners.map((partner) => (
                  <motion.a
                    key={partner.id}
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full max-w-[180px] h-28 relative"
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      fill
                      className="object-contain"
                    />
                  </motion.a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Partnership Tiers */}
        <section id="partnership-tiers" className="py-16 bg-white">
          <div className="container mx-auto px-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {partnershipTiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`bg-white rounded-lg shadow-lg overflow-hidden border ${
                    tier.highlighted ? 'border-blue-700 transform -translate-y-2 scale-105' : 'border-gray-200'
                  }`}
                >
                  <div className={`p-6 ${tier.highlighted ? 'bg-blue-700 text-white' : 'bg-gray-50'}`}>
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    <p className="text-2xl font-bold">{tier.price}</p>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle className="text-blue-700 mt-1 mr-2 flex-shrink-0" size={16} />
                          <span className="text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <Button 
                        href="#inquiry-form" 
                        variant={tier.highlighted ? 'primary' : 'outline'}
                        className={`w-full ${
                          tier.highlighted 
                            ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                            : 'border-blue-700 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        Become a {tier.name.split(' ')[0]} Partner
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Partnership Inquiry Form */}
        <section id="inquiry-form" className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
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
                          <option value="custom">Custom Partnership</option>
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

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      variant="primary" 
                      size="lg"
                      className="bg-blue-700 hover:bg-blue-600 text-white"
                    >
                      Submit Partnership Inquiry 🚀
                    </Button>
                  </div>
                </motion.form>
              )}
            </motion.div>
          </div>
        </section>


        {/* Final CTA */}
        <section className="py-16 bg-yellow-400">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Ready to Grow with ZurichJS? 🚀</h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-900">
                Let&apos;s join forces to create an even more vibrant JavaScript community in Zurich!
              </p>
              <Button 
                href="#inquiry-form" 
                variant="primary" 
                size="lg" 
                className="bg-blue-700 text-white hover:bg-blue-600"
              >
                Become a Partner Today! 💛
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {

  const partners = getPartners();
  const upcomingEvent = await getUpcomingEvents();
  return {
    props: {
      partners,
      upcomingEvent: upcomingEvent[0],
    },
  };
}