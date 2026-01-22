import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import Header from '@/components/layout/Header';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import ScheduleCard from '@/components/today/ScheduleCard';
import StickyActions from '@/components/today/StickyActions';
import TodayCard from '@/components/today/TodayCard';
import TodayHero from '@/components/today/TodayHero';
import TodaysSponsors from '@/components/today/TodaysSponsors';
import { Event, getEventById } from '@/sanity/queries';

interface TodayPageProps {
  upcomingEvent: Event// | null;
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

  return (
    <>
      <Header />
      <Section variant="gradient" padding="lg" className="min-h-screen pb-24 md:pb-8 pt-20 sm:pt-24 px-3 sm:px-4">
      <SEO
        title={`${upcomingEvent.title} - Today - ZurichJS`}
        description={upcomingEvent.description || `Join us today for ${upcomingEvent.title}`}
      />
      
      <div className="space-y-6 max-w-screen-xl mx-auto">
          {/* ZurichJS Conf 2026 - Top Priority - full width */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-section="conf"
          >
            <TodayCard className="!bg-black border-0">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-sm text-white mb-2">
                    11 SEPT 2026
                    </p>
                    <h2 className="text-3xl font-black text-white mb-2">
                      ZurichJS Conf 2026
                    </h2>
                    <p className="text-white text-sm max-w-xl">
                      The first-ever ZurichJS Conference! 1 day, 1 track, world-renowned experts.
                    </p>
                    <p className="text-blue-200 text-xs mt-1">
                      Warm-up events & workshops included
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:flex-row sm:items-center gap-4">
                    <div className="flex -space-x-3">
                      {confSpeakers.map((speaker, index) => (
                        <div
                          key={index}
                          className="w-14 h-14 rounded-full bg-white border-2 border-white overflow-hidden"
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
                      className="w-full sm:w-fit bg-yellow-400 font-bold py-3 px-6 rounded-xl text-center hover:bg-yellow-300 transition-colors shadow-lg whitespace-nowrap"
                    >
                      Grab your ticket
                    </a>
                  </div>
                </div>
              </div>
            </TodayCard>
          </motion.div>

          <div className="flex flex-col gap-6 md:flex-row">
              <motion.div
                initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="contents"
              >
                <TodayHero event={upcomingEvent} />
              </motion.div>

              <motion.div
                initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className=""
                data-section="schedule"
              >
                <TodayCard className="h-full">
                  <ScheduleCard event={upcomingEvent} />
                </TodayCard>
              </motion.div>
          </div>

          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className=""
            data-section="sponsors"
          >
            <TodayCard>
              <TodaysSponsors />
            </TodayCard>
          </motion.div>
      </div>

      {/* Sticky actions */}
      <StickyActions />
    </Section>
    </>
  );
}

export async function getStaticProps() {
  try {
    const upcomingEvent = await getEventById('jan-2026');

    return {
      props: {
        upcomingEvent,
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
