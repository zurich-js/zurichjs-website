import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ChevronRight, Search } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { getPastEvents } from '@/sanity/queries';
import { getUpcomingEvents } from '@/sanity/queries';
import SEO from '@/components/SEO';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { FeatureFlags } from '@/constants';
// import { trackEventView } from '@/lib/analytics';

// Define our TypeScript interfaces
interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
}

interface EventTalk {
  id: string;
  title: string;
  speakers: Speaker[];
  description?: string;
  time?: string;
}

interface EventDetails {
  id: string;
  title: string;
  slug: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  description: string;
  image: string;
  attendees: number;
  maxAttendees?: number;
  meetupUrl: string;
  companyUrl?: string;
  talks: EventTalk[];
  upcoming: boolean;
  featured?: boolean;
}

interface EventsPageProps {
  upcomingEvents: EventDetails[];
  pastEvents: EventDetails[];
}

export default function Events({ upcomingEvents, pastEvents }: EventsPageProps) {

  // State for filtering and searching
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState<EventDetails[]>(upcomingEvents);
  const [isClient, setIsClient] = useState(false);
  const showNewsletter = useFeatureFlagEnabled(FeatureFlags.Newsletter);
  
  // Set up client-side rendering flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update filtered events when tab changes or search query updates
  useEffect(() => {
    const events = activeTab === 'upcoming' ? upcomingEvents : pastEvents;
    
    if (searchQuery.trim() === '') {
      setFilteredEvents(events);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = events.filter(event => 
      event.title.toLowerCase().includes(query) || 
      event.description.toLowerCase().includes(query) ||
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
          image: `${upcomingEvents[0]?.image}?h=300` || '/api/og/home',
        }}
      />

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-yellow-400 to-amber-500 py-16">
          <div className="container mx-auto px-6">
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
          </div>
        </section>

        {/* Featured Event (if any) */}
        {isClient && upcomingEvents.some(event => event.featured) && (
          <section className="py-12 bg-white">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <h2 className="text-3xl font-bold mb-2 text-gray-900">Don&apos;t Miss This! 🌟</h2>
                <p className="text-xl text-gray-800">
                  Our featured JavaScript meetup is coming up soon!
                </p>
              </motion.div>

              {upcomingEvents
                .filter(event => event.featured)
                .map(event => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-gray-50 rounded-xl shadow-lg overflow-hidden"
                  >
                    <div className="md:flex">
                      <div className="md:w-2/5 relative">
                        <div className="h-64 md:h-full relative">
                          <Image
                            src={event.image}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-4 left-4">
                            <span className="bg-yellow-400 text-black px-4 py-2 rounded-full font-bold">
                              Featured Event!
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="md:w-3/5 p-6 md:p-8">
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            <Calendar className="inline-block mr-1 h-4 w-4" />
                            {event.date}
                          </span>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            <Clock className="inline-block mr-1 h-4 w-4" />
                            {event.time}
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                            <MapPin className="inline-block mr-1 h-4 w-4" />
                            {event.location}
                          </span>
                        </div>
                        
                        <h3 className="text-2xl font-bold mb-3 text-gray-900">{event.title}</h3>
                        <p className="text-gray-800 mb-6">
                          {event.description}
                        </p>
                        
                        <div className="mb-6">
                          <h4 className="font-bold mb-3 text-gray-900">Amazing Speakers: 🎤</h4>
                          <div className="space-y-3">
                            {event.talks.map(talk => (
                              <div key={talk.id}>
                                <p className="font-bold text-gray-900 mb-2">{talk.title}</p>
                                <div className="space-y-2">
                                  {talk.speakers.map(speaker => (
                                    <div key={speaker.id} className="flex items-center">
                                      <div className="w-10 h-10 relative rounded-full overflow-hidden mr-3 flex-shrink-0">
                                        <Image
                                          src={speaker.image}
                                          alt={speaker.name}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-700">{speaker.name}, {speaker.title}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button 
                            href={event.meetupUrl} 
                            variant="primary"
                            size="lg"
                            className="bg-blue-700 hover:bg-blue-600 text-white"
                          >
                            RSVP Now - {event.attendees} attending! 🚀
                          </Button>
                          <Button 
                            href={`/events/${event.id}`} 
                            variant="outline"
                            className="border-blue-700 text-blue-700 hover:bg-blue-50"
                          >
                            Event Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </section>
        )}

        {/* Events List */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            {/* Tabs and Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div className="flex mb-4 md:mb-0 bg-white rounded-lg shadow-sm p-1">
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'upcoming'
                      ? 'bg-blue-700 text-white font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleTabChange('upcoming')}
                >
                  Upcoming Meetups 🚀
                </button>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'past'
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
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <Link href={`/events/${event.id}`} className="block">
                      <div className="relative h-64 w-full">
                        <Image
                          src={event.image}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                        {isClient && event.upcoming && (
                          <div className="absolute top-4 left-4">
                            <span className="bg-blue-700 text-white px-3 py-1 rounded-full text-sm font-medium">
                              Upcoming! 🗓️
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-2 line-clamp-2 text-gray-900">{event.title}</h3>
                        
                        <div className="flex flex-wrap text-sm text-gray-700 mb-3 gap-y-1">
                          <div className="flex items-center mr-4">
                            <Calendar size={14} className="mr-1 text-blue-700" />
                            <span>{event.date}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-1 text-blue-700" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-4 line-clamp-2">
                          {event.description}
                        </p>
                        
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
                                      src={speaker.image}
                                      alt={speaker.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))
                              )}
                              {event.talks.reduce((total, talk) => total + talk.speakers.length, 0) > 3 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-700" style={{ zIndex: 7 }}>
                                  +{event.talks.reduce((total, talk) => total + talk.speakers.length, 0) - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {isClient && event.upcoming && (
                          <div className="flex items-center text-sm">
                            <Users size={14} className="mr-1 text-blue-700" />
                            <span className="text-blue-700 font-medium">{event.attendees} attending</span>
                          </div>
                        )}
                        
                        <div className="mt-4 flex items-center text-blue-700 font-medium text-sm">
                          <span>View details</span>
                          <ChevronRight size={16} className="ml-1" />
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
          </div>
        </section>

        {/* Submit a Talk CTA */}
        <section className="py-16 bg-black text-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col lg:flex-row items-center justify-between"
            >
              <div className="lg:w-2/3 mb-8 lg:mb-0 lg:pr-10">
                <h2 className="text-3xl font-bold mb-4 text-yellow-400">Got JavaScript Wisdom to Share? 💡</h2>
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
          </div>
        </section>

        {/* Host a Meetup */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
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
                className="bg-yellow-400 p-6 rounded-lg shadow-sm"
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
          </div>
        </section>

        {/* Email Updates */}
        {showNewsletter && (
          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-yellow-400 rounded-lg p-8 shadow-md"
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
            </div>
          </section>
        )}
      </div>
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