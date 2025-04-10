import SEO from '@/components/SEO';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Coffee, Star, Users, Code, Calendar, Twitter, Github, Linkedin, Globe } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { getUpcomingEvents, getPastEvents } from '@/sanity/queries';
import Link from 'next/link';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import useEvents from '@/hooks/useEvents';
import Section from '@/components/Section';

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
    date: string;
    photo?: string;
    link?: string;
  }>;
  eventsHosted: number;
}

export default function Support({ recentSupporters, eventsHosted }: SupportPageProps) {
  useReferrerTracking();
  const { track } = useEvents();

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
    track('support_click', {
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
                Support ZurichJS! ☕
              </h1>
              <p className="text-xl mb-6 text-gray-900">
                Help us brew amazing JavaScript events and keep our community thriving in Zurich!
              </p>
              <p className="text-lg mb-8 text-gray-900">
                Your support allows us to organize regular meetups, invite speakers, provide snacks, and create an inclusive space for JavaScript
                enthusiasts to learn and connect.
              </p>
              <a
                  href="https://buymeacoffee.com/zurichjs/membership"
                  className="bg-js-dark hover:bg-js text-black font-medium py-3 px-8 rounded-full 
                  shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 
                  w-fit flex items-center gap-2 md:text-lg"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSupportClick('Hero')}
              >
                <Coffee size={20} className="animate-bounce" />
                <span>Buy Us a Coffee</span>
              </a>
            </motion.div>

            <motion.div
                initial={{opacity: 0, y: 30}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.7, delay: 0.3}}
                className="grow basis-1/2 lg:basis-2/3"
            >
              <div className="bg-white p-6 rounded-lg shadow-xl border-4 border-gray-900">
                <div className="p-4 bg-gray-100 rounded-lg mb-6">
                  <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">What Your Support Helps Us Do</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Coffee className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20}/>
                      <span>Provide food and drinks at our meetups</span>
                    </li>
                    <li className="flex items-start">
                      <Calendar className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20}/>
                      <span>Organize regular events and workshops</span>
                    </li>
                    <li className="flex items-start">
                      <Code className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20}/>
                      <span>Create educational content for the community</span>
                    </li>
                    <li className="flex items-start">
                      <Star className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20}/>
                      <span>Invite guest speakers to share knowledge</span>
                    </li>
                    <li className="flex items-start">
                      <Users className="text-amber-600 mt-1 mr-3 flex-shrink-0" size={20}/>
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
        </Section>

        {/* Support Options Section */}
        <Section id="support-options" variant="white">
            <motion.div
                initial={{opacity: 0, y: 20}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5}}
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
                      initial={{opacity: 0, y: 20}}
                      whileInView={{opacity: 1, y: 0}}
                      viewport={{once: true}}
                      transition={{duration: 0.5}}
                      className={`bg-white p-6 rounded-lg shadow-md border-2 border-js-dark flex flex-col justify-between`}
                  >
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{tier.name}</h3>
                      <p className="text-gray-700 mb-4">{tier.description}</p>
                      <p className="text-lg font-semibold text-amber-600 mb-4">{tier.price}</p>
                    </div>
                    <a
                        href="https://buymeacoffee.com/zurichjs/membership"
                        className={`
                          ${tier.highlighted ? 'bg-js-dark hover:bg-js text-black' : 'bg-gray-900 hover:bg-gray-800 text-white'} 
                          py-2 px-4 rounded-full mt-auto w-full text-center font-medium 
                          transition-all duration-300 transform hover:scale-105 hover:shadow-md
                          flex items-center justify-center gap-2
                        `}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackSupportClick(tier.name)}
                    >
                      {tier.highlighted && <Coffee size={16} />}
                      <span>Support Now</span>
                    </a>
                  </motion.div>
              ))}
            </div>
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
                            <div className="h-32 bg-gradient-to-r from-amber-400 to-yellow-300 flex items-center justify-center">
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
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Join Us in Building Zurich&apos;s JS Community! ✨</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Your support, whether big or small, helps us create amazing experiences for JavaScript enthusiasts in Zurich.
            </p>
            <a
                href="https://buymeacoffee.com/zurichjs/membership"
                className="text-black py-3 px-8 rounded-full bg-js-dark hover:bg-js transition-all duration-300 
                transform hover:scale-105 hover:shadow-md font-medium"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSupportClick('Final CTA')}
            >
              Support ZurichJS Today!
            </a>
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
  ];

  return {
    props: {
      upcomingEvent: upcomingEvents[0],
      recentSupporters,
      eventsHosted, // Pass the number of events hosted as a prop
    },
  };
}
