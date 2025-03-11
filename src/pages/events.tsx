import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ChevronRight, Search } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
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
  speaker: Speaker;
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
        talk.speaker.name.toLowerCase().includes(query)
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
      <Head>
        <title>{activeTab === 'upcoming' ? 'Upcoming Events' : 'Past Events'} | ZurichJS</title>
        <meta 
          name="description" 
          content="Join the vibrant JavaScript community in Zurich! Check out our upcoming meetups, workshops, and talks for JavaScript enthusiasts of all levels."
        />
      </Head>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-yellow-400 py-16">
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
                              <div key={talk.id} className="flex items-center">
                                <div className="w-10 h-10 relative rounded-full overflow-hidden mr-3 flex-shrink-0">
                                  <Image
                                    src={talk.speaker.image}
                                    alt={talk.speaker.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{talk.title}</p>
                                  <p className="text-sm text-gray-700">{talk.speaker.name}, {talk.speaker.title}</p>
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
                            href={`/events/${event.slug}`} 
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
                    <Link href={`/events/${event.slug}`} className="block">
                      <div className="relative h-48 w-full">
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
                            <p className="font-bold text-sm mb-2 text-gray-900">Speakers:</p>
                            <div className="flex -space-x-2">
                              {event.talks.slice(0, 3).map((talk, i) => (
                                <div 
                                  key={talk.id} 
                                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-white relative"
                                  style={{ zIndex: 10 - i }}
                                >
                                  <Image
                                    src={talk.speaker.image}
                                    alt={talk.speaker.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                              {event.talks.length > 3 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-700" style={{ zIndex: 7 }}>
                                  +{event.talks.length - 3}
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
                  className="bg-blue-700 hover:bg-blue-600 text-white"
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
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  // This would be replaced with actual CMS fetching
  return {
    props: {
      upcomingEvents: [
        {
          id: '1',
          title: 'Zurich JS Meetup #3: Revitalizing JS spring season',
          slug: 'zurichjs-meetup-3-revitalizing-js-spring-season',
          date: 'Mar 20, 2025',
          time: '6:00 PM CET',
          location: 'Ginetta, Zurich',
          address: 'Josefstrasse 219, 8005 Zürich',
          description: 'It\'s JS time again, folks! 🌱 Join us for an evening of JavaScript goodness with amazing talks, networking, and pizza! We\'ve got two fantastic speakers lined up and plenty of time to connect with fellow JS enthusiasts.',
          image: '/images/events/event-3.jpg',
          attendees: 60,
          maxAttendees: 80,
          meetupUrl: 'https://meetup.com/zurichjs/events/123456',
          companyUrl: 'https://ginetta.net',
          featured: true,
          upcoming: true,
          talks: [
            {
              id: 't1',
              title: 'Building Accessible React Components: Best Practices',
              speaker: {
                id: 's1',
                name: 'Anna Schmidt',
                title: 'Senior Frontend Developer at WebApp Inc.',
                image: '/images/speakers/speaker-3.jpg',
              },
              time: '6:30 PM',
              description: 'Learn how to create React components that are accessible to everyone. Anna will dive into practical techniques, ARIA attributes, and testing strategies.'
            },
            {
              id: 't2',
              title: 'JavaScript Performance Optimization in 2025',
              speaker: {
                id: 's2',
                name: 'David Wilson',
                title: 'Performance Engineer at SpeedyCode',
                image: '/images/speakers/speaker-4.jpg',
              },
              time: '7:15 PM',
              description: 'David will show us cutting-edge techniques for optimizing JavaScript performance in modern browsers. Expect practical tips you can apply immediately!'
            },
            {
              id: 't3',
              title: 'Lightning Talks: Community Showcase',
              speaker: {
                id: 's3',
                name: 'Various Speakers',
                title: 'ZurichJS Community Members',
                image: '/images/speakers/default.jpg',
              },
              time: '8:00 PM',
              description: '3-5 lightning talks from community members! Got something cool to share? Reach out to us!'
            }
          ]
        },
        {
          id: '2',
          title: 'Zurich JS Meetup #4: April stands for AI',
          slug: 'zurichjs-meetup-4-april-stands-for-ai',
          date: 'Apr 17, 2025',
          time: '6:00 PM CEST',
          location: 'Smallpdf AG, Zurich',
          address: 'Förrlibuckstrasse 190, 8005 Zürich',
          description: 'AI meets JavaScript! 🤖 This special meetup focuses on the intersection of AI and JS. Learn about machine learning in the browser, JS-powered AI tools, and how to integrate AI capabilities into your web applications.',
          image: '/images/events/event-4.jpg',
          attendees: 43,
          maxAttendees: 100,
          meetupUrl: 'https://meetup.com/zurichjs/events/123457',
          companyUrl: 'https://smallpdf.com',
          upcoming: true,
          talks: [
            {
              id: 't4',
              title: 'Machine Learning in the Browser with TensorFlow.js',
              speaker: {
                id: 's4',
                name: 'Michael Chen',
                title: 'AI Engineer at DataScience Corp',
                image: '/images/speakers/speaker-2.jpg',
              },
              description: 'Discover how to run machine learning models directly in the browser! Michael will demonstrate real-world applications and performance tips.'
            },
            {
              id: 't5',
              title: 'Building AI-Powered JavaScript Applications',
              speaker: {
                id: 's5',
                name: 'Sarah Johnson',
                title: 'Lead Developer at AIStartup',
                image: '/images/speakers/speaker-1.jpg',
              },
              description: 'Sarah will walk us through how to integrate AI capabilities into your JavaScript applications using modern APIs and services.'
            }
          ]
        },
        {
          id: '3',
          title: 'Zurich JS Meetup #5: TypeScript Deep Dive',
          slug: 'zurichjs-meetup-5-typescript-deep-dive',
          date: 'May 22, 2025',
          time: '6:30 PM CEST',
          location: 'Google Zurich',
          address: 'Brandschenkestrasse 110, 8002 Zürich',
          description: 'TypeScript lovers unite! 🎯 Ready for a type-safe evening of coding goodness? We\'re diving deep into the world of TypeScript with expert speakers, hands-on examples, and plenty of "Aha!" moments. From advanced types to real-world patterns, this meetup will level up your TS game!',
          image: '/images/events/event-5.jpg',
          attendees: 28,
          maxAttendees: 120,
          meetupUrl: 'https://meetup.com/zurichjs/events/123458',
          companyUrl: 'https://google.com',
          upcoming: true,
          talks: [
            {
              id: 't6',
              title: 'Type-Level Programming: The Magic of TypeScript',
              speaker: {
                id: 's6',
                name: 'Laura Müller',
                title: 'TypeScript Specialist at EnterpriseApp',
                image: '/images/speakers/speaker-5.jpg',
              },
              description: 'Explore the mind-bending world of type-level programming! Laura will show how TypeScript\'s type system is actually a functional language of its own.'
            },
            {
              id: 't7',
              title: 'From JavaScript to TypeScript: Migration Success Stories',
              speaker: {
                id: 's7',
                name: 'Robert Zhang',
                title: 'Engineering Manager at GlobalApp',
                image: '/images/speakers/speaker-6.jpg',
              },
              description: 'Real-world case studies of successful JS to TS migrations. Learn practical strategies for converting your codebase while maintaining team velocity.'
            }
          ]
        }
      ],
      pastEvents: [
        {
          id: '4',
          title: 'Zurich JS Meetup #2: Frontend Frameworks Showdown',
          slug: 'zurichjs-meetup-2-frontend-frameworks-showdown',
          date: 'Feb 12, 2025',
          time: '6:00 PM CET',
          location: 'Microsoft Switzerland',
          address: 'Richtistrasse 3, 8304 Wallisellen',
          description: 'Framework battle royale! 🥊 React vs. Vue vs. Angular vs. Svelte! Our speakers showed off the best (and worst!) of today\'s popular frontend frameworks. We compared performance, developer experience, and ecosystem support in this epic showdown!',
          image: '/images/events/event-2.jpg',
          attendees: 75,
          meetupUrl: 'https://meetup.com/zurichjs/events/123455',
          companyUrl: 'https://microsoft.com',
          upcoming: false,
          talks: [
            {
              id: 't8',
              title: 'React in 2025: Beyond the Hook Revolution',
              speaker: {
                id: 's8',
                name: 'Sophie Dupont',
                title: 'React Team Lead at DevShop',
                image: '/images/speakers/speaker-7.jpg',
              },
              description: 'Sophie explored React\'s latest features and patterns, showing how the library has evolved while maintaining its core principles.'
            },
            {
              id: 't9',
              title: 'Vue.js: The Progressive Framework for Modern Apps',
              speaker: {
                id: 's9',
                name: 'James Thompson',
                title: 'Vue.js Expert at AppStudio',
                image: '/images/speakers/speaker-8.jpg',
              },
              description: 'James demonstrated Vue\'s elegant approach to reactivity and component design, highlighting what makes it special in 2025.'
            },
            {
              id: 't10',
              title: 'Framework Benchmarks: A Scientific Comparison',
              speaker: {
                id: 's10',
                name: 'Marco Rossi',
                title: 'Performance Engineer at TechBench',
                image: '/images/team/marco.jpg',
              },
              description: 'Marco presented real-world performance data comparing all major frameworks across different scenarios and metrics.'
            }
          ]
        },
        {
          id: '5',
          title: 'Zurich JS Meetup #1: 2025 JavaScript Kickoff!',
          slug: 'zurichjs-meetup-1-2025-javascript-kickoff',
          date: 'Jan 15, 2025',
          time: '6:30 PM CET',
          location: 'Vercel Office Zurich',
          address: 'Bahnhofstrasse 104, 8001 Zürich',
          description: 'We kicked off 2025 with a bang! 🎆 Our first meetup of the year featured talks on the State of JavaScript in 2025, upcoming ECMAScript features, and web performance optimization techniques. Plus we announced our exciting plans for the ZurichJS community this year!',
          image: '/images/events/event-1.jpg',
          attendees: 68,
          meetupUrl: 'https://meetup.com/zurichjs/events/123454',
          companyUrl: 'https://vercel.com',
          upcoming: false,
          talks: [
            {
              id: 't11',
              title: 'State of JavaScript 2025: Trends and Predictions',
              speaker: {
                id: 's11',
                name: 'Faris Aziz',
                title: 'Founder of ZurichJS',
                image: '/images/team/faris.jpg',
              },
              description: 'Faris presented the results of the annual State of JavaScript survey and shared insights on where the ecosystem is heading.'
            },
            {
              id: 't12',
              title: 'ECMAScript 2025: New Features You\'ll Love',
              speaker: {
                id: 's12',
                name: 'Lena Müller',
                title: 'JavaScript Standards Contributor',
                image: '/images/team/lena.jpg',
              },
              description: 'Lena walked us through the exciting new JavaScript language features landing in ECMAScript 2025 and how to use them today.'
            }
          ]
        },
        {
          id: '6',
          title: 'Zurich JS Workshop: Building Modern Web Apps',
          slug: 'zurichjs-workshop-building-modern-web-apps',
          date: 'Dec 5, 2024',
          time: '9:00 AM - 5:00 PM CET',
          location: 'Technopark Zurich',
          address: 'Technoparkstrasse 1, 8005 Zürich',
          description: 'A full-day hands-on workshop for JavaScript developers! 💻 Participants built a complete web application from scratch using modern tools and best practices. We covered frontend, backend, testing, and deployment in this intensive, collaborative session.',
          image: '/images/events/workshop-1.jpg',
          attendees: 45,
          meetupUrl: 'https://meetup.com/zurichjs/events/123453',
          upcoming: false,
          talks: [
            {
              id: 't13',
              title: 'Full-Day JavaScript Workshop',
              speaker: {
                id: 's13',
                name: 'The ZurichJS Team',
                title: 'JavaScript Experts',
                image: '/images/about/community-photo.jpg',
              },
              description: 'An immersive, hands-on workshop covering modern JavaScript application development from start to finish.'
            }
          ]
        },
        {
          id: '7',
          title: 'Zurich JS Special: JavaScript Security Summit',
          slug: 'zurichjs-special-javascript-security-summit',
          date: 'Nov 18, 2024',
          time: '6:30 PM CET',
          location: 'ETH Zurich',
          address: 'Rämistrasse 101, 8092 Zürich',
          description: 'Security-focused JavaScript special event! 🔒 We explored common vulnerabilities in JS applications and how to protect against them. From XSS to supply chain attacks, this meetup was all about building more secure JavaScript applications.',
          image: '/images/events/event-security.jpg',
          attendees: 82,
          meetupUrl: 'https://meetup.com/zurichjs/events/123452',
          upcoming: false,
          talks: [
            {
              id: 't14',
              title: 'Common JavaScript Security Vulnerabilities and How to Avoid Them',
              speaker: {
                id: 's14',
                name: 'Dr. Thomas Weber',
                title: 'Security Researcher at CyberShield',
                image: '/images/speakers/speaker-security.jpg',
              },
              description: 'Dr. Weber presented the most common security issues in JavaScript applications and practical strategies to mitigate them.'
            },
            {
              id: 't15',
              title: 'Securing Your npm Supply Chain',
              speaker: {
                id: 's15',
                name: 'Elena Kowalski',
                title: 'DevSecOps Engineer at SecureCode',
                image: '/images/speakers/speaker-security-2.jpg',
              },
              description: 'Elena explained how to protect your applications from supply chain attacks and ensure the security of your dependencies.'
            }
          ]
        },
        {
          id: '8',
          title: 'Zurich JS Meetup: Node.js Performance Masterclass',
          slug: 'zurichjs-meetup-nodejs-performance-masterclass',
          date: 'Oct 24, 2024',
          time: '6:00 PM CEST',
          location: 'Amazon Web Services Zurich',
          address: 'Schulstrasse 1, 8304 Wallisellen',
          description: 'Node.js performance extravaganza! ⚡ We dove deep into optimizing server-side JavaScript applications. From memory management to async patterns, this meetup was packed with expert advice for making your Node.js apps blazing fast.',
          image: '/images/events/event-node.jpg',
          attendees: 65,
          meetupUrl: 'https://meetup.com/zurichjs/events/123451',
          upcoming: false,
          talks: [
            {
              id: 't16',
              title: 'Node.js Performance Monitoring and Debugging',
              speaker: {
                id: 's16',
                name: 'Alex Fernandez',
                title: 'Backend Architect at CloudScale',
                image: '/images/speakers/speaker-node.jpg',
              },
              description: 'Alex demonstrated practical tools and techniques for identifying and resolving performance bottlenecks in Node.js applications.'
            },
            {
              id: 't17',
              title: 'Scaling Node.js: Lessons from Production',
              speaker: {
                id: 's17',
                name: 'Priya Sharma',
                title: 'Lead DevOps Engineer at MegaApp',
                image: '/images/speakers/speaker-node-2.jpg',
              },
              description: 'Priya shared real-world experience scaling Node.js applications to handle millions of users and the lessons learned along the way.'
            }
          ]
        },
        {
          id: '9',
          title: 'Zurich JS Social: Summer JavaScript Mixer',
          slug: 'zurichjs-social-summer-javascript-mixer',
          date: 'Aug 15, 2024',
          time: '7:00 PM CEST',
          location: 'Rathaus Café',
          address: 'Limmatquai 61, 8001 Zürich',
          description: 'Summer JavaScript social event! 🍹 No formal talks, just good vibes, great conversations, and connecting with fellow JS enthusiasts! We enjoyed drinks, snacks, and casual discussions about all things JavaScript on this beautiful summer evening.',
          image: '/images/events/event-social.jpg',
          attendees: 40,
          meetupUrl: 'https://meetup.com/zurichjs/events/123450',
          upcoming: false,
          talks: []
        }
      ]
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