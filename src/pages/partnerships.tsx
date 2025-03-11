import Head from 'next/head';
import Image from 'next/image';
import { useState, ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Building, Users, Gift, Coffee, Rocket, CheckCircle, MapPin } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { trackPartnershipInquiry } from '@/lib/analytics';

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
    
    // Track the partnership inquiry in analytics
    if (typeof trackPartnershipInquiry === 'function') {
      trackPartnershipInquiry(formState.companyName);
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
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  Partner with ZurichJS! 🤝
                </h1>
                <p className="text-xl mb-6">
                  Join forces with Zurich&apos;s most vibrant JavaScript community and connect with talented developers passionate about JS!
                </p>
                <p className="text-lg mb-8">
                  Support our mission to nurture the JavaScript ecosystem in Zurich while gaining visibility for your brand among developers, tech leads, and decision-makers.
                </p>
                <Button href="#partnership-tiers" variant="primary" size="lg">
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
                  <div className="relative h-56 w-full mb-4 rounded overflow-hidden">
                    <Image
                      src={upcomingEvent.image}
                      alt="ZurichJS Meetup"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="text-xl font-bold">{upcomingEvent.title}</h3>
                      <div className="flex items-center mt-2 text-sm">
                        <MapPin size={14} className="mr-1" />
                        <span>{upcomingEvent.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">Our next meetup is coming up soon! 📅</p>
                    <p className="text-gray-600">Become a partner and get featured at our events!</p>
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
              <h2 className="text-3xl font-bold mb-3">Why Partner With ZurichJS? ✨</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
                <div className="text-yellow-500 mb-4">
                  <Users size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2">Connect with Top Talent</h3>
                <p className="text-gray-600">
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
                <div className="text-yellow-500 mb-4">
                  <Building size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2">Enhance Your Brand</h3>
                <p className="text-gray-600">
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
                <div className="text-yellow-500 mb-4">
                  <Rocket size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2">Share Knowledge</h3>
                <p className="text-gray-600">
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
                <div className="text-yellow-500 mb-4">
                  <Coffee size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2">Host Memorable Events</h3>
                <p className="text-gray-600">
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
                <div className="text-yellow-500 mb-4">
                  <Gift size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2">Provide Swag & Prizes</h3>
                <p className="text-gray-600">
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
                <div className="text-yellow-500 mb-4">
                  <Users size={36} />
                </div>
                <h3 className="text-xl font-bold mb-2">Recruit Passionate Devs</h3>
                <p className="text-gray-600">
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
                <h2 className="text-3xl font-bold mb-3">Our Amazing Partners 💛</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
              <h2 className="text-3xl font-bold mb-3">Partnership Options 🌟</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
                    tier.highlighted ? 'border-yellow-400 transform -translate-y-2 scale-105' : 'border-gray-200'
                  }`}
                >
                  <div className={`p-6 ${tier.highlighted ? 'bg-yellow-400' : 'bg-gray-50'}`}>
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    <p className="text-2xl font-bold">{tier.price}</p>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle className="text-yellow-500 mt-1 mr-2 flex-shrink-0" size={16} />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <Button 
                        href="#inquiry-form" 
                        variant={tier.highlighted ? 'primary' : 'outline'}
                        className="w-full"
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
              <h2 className="text-3xl font-bold mb-6 text-center">Let&apos;s Talk Partnership! 🎯</h2>

              {formState.submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-lg text-center"
                >
                  <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-bold mb-2">Thanks for reaching out!</h3>
                  <p className="mb-6">
                    We&apos;ve received your partnership inquiry and we&apos;re super excited about the possibility of working together! 
                    Our team will reach out to you within 48 hours to discuss next steps.
                  </p>
                  <p className="mb-6">
                    In the meantime, feel free to check out our upcoming events and join our community!
                  </p>
                  <Button href="/events" variant="secondary">
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
                    <h3 className="text-xl font-bold mb-4">Company Information</h3>
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                    <h3 className="text-xl font-bold mb-4">Contact Information</h3>
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Tell us a bit about your company and what you're hoping to achieve through a partnership with ZurichJS..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="lg">
                      Submit Partnership Inquiry 🚀
                    </Button>
                  </div>
                </motion.form>
              )}
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3">What Our Partners Say 💬</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Hear from companies that have partnered with ZurichJS!
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-50 p-6 rounded-lg shadow-md"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 relative mr-4">
                    <Image
                      src="/images/partners/ginetta.svg"
                      alt="Ginetta"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">Sarah Schmidt</h3>
                    <p className="text-sm text-gray-500">HR Manager, Ginetta</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  &quot;Hosting ZurichJS meetups has been fantastic for our employer branding! We&apos;ve connected with amazing talent and even hired two developers who first visited our office during a meetup. The community is engaged and passionate!&quot;
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-50 p-6 rounded-lg shadow-md"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 relative mr-4">
                    <Image
                      src="/images/partners/smallpdf.svg"
                      alt="Smallpdf"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">Michael Weber</h3>
                    <p className="text-sm text-gray-500">CTO, Smallpdf</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  &quot;Being a Gold Partner for ZurichJS has significantly increased our visibility in the tech community. Our engineers love sharing knowledge through talks, and it&apos;s helped us position ourselves as a tech-forward company in Zurich.&quot;
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-50 p-6 rounded-lg shadow-md"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 relative mr-4">
                    <Image
                      src="/images/partners/google.svg"
                      alt="Google"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">Anna Müller</h3>
                    <p className="text-sm text-gray-500">Developer Relations, Google</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  &quot;ZurichJS has been an incredible channel for us to connect with the developer community. The passion and energy at these meetups is contagious! We love supporting events that bring together such a vibrant tech ecosystem.&quot;
                </p>
              </motion.div>
            </div>
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
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Grow with ZurichJS? 🚀</h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto">
                Let&apos;s join forces to create an even more vibrant JavaScript community in Zurich!
              </p>
              <Button href="#inquiry-form" variant="primary" size="lg" className="bg-black text-yellow-400 hover:bg-gray-800">
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
  // This would be replaced with actual CMS fetching
  return {
    props: {
      partners: [
        {
          id: '1',
          name: 'Ginetta',
          logo: '/images/partners/ginetta.svg',
          url: 'https://ginetta.net',
        },
        {
          id: '2',
          name: 'Smallpdf',
          logo: '/images/partners/smallpdf.svg',
          url: 'https://smallpdf.com',
        },
        {
          id: '3',
          name: 'Google',
          logo: '/images/partners/google.svg',
          url: 'https://google.com',
        },
        {
          id: '4',
          name: 'Mozilla',
          logo: '/images/partners/mozilla.svg',
          url: 'https://mozilla.org',
        },
        {
          id: '5',
          name: 'Microsoft',
          logo: '/images/partners/microsoft.svg',
          url: 'https://microsoft.com',
        },
        {
          id: '6',
          name: 'Vercel',
          logo: '/images/partners/vercel.svg',
          url: 'https://vercel.com',
        },
      ],
      upcomingEvent: {
        title: 'Zurich JS Meetup #3: Revitalizing JS spring season',
        date: 'Mar 20, 2025',
        location: 'Ginetta, Zurich',
        image: '/images/events/event-3.jpg',
      }
    },
  };
}