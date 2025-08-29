import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

import Header from '@/components/layout/Header';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Card from '@/components/today/Card';
import DealCard from '@/components/today/DealCard';
import Hero from '@/components/today/Hero';
import QuickActions from '@/components/today/QuickActions';
import ScheduleCard from '@/components/today/ScheduleCard';
import SponsorCard from '@/components/today/SponsorCard';
import StickyActions from '@/components/today/StickyActions';
import { getUpcomingWorkshops } from '@/data/workshops';
import { getUpcomingEvents, Event } from '@/sanity/queries';

interface TodayPageProps {
  upcomingEvent: Event | null;
}

export default function TodayPage({ upcomingEvent }: TodayPageProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create deal for upcoming workshop (50% off, valid 24h after meetup)
  const createMeetupDeal = (event: Event) => {
    const workshops = getUpcomingWorkshops();
    const nextWorkshop = workshops[0]; // Get the next confirmed workshop
    
    if (!nextWorkshop) return null;

    // Deal expires 24 hours after the meetup ends
    const meetupDate = new Date(event.datetime);
    const meetupEndTime = new Date(meetupDate.getTime() + 4 * 60 * 60 * 1000); // Assume 4 hour meetup
    const dealExpiry = new Date(meetupEndTime.getTime() + 24 * 60 * 60 * 1000); // +24 hours

    return {
      title: `50% Off ${nextWorkshop.title}`,
      description: `Exclusive meetup attendee discount for our upcoming workshop`,
      workshopHref: `/workshops/${nextWorkshop.id}`,
      expiresAt: dealExpiry,
      discount: "50%"
    };
  };

  const deal = upcomingEvent ? createMeetupDeal(upcomingEvent) : null;

  if (!upcomingEvent) {
    return (
      <Section variant="gradient" padding="lg">
        <SEO
          title="Today - ZurichJS"
          description="Your hub for today's ZurichJS event"
        />
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
      </Section>
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
          
          {/* Deal of the Day - Prioritized */}
          {deal && (
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <DealCard deal={deal} />
            </motion.div>
          )}
          
          {/* Schedule - Prioritized for mobile */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <ScheduleCard event={upcomingEvent} />
            </Card>
          </motion.div>
          
          {/* Two column grid for actions and connect - moved after schedule */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full">
                <QuickActions event={upcomingEvent} />
              </Card>
            </motion.div>
            
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="h-full">
                <SponsorCard event={upcomingEvent} />
              </Card>
            </motion.div>
          </div>
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
          >
            <Card className="h-full">
              <ScheduleCard event={upcomingEvent} />
            </Card>
          </motion.div>
          
          {/* Deal of the Day - full width second row */}
          {deal && (
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-4 lg:col-span-6"
            >
              <DealCard deal={deal} />
            </motion.div>
          )}
          
          {/* Actions and Connect - 2 columns each on md, 3 each on lg */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-2 lg:col-span-3"
          >
            <Card className="h-full">
              <QuickActions event={upcomingEvent} />
            </Card>
          </motion.div>
          
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-2 lg:col-span-3"
          >
            <Card className="h-full">
              <SponsorCard event={upcomingEvent} />
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Sticky mobile actions */}
      <StickyActions event={upcomingEvent} />
    </Section>
    </>
  );
}

export async function getStaticProps() {
  try {
    const upcomingEvents = await getUpcomingEvents();
    const nextEvent = upcomingEvents[0] || null;

    return {
      props: {
        upcomingEvent: nextEvent
      },
      // Revalidate every 5 minutes to keep event data fresh
      revalidate: 300,
    };
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    
    return {
      props: {
        upcomingEvent: null
      },
      revalidate: 60, // Retry more frequently on error
    };
  }
}
