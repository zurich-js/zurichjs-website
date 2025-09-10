import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

import Header from '@/components/layout/Header';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Card from '@/components/today/Card';
import Hero from '@/components/today/Hero';
import ScheduleCard from '@/components/today/ScheduleCard';
import StickyActions from '@/components/today/StickyActions';
import WorkshopDeals from '@/components/today/WorkshopDeals';
import { getUpcomingEvents, Event, getSpeakerById } from '@/sanity/queries';
import { Speaker } from '@/types';

interface TodayPageProps {
  upcomingEvent: Event | null;
  speakers: {
    observabilitySpeakers: Speaker[];
    aiDesignSpeakers: Speaker[];
  };
}

export default function TodayPage({ upcomingEvent, speakers }: TodayPageProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create workshop deals data
  const createWorkshopDeals = (event?: Event | null, speakerData?: { observabilitySpeakers: Speaker[]; aiDesignSpeakers: Speaker[]; }) => {
    let dealExpiry = new Date();
    
    if (event) {
      // Deal expires 24 hours after the meetup ends
      const meetupDate = new Date(event.datetime);
      const meetupEndTime = new Date(meetupDate.getTime() + 4 * 60 * 60 * 1000); // Assume 4 hour meetup
      dealExpiry = new Date(meetupEndTime.getTime() + 24 * 60 * 60 * 1000); // +24 hours
    } else {
      // If no event, set to 7 days from now for demo purposes
      dealExpiry.setDate(dealExpiry.getDate() + 7);
    }

    return [
      {
        id: 'observability-dynatrace',
        title: 'Observability in Action: Hands-On with Dynatrace',
        subtitle: 'Master Modern System Observability & Monitoring',
        description: 'Learn to master modern observability with hands-on experience using Dynatrace. This workshop will teach you the three pillars of observability - metrics, logs, and traces - through practical exercises with the AstroShop application.',
        dateInfo: 'October 28, 2025',
        timeInfo: '16:00 - 18:00',
        locationInfo: 'Venue TBA, Zürich',
        maxAttendees: 25,
        workshopHref: '/workshops/observability-dynatrace',
        couponCode: 'dynatrace-deal',
        discount: '40%',
        discountPercentage: 40,
        tag: '📊 Observability & Monitoring',
        iconColor: '#f97316',
        expiresAt: dealExpiry,
        instructors: speakerData?.observabilitySpeakers?.map(speaker => ({
          id: speaker.id,
          name: speaker.name,
          title: speaker.title || 'Workshop Instructor',
          image: speaker.image
        })) || []
      },
      {
        id: 'ai-design-patterns-2026',
        title: 'Design Patterns For AI Interfaces In 2026',
        subtitle: 'Master AI UX Design & Build Better User Experiences',
        description: 'Master modern AI interface design through practical patterns that go beyond chatbots, creating experiences that help users articulate intent and get work done faster. Full-day intensive workshop with Vitaly Friedman.',
        dateInfo: 'March 23, 2026',
        timeInfo: '09:00 - 17:00',
        locationInfo: 'Venue TBA, Zürich',
        maxAttendees: 30,
        workshopHref: '/workshops/ai-design-patterns-2026',
        couponCode: 'ai-design-deal',
        discount: '30%',
        discountPercentage: 30,
        tag: '🧠 AI Interface Design',
        iconColor: '#f59e0b',
        expiresAt: dealExpiry,
        instructors: speakerData?.aiDesignSpeakers?.map(speaker => ({
          id: speaker.id,
          name: speaker.name,
          title: speaker.title || 'Workshop Instructor',
          image: speaker.image
        })) || []
      }
    ];
  };

  const workshopDeals = createWorkshopDeals(upcomingEvent, speakers);

  if (!upcomingEvent) {
    return (
      <>
        <Header />
        <Section variant="gradient" padding="lg" className="min-h-screen pb-24 md:pb-8 pt-20 sm:pt-24 px-3 sm:px-4">
          <SEO
            title="Today - ZurichJS"
            description="Your hub for today's ZurichJS event and exclusive workshop deals"
          />
          
          <div className="space-y-4">
            {/* No Events Message */}
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md mx-auto"
            >
              <Card className="text-center">
                <div className="text-6xl mb-4">🤔</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  No Upcoming Events
                </h1>
                <p className="text-gray-600 mb-4">
                  Looks like our JavaScript wizards are planning something epic! ✨
                </p>
                <p className="text-sm text-gray-500">
                  Check back soon for our next amazing meetup! 🚀
                </p>
              </Card>
            </motion.div>

            {/* Workshop Deals - Still show even without events */}
            {createWorkshopDeals(null, speakers) && createWorkshopDeals(null, speakers).length > 0 && (
              <motion.div
                initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-6xl mx-auto"
                data-section="deals"
              >
                <Card>
                  <WorkshopDeals deals={createWorkshopDeals(null, speakers)} />
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sticky actions */}
          <StickyActions />
        </Section>
      </>
    );
  }

  return (
    <>
      <Header />
      <Section variant="gradient" padding="lg" className="min-h-screen pb-24 md:pb-8 pt-20 sm:pt-24 px-3 sm:px-4">
      <SEO
        title={`${upcomingEvent.title} - Today - ZurichJS`}
        description={upcomingEvent.description || `Join us today for ${upcomingEvent.title}`}
      />
      
      <div className="space-y-3 sm:space-y-4">
        {/* Mobile Layout */}
        <div className="md:hidden space-y-3 sm:space-y-4">
          {/* Hero */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-xl">
              <Hero event={upcomingEvent} />
            </Card>
          </motion.div>
          
          {/* Workshop Deals - Prioritized */}
          {workshopDeals && workshopDeals.length > 0 && (
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              data-section="deals"
            >
              <Card>
                <WorkshopDeals deals={workshopDeals} />
              </Card>
            </motion.div>
          )}
          
          
          
          {/* Schedule - moved after actions */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            data-section="schedule"
          >
            <Card>
              <ScheduleCard event={upcomingEvent} />
            </Card>
          </motion.div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Hero - 2 columns on md, 3 on lg */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 lg:col-span-3"
          >
            <Card className="h-full">
              <Hero event={upcomingEvent} />
            </Card>
          </motion.div>
          
          {/* Schedule - 2 columns on md, 3 on lg - prioritized on desktop */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 lg:col-span-3"
            data-section="schedule"
          >
            <Card className="h-full">
              <ScheduleCard event={upcomingEvent} />
            </Card>
          </motion.div>
          
          {/* Workshop Deals - full width second row */}
          {workshopDeals && workshopDeals.length > 0 && (
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-4 lg:col-span-6"
              data-section="deals"
            >
              <Card>
                <WorkshopDeals deals={workshopDeals} />
              </Card>
            </motion.div>
          )}
          
        </div>
      </div>

      {/* Sticky actions */}
      <StickyActions />
    </Section>
    </>
  );
}

export async function getStaticProps() {
  try {
    const upcomingEvents = await getUpcomingEvents();
    const nextEvent = upcomingEvents[0] || null;

    // Fetch speaker data for workshops
    const observabilitySpeakerIds = ['indermohan-singh', 'speaker-e9fed3d8-151c-422f-9e43-bd20160183a6'];
    const aiDesignSpeakerIds = ['vitaly-friedman'];

    const [observabilitySpeakers, aiDesignSpeakers] = await Promise.all([
      Promise.all(observabilitySpeakerIds.map(id => getSpeakerById(id))).then(speakers => speakers.filter(Boolean) as Speaker[]),
      Promise.all(aiDesignSpeakerIds.map(id => getSpeakerById(id))).then(speakers => speakers.filter(Boolean) as Speaker[])
    ]);

    return {
      props: {
        upcomingEvent: nextEvent,
        speakers: {
          observabilitySpeakers,
          aiDesignSpeakers
        }
      },
      // Revalidate every 5 minutes to keep event data fresh
      revalidate: 300,
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    
    return {
      props: {
        upcomingEvent: null,
        speakers: {
          observabilitySpeakers: [],
          aiDesignSpeakers: []
        }
      },
      revalidate: 60, // Retry more frequently on error
    };
  }
}
