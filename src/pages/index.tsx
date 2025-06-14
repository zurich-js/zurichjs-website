import Layout from '@/components/layout/Layout';
import RafflePopup from '@/components/RafflePopup';
import CommunityValues from '@/components/sections/CommunityValues';
import JoinCTA from '@/components/sections/JoinCTA';
import LandingHero from "@/components/sections/LandingHero";
import Partners from '@/components/sections/Partners';
import SpeakerGrid from '@/components/sections/SpeakerGrid';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import UpcomingWorkshops from '@/components/sections/UpcomingWorkshops';
import type { Workshop } from '@/components/sections/UpcomingWorkshops';
import SEO from '@/components/SEO';
import { getPartners } from '@/data';
import { getUpcomingWorkshops } from '@/data/workshops';
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
  upcomingWorkshops: Workshop[];
}

export default function Home({ upcomingEvents, featuredSpeakers, stats, partners, upcomingWorkshops }: HomeProps) {
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

      {/* Upcoming Workshops Section */}
      <UpcomingWorkshops workshops={upcomingWorkshops} />

      {/* Community Values Section */}
      <CommunityValues />

      {/* Featured Speakers */}
      <SpeakerGrid speakers={featuredSpeakers} />

      {/* Partners Section */}
      <Partners partners={partners} />

      {/* Join CTA */}
      <JoinCTA />

      {/* Raffle Popup */}
      <RafflePopup />
    </Layout>
  );
}

export async function getStaticProps() {
  // This would be replaced with actual CMS fetching

  const stats = await getStats();
  const upcomingEvents = await getUpcomingEvents();
  const speakers = await getSpeakers({ shouldFilterVisible: true });
  const partners = getPartners();
  const upcomingWorkshops = getUpcomingWorkshops();
  
  return {
    props: {
      upcomingEvents,
      featuredSpeakers: speakers.slice(0, 3),
      stats,
      partners,
      upcomingWorkshops
    },
  };
}
