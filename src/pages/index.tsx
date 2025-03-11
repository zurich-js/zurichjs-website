import Head from 'next/head';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Stats from '@/components/ui/Stats';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import SpeakerGrid from '@/components/sections/SpeakerGrid';
// Updated Partners component with customizable title color
import Partners from '@/components/sections/Partners';
import CommunityValues from '@/components/sections/CommunityValues';
import JoinCTA from '@/components/sections/JoinCTA';

// Define TypeScript interfaces for our data structures
interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  attendees: number;
}

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
  return (
    <Layout>
      <Head>
        <title>ZurichJS | JavaScript Community in Zurich, Switzerland</title>
        <meta name="description" content="ZurichJS is the community for JavaScript enthusiasts in Zurich. Join us for regular meetups, workshops, and networking with fellow developers." />
      </Head>

      {/* Hero Section with Animation */}
      <section className="relative overflow-hidden bg-yellow-400 text-gray-900">
        {/* Animated background pattern */}
        <div className="absolute inset-0 z-0 opacity-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/images/hero-bg.svg')",
              backgroundSize: "cover"
            }}
            aria-hidden="true"
          />
        </div>
        
        <div className="container mx-auto px-6 py-20 md:py-28 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-5xl md:text-6xl font-bold mb-6 text-black">
                  <span className="block">Zurich</span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-7xl md:text-8xl font-black"
                  >
                    JS
                  </motion.span>
                </h1>
                <h2 className="text-2xl md:text-3xl font-medium mb-6 text-black">
                  Zurich&apos;s vibrant community for JavaScript enthusiasts 🚀
                </h2>
                <p className="text-lg mb-8 text-black">
                  Whether you&apos;re coding with React, Angular, Vue, vanilla JS, or Node.js – 
                  this community is for everyone building amazing things with JavaScript! Join us to connect, 
                  learn, and grow alongside fellow developers from all backgrounds in Zurich!
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button href="/events" variant="primary" size="lg" className="bg-blue-700 hover:bg-blue-800 text-white">
                    Join Next Meetup 🎉
                  </Button>
                  <Button href="/cfp" variant="secondary" size="lg" className="bg-blue-700 hover:bg-blue-800 text-white">
                    Submit a Talk 🎤
                  </Button>
                </div>
              </motion.div>
            </div>
            
            <div className="md:w-1/2 mt-12 md:mt-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="relative"
              >
                {/* Large JS Logo Animation */}
                <svg width="100%" height="100%" viewBox="0 0 300 300" className="drop-shadow-lg" aria-label="ZurichJS Logo">
                  <motion.path
                    d="M75 250V50h100v50H125v150h-50zm150 0l-30-50h-20v50h-50V50h100c27.614 0 50 22.386 50 50v50c0 27.614-22.386 50-50 50h-20l40 50h-70zm0-150v-50h-50v50h50z"
                    fill="currentColor"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </svg>
                
                {/* Next meetup date overlay */}
                <motion.div 
                  className="absolute top-0 right-0 bg-black text-yellow-400 px-4 py-2 rounded-lg font-mono"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  aria-label="Next meetup date"
                >
                  Mar 20, 2025
                </motion.div>
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
  return {
    props: {
      upcomingEvents: [
        {
          id: '1',
          title: 'Zurich JS Meetup #3: Revitalizing JS spring season 💐',
          date: 'Mar 20, 2025',
          time: '6:00 PM CET',
          location: 'Ginetta, Zurich',
          image: '/images/events/event-3.jpg',
          attendees: 60,
        },
        {
          id: '2',
          title: 'Zurich JS Meetup #4: April stands for AI & Awesome Innovations 🤖',
          date: 'Apr 17, 2025',
          time: '6:00 PM CEST',
          location: 'Smallpdf AG, Zurich',
          image: '/images/events/event-4.jpg',
          attendees: 0,
        }
      ],
      featuredSpeakers: [
        {
          id: '1',
          name: 'Sarah Johnson',
          title: 'Senior Frontend Developer at TechCorp',
          image: '/images/speakers/speaker-1.jpg',
          talks: 3,
        },
        {
          id: '2',
          name: 'Michael Chen',
          title: 'JavaScript Architect at WebSolutions',
          image: '/images/speakers/speaker-2.jpg',
          talks: 2,
        },
        {
          id: '3',
          name: 'Anna Schmidt',
          title: 'React Team Lead at Startup.io',
          image: '/images/speakers/speaker-3.jpg',
          talks: 1,
        },
      ],
      stats: {
        members: 375,
        eventsHosted: 50,
        speakersToDate: 120,
        totalAttendees: 2500,
      },
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
        // More partners...
      ]
    },
  };
}