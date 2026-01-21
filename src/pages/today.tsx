import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import Header from '@/components/layout/Header';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Card from '@/components/today/Card';
import Hero from '@/components/today/Hero';
import ScheduleCard from '@/components/today/ScheduleCard';
import StickyActions from '@/components/today/StickyActions';
import TodaysSponsors from '@/components/today/TodaysSponsors';
import { Event, getEventById } from '@/sanity/queries';

interface TodayPageProps {
  upcomingEvent: Event | null;
}

export default function TodayPage({ upcomingEvent }: TodayPageProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ZurichJS Conf 2026 speakers data
  const confSpeakers = [
    {
      name: 'Daniel Roe',
      title: 'Nuxt Core Team Lead @ Vercel',
      avatar: 'https://svkbzhlrjujeteqjrckv.supabase.co/storage/v1/object/public/cfp-images/speakers/88af311d-3b9b-40f0-a6c7-bf8e64e72fbb/profile.png'
    },
    {
      name: 'Dominik Dorfmeister',
      title: 'Maintainer of TanStack Query @ Sentry',
      avatar: 'https://svkbzhlrjujeteqjrckv.supabase.co/storage/v1/object/public/cfp-images/speakers/52d2ca7b-9b1c-443e-868a-47e03ab0948b/profile.png'
    },
    {
      name: 'Ramona Schwering',
      title: 'GDE for Web Technologies @ Auth0',
      avatar: 'https://svkbzhlrjujeteqjrckv.supabase.co/storage/v1/object/public/cfp-images/speakers/9f322e13-eb71-4cd6-9108-5c3cbc913378/profile.png'
    },
    {
      name: 'Scott Tolinski',
      title: 'Co-Host of Syntax.fm @ Sentry',
      avatar: 'https://svkbzhlrjujeteqjrckv.supabase.co/storage/v1/object/public/cfp-images/speakers/1997857c-7093-44e6-88d6-87a4c33bb836/profile.png'
    },
    {
      name: 'Tejas Kumar',
      title: 'ConTejas Host @ IBM',
      avatar: 'https://svkbzhlrjujeteqjrckv.supabase.co/storage/v1/object/public/cfp-images/speakers/fc996038-c5cd-4029-bfd3-9c73fac48a75/profile.png'
    }
  ];

  const confTicketUrl = 'https://conf.zurichjs.com?utm_source=zurichjs&utm_medium=today_page&utm_campaign=conf_2026';

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
            {/* ZurichJS Conf 2026 - Top Priority */}
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
              data-section="conf"
            >
              <Card className="bg-gradient-to-br from-sky-600 via-blue-700 to-blue-900 border-0 shadow-xl">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🎉</span>
                    <span className="bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-1 rounded-full">
                      11 SEPT 2026
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                    ZurichJS Conf 2026
                  </h2>
                  <p className="text-blue-100 text-sm mb-2">
                    The first-ever ZurichJS Conference! 1 day, 1 track, world-renowned experts.
                  </p>
                  <p className="text-blue-200 text-xs mb-4">
                    Warm-up events & workshops included
                  </p>

                  {/* Speakers Grid */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {confSpeakers.map((speaker, index) => (
                      <div key={index} className="text-center">
                        <div className="w-12 h-12 mx-auto rounded-full bg-white/20 border-2 border-yellow-400/60 overflow-hidden mb-1">
                          <Image
                            src={speaker.avatar}
                            alt={speaker.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-blue-100 text-[10px] font-medium leading-tight truncate">
                          {speaker.name.split(' ')[0]}
                        </p>
                      </div>
                    ))}
                  </div>

                  <a
                    href={confTicketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-yellow-400 text-blue-900 font-bold py-3 px-4 rounded-xl text-center hover:bg-yellow-300 transition-colors shadow-lg"
                  >
                    Get Your Tickets Now →
                  </a>
                </div>
              </Card>
            </motion.div>

            {/* No Events Message */}
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-md mx-auto"
            >
              <Card className="text-center">
                <div className="text-6xl mb-4">🤔</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  No Upcoming Meetups
                </h1>
                <p className="text-gray-600 mb-4">
                  Looks like our JavaScript wizards are planning something epic!
                </p>
                <p className="text-sm text-gray-500">
                  Check back soon for our next amazing meetup!
                </p>
              </Card>
            </motion.div>

            {/* Today's Sponsors */}
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-4xl mx-auto"
              data-section="sponsors"
            >
              <Card>
                <TodaysSponsors />
              </Card>
            </motion.div>
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
          {/* ZurichJS Conf 2026 - Top Priority */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-section="conf"
          >
            <Card className="bg-gradient-to-br from-sky-600 via-blue-700 to-blue-900 border-0 shadow-xl">
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🎉</span>
                  <span className="bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-1 rounded-full">
                    11 SEPT 2026
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  ZurichJS Conf 2026
                </h2>
                <p className="text-blue-100 text-sm mb-2">
                  The first-ever ZurichJS Conference! 1 day, 1 track, world-renowned experts.
                </p>
                <p className="text-blue-200 text-xs mb-4">
                  Warm-up events & workshops included
                </p>

                {/* Speakers Grid */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {confSpeakers.map((speaker, index) => (
                    <div key={index} className="text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-white/20 border-2 border-yellow-400/60 overflow-hidden mb-1">
                        <Image
                          src={speaker.avatar}
                          alt={speaker.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-blue-100 text-[10px] font-medium leading-tight truncate">
                        {speaker.name.split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>

                <a
                  href={confTicketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-yellow-400 text-blue-900 font-bold py-3 px-4 rounded-xl text-center hover:bg-yellow-300 transition-colors shadow-lg"
                >
                  Get Your Tickets Now →
                </a>
              </div>
            </Card>
          </motion.div>

          {/* Hero */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <Card className="shadow-xl">
              <Hero event={upcomingEvent} />
            </Card>
          </motion.div>

          {/* Schedule */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            data-section="schedule"
          >
            <Card>
              <ScheduleCard event={upcomingEvent} />
            </Card>
          </motion.div>

          {/* Today's Sponsors */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            data-section="sponsors"
          >
            <Card>
              <TodaysSponsors />
            </Card>
          </motion.div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* ZurichJS Conf 2026 - Top Priority - full width */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-4 lg:col-span-6"
            data-section="conf"
          >
            <Card className="bg-gradient-to-br from-sky-600 via-blue-700 to-blue-900 border-0 shadow-xl">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎉</span>
                      <span className="bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-1 rounded-full">
                        11 SEPT 2026
                      </span>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">
                      ZurichJS Conf 2026
                    </h2>
                    <p className="text-blue-100 text-sm max-w-xl">
                      The first-ever ZurichJS Conference! 1 day, 1 track, world-renowned experts.
                    </p>
                    <p className="text-blue-200 text-xs mt-1">
                      Warm-up events & workshops included
                    </p>
                  </div>

                  {/* Speakers */}
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {confSpeakers.map((speaker, index) => (
                        <div
                          key={index}
                          className="w-14 h-14 rounded-full bg-white/20 border-2 border-yellow-400/60 overflow-hidden"
                          title={`${speaker.name} - ${speaker.title}`}
                        >
                          <Image
                            src={speaker.avatar}
                            alt={speaker.name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <a
                      href={confTicketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-400 text-blue-900 font-bold py-3 px-6 rounded-xl text-center hover:bg-yellow-300 transition-colors shadow-lg whitespace-nowrap"
                    >
                      Get Tickets →
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Hero - 2 columns on md, 3 on lg */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 lg:col-span-3"
          >
            <Card className="h-full">
              <Hero event={upcomingEvent} />
            </Card>
          </motion.div>

          {/* Schedule - 2 columns on md, 3 on lg */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-2 lg:col-span-3"
            data-section="schedule"
          >
            <Card className="h-full">
              <ScheduleCard event={upcomingEvent} />
            </Card>
          </motion.div>

          {/* Today's Sponsors - full width */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-4 lg:col-span-6"
            data-section="sponsors"
          >
            <Card>
              <TodaysSponsors />
            </Card>
          </motion.div>
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
    const nextEvent = await getEventById('jan-2026');

    return {
      props: {
        upcomingEvent: nextEvent
      },
      // Revalidate every 5 minutes to keep event data fresh
      revalidate: 300,
    };
  } catch (error) {
    console.error('Error fetching data:', error);

    return {
      props: {
        upcomingEvent: null
      },
      revalidate: 60, // Retry more frequently on error
    };
  }
}
