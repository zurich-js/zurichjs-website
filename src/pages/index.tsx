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
import { getStats, getUpcomingEvents } from '@/sanity/queries';


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
                  <Button href="/events" variant="primary" size="lg">
                    Join Next Meetup 🎉
                  </Button>
                  <Button href="/cfp" variant="secondary" size="lg">
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
                {/* ZurichJS Logo Animation */}
                <svg width="100%" height="100%" viewBox="0 0 750 749" className="drop-shadow-lg" aria-label="ZurichJS Logo">
                  <motion.path
                    d="M747.5 1.50018L747.5 749L0.5 748.999L747.5 1.50018Z"
                    fill="#F1E271"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                  <motion.path
                    d="M0.5 749V1.5L374 375.5L0.5 749Z"
                    fill="#248BCC"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut", delay: 0.3 }}
                  />
                  <motion.path
                    d="M748 1.5L374 375.5L0.5 1.5H748Z"
                    fill="white"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut", delay: 0.6 }}
                  />
                  <motion.path
                    d="M376 643L414 620C419.5 629 429.5 647 448.5 644C467.5 641 469.5 629 469.5 620V455H516C516.333 510 517 613.858 517 621.5C517 642 504.5 686 449 686C400 686 383 658 376 643Z"
                    fill="black"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut", delay: 0.9 }}
                  />
                  <motion.path
                    d="M580.5 616L542 638C547.5 647.333 560 666.417 582 676.5C606 687.5 643.5 690 669.5 678C692.515 667.378 706 646 706 622.5C706 595 699.5 571.5 653 551C615.5 534.468 602.5 530 602.5 513.5C602.5 508.5 605.5 493 627 493C644 493 652.5 506.5 655.5 513.5L692.5 489.5C684.5 476.5 668 452 627 452C586 452 556 476.5 556 513.5C556 550.5 579.615 572.667 619 587.5C657.5 602 659 613.199 659 620C659 627.5 654 644.5 627.5 644.5C600 644.5 585.667 625.667 580.5 616Z"
                    fill="black"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut", delay: 1.2 }}
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

export async function getServerSideProps() {
  // This would be replaced with actual CMS fetching

  const stats = await getStats();
  const upcomingEvents = await getUpcomingEvents();

  return {
    props: {
      upcomingEvents,
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
      stats,
      partners: [
        {
          id: '1',
          name: 'Ginetta',
          logo: '/images/partners/ginetta.png',
          url: 'https://ginetta.net',
        },
        {
          id: '2',
          name: 'Novu AG',
          logo: '/images/partners/novu.png',
          url: 'https://novu.ch/',
        },
        {
          id: '3',
          name: 'Get Your Guide',
          logo: '/images/partners/get-your-guide.png',
          url: 'https://www.gyg.com/',
        },
        {
          id: '4',
          name: 'Smallpdf',
          logo: '/images/partners/smallpdf.png',
          url: 'https://smallpdf.com',
        },
        {
          id: '5',
          name: 'React Paris',
          logo: '/images/partners/react-paris.png',
          url: 'https://reactparis.com/',
        },
        {
          id: '6',
          name: 'Code Blossom',
          logo: '/images/partners/code-blossom.png',
          url: 'https://www.code-blossom.com/',
        },
        {
          id: '7',
          name: 'CityJS',
          logo: '/images/partners/city-js.png',
          url: 'https://cityjsconf.org/',
        },
        {
          id: '8',
          name: 'Grusp',
          logo: '/images/partners/grusp.png',
          url: 'https://www.grusp.org/',
        },
      ]
    },
  };
}