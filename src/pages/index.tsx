import Layout from '@/components/layout/Layout';
import AccountIncentives from '@/components/sections/AccountIncentives';
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
import type { Speaker } from '@/types';


// Using the imported Speaker type from @/types instead of local interface

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

      {/* Hero Section with Next Event and Workshop */}
      <LandingHero upcomingEvents={upcomingEvents} stats={stats} upcomingWorkshops={upcomingWorkshops} />

      {/* Account Incentives Section - Prominently placed */}
      <AccountIncentives />

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
  
  // Create a fair speaker selection
  const createFairSpeakerSelection = (speakers: Speaker[]) => {
    // If we have fewer than 12 speakers, return all
    if (speakers.length <= 12) {
      return speakers;
    }
    
    // Create a balanced selection favoring diversity over talk count
    const shuffledSpeakers = [...speakers];
    
    // Use a seeded random based on current week to ensure consistency during the week
    // but rotation weekly for fairness
    const currentWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
    const seed = currentWeek % 1000;
    
    // Simple seeded shuffle algorithm
    for (let i = shuffledSpeakers.length - 1; i > 0; i--) {
      const j = Math.floor(((seed * (i + 1)) % 1000) / 1000 * (i + 1));
      [shuffledSpeakers[i], shuffledSpeakers[j]] = [shuffledSpeakers[j], shuffledSpeakers[i]];
    }
    
    // Take first 12-15 speakers for the condensed grid
    return shuffledSpeakers.slice(0, Math.min(15, speakers.length));
  };

  const fairSpeakers = createFairSpeakerSelection(speakers);
  
  return {
    props: {
      upcomingEvents,
      featuredSpeakers: fairSpeakers,
      stats,
      partners,
      upcomingWorkshops
    },
  };
}
