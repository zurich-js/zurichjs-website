import SEO from '@/components/SEO';
import { motion } from 'framer-motion';
import { Coffee, Heart, Star, Users, Code, Calendar } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { getUpcomingEvents, getPastEvents } from '@/sanity/queries';
import Link from 'next/link';
import { sendGTMEvent } from '@next/third-parties/google';
import useReferrerTracking from '@/hooks/useReferrerTracking';

// Define our TypeScript interfaces
interface SupportTier {
  id: string;
  name: string;
  price: string;
  description: string;
  highlighted?: boolean;
}


interface SupportPageProps {
  recentSupporters: Array<{
    name: string;
    amount: string;
    date: string;
  }>;
  eventsHosted: number;
}

export default function Support({ recentSupporters, eventsHosted }: SupportPageProps) {
  useReferrerTracking();

  // Define support tiers with updated names and prices
  const supportTiers: SupportTier[] = [
    {
      id: 'coffee',
      name: 'Coffee',
      price: '€5',
      description: 'Buy us a coffee and help keep the community caffeinated!',
    },
    {
      id: 'supporter',
      name: 'Supporter',
      price: '€10',
      description: 'Support our regular meetups and events.',
      highlighted: true,
    },
    {
      id: 'enthusiast',
      name: 'Enthusiast',
      price: '€20',
      description: 'Help us organize special events and workshops.',
    },
    {
      id: 'advocate',
      name: 'Advocate',
      price: '€30',
      description: 'Contribute to the growth and sustainability of ZurichJS.',
    },
  ];

  // Function to track support button clicks
  const trackSupportClick = (tierName: string) => {
    sendGTMEvent({
      event: 'support_click',
      tier_name: tierName,
      value: tierName === 'Coffee' ? 5 : tierName === 'Supporter' ? 10 : tierName === 'Enthusiast' ? 20 : 30
    });
  };

  return (
    <Layout>
      <SEO 
        title="Support ZurichJS | JavaScript Community in Zurich"
        description="Support the ZurichJS community and help us continue organizing events, workshops, and building the JavaScript ecosystem in Zurich."
        openGraph={{
          title: "Support ZurichJS",
          description: "Help us grow the JavaScript community in Zurich with your support.",
          image: "/api/og/support",
          type: "website"
        }}
      />

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-yellow-400 to-amber-500 py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0"
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                  Support ZurichJS! ☕
                </h1>
                <p className="text-xl mb-6 text-gray-900">
                  Help us brew amazing JavaScript events and keep our community thriving in Zurich!
                </p>
                <p className="text-lg mb-8 text-gray-900">
                  Your support allows us to organize regular meetups, invite speakers, provide snacks, and create an inclusive space for JavaScript enthusiasts to learn and connect.
                </p>
                <a 
                  href="https://buymeacoffee.com/zurichjs/membership" 
                  className="bg-gray-900 hover:bg-gray-800 text-white py-3 px-6 rounded-lg"
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => trackSupportClick('Hero')}
                >
                  Buy Us a Coffee ☕
                </a>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:w-1/2"
              >
                <div className="bg-white p-6 rounded-lg shadow-xl border-4 border-gray-900">
                  <div className="p-4 bg-gray-100 rounded-lg mb-6">
                    <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">What Your Support Helps Us Do</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Coffee className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20} />
                        <span>Provide food and drinks at our meetups</span>
                      </li>
                      <li className="flex items-start">
                        <Calendar className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20} />
                        <span>Organize regular events and workshops</span>
                      </li>
                      <li className="flex items-start">
                        <Code className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20} />
                        <span>Create educational content for the community</span>
                      </li>
                      <li className="flex items-start">
                        <Star className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20} />
                        <span>Invite guest speakers to share knowledge</span>
                      </li>
                      <li className="flex items-start">
                        <Users className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20} />
                        <span>Build a vibrant JS community in Zurich</span>
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
          </div>
        </section>

        {/* Support Options Section */}
        <section id="support-options" className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Support Options ✨</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Every contribution helps us create better events and grow our community.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {supportTiers.map((tier) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className={`bg-white p-6 rounded-lg shadow-md border-2 border-amber-500 flex flex-col justify-between`}
                >
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{tier.name}</h3>
                    <p className="text-gray-700 mb-4">{tier.description}</p>
                    <p className="text-lg font-semibold text-amber-600 mb-4">{tier.price}</p>
                  </div>
                  <a 
                    href="https://buymeacoffee.com/zurichjs/membership" 
                    className="bg-gray-900 hover:bg-gray-800 text-white py-2 px-4 rounded-lg mt-auto"
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => trackSupportClick(tier.name)}
                  >
                    Support Now
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Supporters */}
        {recentSupporters && recentSupporters.length > 0 ? (
          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold mb-3 text-gray-900">Recent Supporters 💛</h2>
                <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                  A big thank you to these amazing people who&apos;ve supported ZurichJS recently!
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {recentSupporters.map((supporter, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white p-4 rounded-lg shadow-md"
                  >
                    <div className="flex items-center">
                      <Heart size={16} className="text-red-500 mr-2" />
                      <p className="font-medium text-gray-900">{supporter.name}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600">{supporter.date}</span>
                      <span className="font-semibold text-amber-600">{supporter.amount}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {recentSupporters.length === 0 && (
                <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-lg mx-auto">
                  <Heart size={32} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold mb-2 text-amber-500">Be the first one!</h3>
                  <p className="text-gray-700 mb-4">
                    Be the first to support ZurichJS and help us kick off our community fund!
                  </p>
                  <Button 
                    href="https://buymeacoffee.com/zurichjs/membership" 
                    variant="outline" 
                    className="border-amber-500 text-amber-500 hover:bg-amber-50"
                    external
                    onClick={() => trackSupportClick('Recent Supporters')}
                  >
                    Support Now
                  </Button>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8"
              >
                <h2 className="text-3xl font-bold mb-3 text-gray-900">Recent Supporters 💛</h2>
              </motion.div>

              <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-lg mx-auto">
                <Heart size={32} className="mx-auto mb-4 text-amber-500" />
                <h3 className="text-xl font-bold mb-2">Be the first one!</h3>
                <p className="text-gray-700 mb-4">
                  Be the first to support ZurichJS and help us kick off our community fund!
                </p>
                <Button 
                  href="https://buymeacoffee.com/zurichjs/membership" 
                  variant="outline" 
                  className="border-amber-500 text-amber-500 hover:bg-amber-50"
                  external
                  onClick={() => trackSupportClick('First Supporter')}
                >
                  Support Now
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Frequently Asked Questions</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Have questions about supporting ZurichJS? We&apos;ve got answers!
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <h3 className="text-xl font-bold mb-2 text-gray-900">How is my support used?</h3>
                <p className="text-gray-700">
                  Your support goes directly to covering community expenses such as venue rentals, refreshments at meetups, speaker support, educational materials, and website maintenance. We&apos;re a 100% volunteer-run community!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <h3 className="text-xl font-bold mb-2 text-gray-900">Is my support tax-deductible?</h3>
                <p className="text-gray-700">
                  Currently, ZurichJS is not registered as a non-profit organization, so contributions are not tax-deductible. We&apos;re exploring this option for the future to make your support even more impactful.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <h3 className="text-xl font-bold mb-2 text-gray-900">Can I cancel my monthly support?</h3>
                <p className="text-gray-700">
                  Yes, you can cancel your monthly support at any time. Just email us at hello@zurichjs.com and we&apos;ll help you manage your subscription.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-50 p-6 rounded-lg"
              >
                <h3 className="text-xl font-bold mb-2 text-gray-900">My company wants to sponsor. Is this the right place?</h3>
                <p className="text-gray-700">
                  For larger corporate sponsorships with benefits like logo placement and speaking opportunities, please check out our <Link href="/partnerships" className="text-amber-600 hover:underline">partnerships page</Link>. This support page is primarily for individual contributions.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-br from-yellow-400 to-amber-500">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Join Us in Building Zurich&apos;s JS Community! ✨</h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-900">
                Your support, whether big or small, helps us create amazing experiences for JavaScript enthusiasts in Zurich.
              </p>
              <a 
                href="https://buymeacoffee.com/zurichjs/membership" 
                className="bg-gray-900 text-white py-3 px-6 rounded-lg"
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => trackSupportClick('Final CTA')}
              >
                Support ZurichJS Today! ☕
              </a>
            </motion.div>
          </div>
        </section>
      </div>
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
  const recentSupporters: Array<{ name: string; amount: string; date: string }> = [
    // Comment this out initially to show the "Be the first one" message
    // { name: 'Alex Johnson', amount: '€10', date: 'March 10, 2025' },
    // { name: 'Maria Garcia', amount: '€25', date: 'March 8, 2025' },
    // { name: 'Daniel Weber', amount: '€5', date: 'March 5, 2025' },
    // { name: 'Sophia Müller', amount: '€10 monthly', date: 'March 1, 2025' },
    // { name: 'Thomas Keller', amount: '€50', date: 'February 27, 2025' },
    // { name: 'Emma Schmidt', amount: '€15', date: 'February 22, 2025' },
  ];
  
  return {
    props: {
      upcomingEvent: upcomingEvents[0],
      recentSupporters,
      eventsHosted, // Pass the number of events hosted as a prop
    },
  };
}