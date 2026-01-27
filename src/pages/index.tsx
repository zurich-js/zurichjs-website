import Layout from '@/components/layout/Layout';
import CommunityValues from '@/components/sections/CommunityValues';
import JoinCTA from '@/components/sections/JoinCTA';
import LandingHero from "@/components/sections/LandingHero";
import Partners from '@/components/sections/Partners';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import UpcomingWorkshops from '@/components/sections/UpcomingWorkshops';
import type { Workshop } from '@/components/sections/UpcomingWorkshops';
import SEO from '@/components/SEO';
import { getPartners } from '@/data';
import { getUpcomingWorkshops } from '@/data/workshops';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import type { Event } from '@/sanity/queries';
import { getSpeakers, getSpeakerById, getStats, getUpcomingEvents } from '@/sanity/queries';
import type { Speaker } from '@/types';
import { generateHomePageStructuredData } from '@/utils/structuredData';

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
  speakers: Speaker[];
  stats: StatsData;
  partners: Partner[];
  upcomingWorkshops: Workshop[];
}

export default function Home({ upcomingEvents, speakers, stats, partners, upcomingWorkshops }: HomeProps) {
  useReferrerTracking();

  const structuredData = generateHomePageStructuredData();

  return (
    <Layout>
      <SEO
        title="ZurichJS | JavaScript & TypeScript Meetup Community in Zurich, Switzerland"
        description="Join ZurichJS, the premier JavaScript and TypeScript community in Zurich. Free meetups, expert speakers, workshops on React, Node.js, Vue, Angular, AI, and modern web development. Networking events for developers in Zurich, Switzerland, and nearby German cities."
        keywords={[
          'JavaScript Zurich',
          'TypeScript Zurich',
          'Web Development Zurich',
          'React Meetup Zurich',
          'Node.js Zurich',
          'Frontend Development Zurich',
          'Tech Meetup Zurich',
          'Programming Events Zurich',
          'Software Engineering Zurich',
          'Developer Community Switzerland',
          'Vue.js Zurich',
          'Angular Zurich',
          'AI Zurich',
          'Machine Learning Zurich',
          'Winterthur JavaScript',
          'Basel JavaScript',
          'Konstanz JavaScript',
          'St. Gallen JavaScript',
          'Tech Events Switzerland',
        ]}
        geo={{
          region: 'CH-ZH',
          placename: 'Zurich',
          position: '47.3769;8.5417',
        }}
        structuredData={structuredData}
        openGraph={{
          title: "ZurichJS | Premier JavaScript & TypeScript Community in Zurich",
          description: "Join Zurich's vibrant JavaScript and TypeScript community. Free meetups, expert speakers, workshops, and networking events for web developers in Switzerland and nearby German cities.",
          image: 'https://zurichjs.com/api/og/home',
          type: 'website',
          url: 'https://zurichjs.com',
        }}
        twitter={{
          cardType: 'summary_large_image',
          site: '@zurichjs',
        }}
      />

      {/* Hero Section */}
      <LandingHero upcomingEvents={upcomingEvents} stats={stats} upcomingWorkshops={upcomingWorkshops} speakers={speakers} />


      {/* Upcoming Events Section */}
      <UpcomingEvents events={upcomingEvents} />

      {/* Upcoming Workshops Section */}
      <UpcomingWorkshops workshops={upcomingWorkshops} />

      {/* Community Values Section */}
      <CommunityValues />


      {/* Partners Section */}
      <Partners partners={partners} />

      {/* Join CTA */}
      <JoinCTA />
    </Layout>
  );
}

export async function getServerSideProps() {
  const stats = await getStats();
  const upcomingEvents = await getUpcomingEvents();
  const speakers = await getSpeakers({ shouldFilterVisible: true });
  const partners = getPartners();
  const upcomingWorkshops = getUpcomingWorkshops();

  // Fetch speaker data for each workshop
  const workshopsWithSpeakers = await Promise.all(
    upcomingWorkshops.map(async (workshop) => {
      const speaker = await getSpeakerById(workshop.speakerId);
      return {
        ...workshop,
        speaker
      };
    })
  );

  return {
    props: {
      upcomingEvents,
      speakers: speakers,
      stats,
      partners,
      upcomingWorkshops: workshopsWithSpeakers,
    },
  };
}
