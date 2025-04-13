import Layout from '@/components/layout/Layout';
import CommunityValues from '@/components/sections/CommunityValues';
import JoinCTA from '@/components/sections/JoinCTA';
import LandingHero from "@/components/sections/LandingHero";
import Partners from '@/components/sections/Partners';
import SpeakerGrid from '@/components/sections/SpeakerGrid';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import SEO from '@/components/SEO';
import { getPartners } from '@/data';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import type { Event } from '@/sanity/queries';
import { getSpeakers, getStats, getUpcomingEvents } from '@/sanity/queries';


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

      {/* Hero Section */}
      <LandingHero upcomingEvents={upcomingEvents} stats={stats} />


      {/* Upcoming Events Section */}
      <UpcomingEvents events={upcomingEvents} />

      {/* Community Values Section */}
      <CommunityValues />

      {/* Featured Speakers */}
      <SpeakerGrid speakers={featuredSpeakers} />

      {/* Partners Section */}
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
