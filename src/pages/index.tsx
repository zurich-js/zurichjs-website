import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Stats from '@/components/ui/Stats';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import SpeakerGrid from '@/components/sections/SpeakerGrid';
import Partners from '@/components/sections/Partners';
import CommunityValues from '@/components/sections/CommunityValues';
import JoinCTA from '@/components/sections/JoinCTA';
import type { Event } from '@/sanity/queries';
import { getSpeakers, getStats, getUpcomingEvents } from '@/sanity/queries';
import { getPartners } from '@/data';
import SEO from '@/components/SEO';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';


interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
  talks: number;
}

interface StatsData {
  members: number;
  eventsHosted: number;
  speakersToDate: number;
  totalAttendees: number;
}

interface Partner {
  id: string;
  name: string;
  logo: string;
  url: string;
}

interface HomeProps {
  upcomingEvents: Event[];
  featuredSpeakers: Speaker[];
  stats: StatsData;
  partners: Partner[];
}

export default function Home({ upcomingEvents, featuredSpeakers, stats, partners }: HomeProps) {
  useReferrerTracking();
  const { track } = useEvents();

  // Get the next event date dynamically
  const nextEventDate = upcomingEvents && upcomingEvents.length > 0
    ? new Date(upcomingEvents[0].datetime).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + new Date(upcomingEvents[0].datetime).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
    : 'Coming soon';

  // Track event handlers
  const handleJoinMeetupClick = () => {
    track('button_click', { name: 'join_next_meetup' });
  };

  const handleSubmitTalkClick = () => {
    track('button_click', { name: 'submit_talk' });
  };

  const handleReserveSpotClick = (eventTitle: string) => {
    track('event_rsvp', {
      name: 'reserve_spot',
      eventTitle: eventTitle
    });
  };

  return (
    <Layout>
      <SEO
        title="ZurichJS | JavaScript Community in Zurich, Switzerland"
        description="ZurichJS is the community for JavaScript enthusiasts in Zurich. Join us for regular meetups, workshops, and networking with fellow developers."
        openGraph={{
          title: "ZurichJS | JavaScript Community in Zurich",
          description: "Join Zurich's vibrant community for JavaScript enthusiasts. Connect, learn, and grow with fellow developers.",
          image: '/api/og/home',
          type: 'website'
        }}
      />


      {/* Hero Section with Animation */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900">

        <div className="container mx-auto px-6 py-20 md:py-28 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-3/5 md:pr-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-6xl md:text-7xl font-extrabold text-black mb-4">
                  <span className="block">Zurich</span>
                  <span className="text-7xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">JS</span>
                </h1>

                <h2 className="text-2xl md:text-3xl font-medium mb-6 text-black">
                  Where Zurich&apos;s JavaScript wizards unite! ✨
                </h2>
                <p className="text-lg mb-8 text-black max-w-2xl">
                  From React ninjas to Node gurus, TypeScript enthusiasts to vanilla JS lovers –
                  we&apos;re building a vibrant community of developers who create amazing things with JavaScript.
                  Connect, learn, and level up your skills in Switzerland&apos;s most dynamic tech community!
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    href="/events"
                    variant="primary"
                    size="lg"
                    className="transform hover:scale-105 transition-transform"
                    onClick={handleJoinMeetupClick}
                  >
                    Join Next Meetup 🎉
                  </Button>
                  <Button
                    href="/cfp"
                    variant="secondary"
                    size="lg"
                    className="transform hover:scale-105 transition-transform"
                    onClick={handleSubmitTalkClick}
                  >
                    Submit a Talk 🎤
                  </Button>
                </div>
              </motion.div>
            </div>

            <div className="md:w-2/5 mt-12 md:mt-0">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="relative bg-white rounded-xl shadow-xl overflow-hidden border-4 border-gray-900"
              >
                {/* Next event card */}
                {upcomingEvents && upcomingEvents.length > 0 ? (
                  <div className="relative p-6">
                    <div className="absolute -top-1 -right-1 bg-black text-yellow-400 px-4 py-2 rounded-bl-lg font-mono z-10 transform rotate-2 shadow-md">
                      Next Event
                    </div>
                    <div className="pt-8">
                      <h3 className="text-2xl font-bold mb-3">{upcomingEvents[0].title}</h3>
                      <div className="flex items-center mb-3 text-gray-800">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">{nextEventDate}</span>
                      </div>
                      <div className="flex items-center mb-4 text-gray-800">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{upcomingEvents[0].location}</span>
                      </div>
                      <div className="flex items-center text-sm bg-gray-100 p-3 rounded-lg">
                        <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-medium">{upcomingEvents[0].attendees || 0} developers joining</span>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        className="mt-4"
                      >
                        <a
                          href={upcomingEvents[0].meetupUrl || `/events/${upcomingEvents[0].id}`}
                          className="block bg-yellow-400 text-black font-bold py-3 px-4 rounded-lg text-center shadow-md hover:bg-yellow-500 transition-colors"
                          onClick={() => handleReserveSpotClick(upcomingEvents[0].title)}
                        >
                          Reserve Your Spot →
                        </a>
                      </motion.div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </div>
          </div>

          {/* Stats Counter */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-16"
          >
            <Stats stats={stats} />
          </motion.div>

        </div>
      </section>

      {/* Upcoming Events Section */}
      <UpcomingEvents events={upcomingEvents} />

      {/* Community Values Section */}
      <CommunityValues />

      {/* Featured Speakers */}
      <SpeakerGrid speakers={featuredSpeakers} />

      {/* Partners Section - with Zurich blue header */}
      <Partners partners={partners} />

      {/* Join CTA */}
      <JoinCTA />
    </Layout>
  );
}

export async function getStaticProps() {
  // This would be replaced with actual CMS fetching

  const stats = await getStats();
  const upcomingEvents = await getUpcomingEvents();
  const speakers = await getSpeakers({ shouldFilterVisible: true });
  const partners = getPartners();
  return {
    props: {
      upcomingEvents,
      featuredSpeakers: speakers.slice(0, 3),
      stats,
      partners
    },
  };
}