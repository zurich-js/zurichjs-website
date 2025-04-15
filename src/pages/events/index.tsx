import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, ChevronRight, Search, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { FeatureFlags } from '@/constants';
import { getPastEvents, getUpcomingEvents, Event } from '@/sanity/queries';


interface EventsPageProps {
  upcomingEvents: Event[];
  pastEvents: Event[];
}

export default function Events({ upcomingEvents, pastEvents }: EventsPageProps) {

  // State for filtering and searching
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(upcomingEvents);
  const [isClient, setIsClient] = useState(false);
  const showNewsletter = useFeatureFlagEnabled(FeatureFlags.Newsletter);

  // Set up client-side rendering flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update filtered events when tab changes or search query updates
  useEffect(() => {
    const events = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => {
      // If either event doesn't have a datetime, handle appropriately
      if (!a.datetime) return 1; // No date goes to the end
      if (!b.datetime) return -1; // No date goes to the end
      
      // For upcoming events, sort by earliest date first
      if (activeTab === 'upcoming') {
        return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
      }
      // For past events, sort by most recent first
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
    });

    if (searchQuery.trim() === '') {
      setFilteredEvents(sortedEvents);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sortedEvents.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.talks.some(talk =>
        talk.title.toLowerCase().includes(query) ||
        talk.speakers.some(speaker =>
          speaker.name.toLowerCase().includes(query)
        )
      )
    );

    setFilteredEvents(filtered);
  }, [activeTab, searchQuery, upcomingEvents, pastEvents]);

  // Track event view
  useEffect(() => {
    if (isClient && typeof trackEventView === 'function') {
      trackEventView('events_page');
    }
  }, [isClient]);

  // Handle tab change
  const handleTabChange = (tab: 'upcoming' | 'past') => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <Layout>
      <SEO
        title={`${activeTab === 'upcoming' ? 'Upcoming Events' : 'Past Events'} | ZurichJS`}
        description="Join the vibrant JavaScript community in Zurich! Check out our upcoming meetups, workshops, and talks for JavaScript enthusiasts of all levels."
        openGraph={{
          type: 'website',
          title: `${activeTab === 'upcoming' ? 'Upcoming Events' : 'Past Events'} | ZurichJS`,
          description: "Join the vibrant JavaScript community in Zurich! Check out our upcoming meetups, workshops, and talks for JavaScript enthusiasts of all levels.",
          image: upcomingEvents[0]?.image ? `${upcomingEvents[0]?.image}?h=300` : '/api/og/home',
        }}
      />

        {/* Hero Section */}
        <Section variant="gradient" padding="lg" className="mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              JavaScript Gatherings in Zurich! 🎉
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-900">
              Awesome meetups for JS enthusiasts of all levels! Join us to learn, share, and connect with fellow developers in our super friendly community.
            </p>

            {upcomingEvents.length > 0 && (
              <Button
                href={upcomingEvents[0].meetupUrl}
                variant="primary"
                size="lg"
                className="bg-blue-700 hover:bg-blue-600 text-white"
              >
                RSVP for our next meetup! 🚀
              </Button>
            )}
          </motion.div>
        </Section>

        {/* Events List */}
        <Section variant="gray">
            {/* Tabs and Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div className="flex mb-4 md:mb-0 bg-white rounded-lg shadow-sm p-1">
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'upcoming'
                      ? 'bg-blue-700 text-white font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  onClick={() => handleTabChange('upcoming')}
                >
                  Upcoming Meetups 🚀
                </button>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'past'
                      ? 'bg-blue-700 text-white font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  onClick={() => handleTabChange('past')}
                >
                  Past JavaScript Fun ⭐
                </button>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Events grid */}
            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index % 3 * 0.1 }}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full"
                  >
                    <Link href={`/events/${event.id}`} className="flex-grow flex flex-col h-full">
                      <div className="relative h-48 md:h-60 lg:h-64 w-full">
                        {event.image ? (
                          <Image
                            src={`${event.image}?h=400`}
                            alt={event.title}
                            fill
                            className="object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center p-6">
                            <div className="text-center">
                              <div className="text-5xl mb-3">⚛️</div>
                              <div className="mt-3 flex justify-center space-x-3">
                                <span className="text-2xl">🚀</span>
                                <span className="text-2xl">💻</span>
                                <span className="text-2xl">🔥</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold mb-3 line-clamp-2 text-gray-900">{event.title}</h3>

                        <div className="flex flex-col space-y-3 mb-4">
                          <div className="flex flex-wrap gap-2">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                              <Calendar className="inline-block mr-1 h-4 w-4" />
                              {isClient ? (
                                event.datetime ? 
                                new Date(event.datetime).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 
                                'Date TBD'
                              ) : ''}
                            </span>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                              <Clock className="inline-block mr-1 h-4 w-4" />
                              {isClient ? (
                                event.datetime ? 
                                new Date(event.datetime).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                'Time TBD'
                              ) : ''}
                            </span>
                          </div>
                          <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm font-medium w-fit">
                            <MapPin size={14} className="mr-1 text-gray-700" />
                            <span className="truncate">{event.location || 'Location TBD'}</span>
                          </div>
                        </div>

                        {event.description ? (
                          <p className="text-gray-700 mb-4 line-clamp-3 text-sm">
                            {event.description}
                          </p>
                        ) : (
                          <div className="mb-4">
                            <p className="text-gray-700 line-clamp-3 text-sm italic">
                              We&apos;re working on bringing this event to life! Check back soon for more details on this exciting JavaScript gathering.
                            </p>
                            <div className="mt-2 flex items-center text-blue-600 text-xs">
                              <span className="animate-pulse">⏳ Coming soon...</span>
                            </div>
                          </div>
                        )}

                        <div className="mt-auto">
                          {isClient && event.talks.length > 0 && (
                            <div className="mb-4">
                              <p className="font-bold text-sm mb-2 text-gray-900">
                                {event.talks.reduce((total, talk) => total + talk.speakers.length, 0) === 1
                                  ? "Speaker:"
                                  : "Speakers:"}
                              </p>
                              <div className="flex -space-x-2">
                                {event.talks.flatMap(talk =>
                                  talk.speakers.map(speaker => (
                                    <div
                                      key={`${talk.id}-${speaker.id}`}
                                      className="w-16 h-16 rounded-full overflow-hidden border-2 border-white relative"
                                      style={{ zIndex: 10 - index }}
                                      title={speaker.name}
                                    >
                                      <Image
                                        src={`${speaker.image}?h=150`}
                                        alt={speaker.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {isClient && event.datetime > new Date().toISOString() && (
                            <div className="flex items-center text-sm font-medium mb-3">
                              <Users size={14} className="mr-1 text-blue-700" />
                              <span className="text-blue-700">
                                {event.attendees === 0
                                  ? "Be one of the first to RSVP!"
                                  : `${event.attendees} attending`}
                              </span>
                            </div>
                          )}

                          <div className="mt-2 flex items-center text-blue-700 font-medium text-sm">
                            <span>View details</span>
                            <ChevronRight size={16} className="ml-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 text-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">No events found</h3>
                <p className="text-gray-700 mb-6">
                  No matches for &quot;{searchQuery}&quot;. Try a different search term or check back later!
                </p>
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="secondary"
                >
                  Clear Search
                </Button>
              </div>
            )}

            {/* Show more button (for past events) */}
            {activeTab === 'past' && filteredEvents.length >= 9 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mt-10"
              >
                <Button
                  href="/events/archive"
                  variant="outline"
                  className="border-blue-700 text-blue-700 hover:bg-blue-50"
                >
                  View All Past Events
                </Button>
              </motion.div>
            )}
        </Section>

        {/* Submit a Talk CTA */}
        <Section variant="black">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col lg:flex-row items-center justify-between"
            >
              <div className="lg:w-2/3 mb-8 lg:mb-0 lg:pr-10">
                <h2 className="text-3xl font-bold mb-4">Got JavaScript Wisdom to Share?</h2>
                <p className="text-xl mb-6">
                  We&apos;re always looking for awesome speakers to share their JavaScript knowledge, stories, and experiments!
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">✓</span>
                    <span>First-time speakers welcome and encouraged! 🎉</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">✓</span>
                    <span>Talks can be 5-30 minutes (lightning talks rock too!)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">✓</span>
                    <span>Share practical tips, cool projects, or mind-expanding concepts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">✓</span>
                    <span>Our team is here to help you prepare and shine! 💫</span>
                  </li>
                </ul>
              </div>
              <div className="lg:w-1/3 flex justify-center">
                <Button
                  href="/cfp"
                  variant="primary"
                  size="lg"
                  className="bg-blue-700 hover:bg-blue-600 text-white w-full md:w-auto"
                >
                  Submit Your Talk Idea! 🎤
                </Button>
              </div>
            </motion.div>
        </Section>

        {/* Host a Meetup */}
        <Section variant="white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Host a ZurichJS Meetup! 🏢</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Got a cool office space? Want to spotlight your company to the JavaScript community? Consider hosting our next meetup!
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-50 p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-xl font-bold mb-3 text-gray-900">What You Provide 🙌</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-700 mr-2">•</span>
                    <span>Space for 30-80 JavaScript enthusiasts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-700 mr-2">•</span>
                    <span>Basic AV setup (projector/screen)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-700 mr-2">•</span>
                    <span>Refreshments (pizza & drinks are always a hit!)</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-50 p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-xl font-bold mb-3 text-gray-900">What You Get 🎁</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-700 mr-2">•</span>
                    <span>5-minute company introduction</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-700 mr-2">•</span>
                    <span>Logo on event page & promotional materials</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-700 mr-2">•</span>
                    <span>Connect with JS talent in a relaxed setting</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-700 mr-2">•</span>
                    <span>Showcase your awesome workspace & culture</span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-js p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-xl font-bold mb-3 text-gray-900">Interested? 🚀</h3>
                <p className="mb-6 text-gray-900">
                  We&apos;d love to bring the JavaScript magic to your space! Reach out and let&apos;s make something awesome happen!
                </p>
                <Button
                  href="/contact?subject=Host%20a%20Meetup"
                  variant="primary"
                  className="w-full bg-blue-700 text-white hover:bg-blue-600"
                >
                  Get in Touch About Hosting
                </Button>
              </motion.div>
            </div>
        </Section>

        {/* Email Updates */}
        {showNewsletter && (
          <Section variant="gray">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-js rounded-lg p-8 shadow-md"
              >
                <div className="md:flex items-center justify-between">
                  <div className="md:w-3/5 mb-6 md:mb-0">
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">Never Miss a JavaScript Gathering! 📬</h2>
                    <p className="text-lg text-gray-900">
                      Subscribe to our newsletter and be the first to know about upcoming events, speaker announcements, and community news!
                    </p>
                  </div>
                  <div className="md:w-2/5">
                    <div className="flex">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        className="flex-grow px-4 py-3 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                      <button className="bg-blue-700 text-white px-6 py-3 rounded-r-md font-bold hover:bg-blue-600 transition-colors">
                        Subscribe 🚀
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
          </Section>
        )}
    </Layout>
  );
}

export async function getStaticProps() {
  const upcomingEvents = await getUpcomingEvents();
  const pastEvents = await getPastEvents();

  return {
    props: {
      upcomingEvents,
      pastEvents
    },
  };
}

export async function trackEventView(page: string) {
  // This function would normally be imported from your analytics library
  // For now, it's just a placeholder
  console.log(`Tracked view of ${page}`);

  // In a real implementation:
  // analytics.trackPageView({
  //   page,
  //   timestamp: new Date().toISOString()
  // });
}
