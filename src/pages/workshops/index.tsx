import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, ArrowRight } from 'lucide-react';
import { GetStaticProps } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import Layout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import { getSpeakers } from '@/sanity/queries';
import type { Speaker } from '@/types';

// Define workshop state type
type WorkshopState = 'confirmed' | 'interest';

// Workshop data
const workshops = [
  {
    id: 'laravel-reverb',
    title: 'From Scratch to Real-Time with Laravel & Reverb',
    subtitle: 'Building a mini-project tracker with Laravel',
    description: 'Learn to build a functional mini-project tracker app with real-time features using Laravel & Reverb. Perfect for developers new to Laravel or those with early-intermediate level experience.',
    dateInfo: 'July 23, 2025',
    timeInfo: '17:30 - 21:30',
    locationInfo: 'Zürich (Venue TBD)',
    maxAttendees: 15,
    image: '/images/workshops/laravel-reverb.png',
    iconColor: '#ef4444', // red-500
    tag: '⚡ Real-Time Web',
    speakerId: 'bert-de-swaef',
    state: 'confirmed' as WorkshopState
  },
  {
    id: 'astro-zero-to-hero',
    title: 'Astro: Zero to Hero',
    subtitle: 'Build High-Performance Websites with Astro',
    description: "Master Astro's Island Architecture in this intensive 4-hour workshop. Learn to build lightning-fast websites that ship zero JavaScript by default and integrate with your favorite frameworks.",
    dateInfo: 'July 23, 2025',
    timeInfo: '17:30 - 21:30',
    locationInfo: 'Zürich (Venue TBD)',
    maxAttendees: 15,
    image: '/images/workshops/astro-zero-to-hero.png',
    iconColor: '#0284c7', // sky-600
    tag: '🚀 Web Performance',
    speakerId: 'elian-van-cutsem',
    state: 'confirmed' as WorkshopState
  },
  {
    id: 'accessibility-fundamentals',
    title: 'Web Accessibility Fundamentals',
    subtitle: 'Building Inclusive Digital Experiences',
    description: 'Learn how to create accessible web applications that comply with WCAG standards and the European Accessibility Act.',
    dateInfo: 'TBD',
    timeInfo: 'TBD',
    locationInfo: 'TBD',
    maxAttendees: 15,
    image: '/images/workshops/web-accessibility.png',
    iconColor: '#0284c7', // sky-600
    tag: '🌐 Accessibility',
    speakerId: 'aleksej-dix',
    state: 'interest' as WorkshopState
  },
  {
    id: 'react-performance',
    title: 'React & Next.js Performance Optimization',
    subtitle: 'Strategies for Blazing Fast Applications',
    description: 'Master advanced techniques to optimize your React and Next.js applications for maximum performance and user experience.',
    dateInfo: 'TBD',
    timeInfo: 'TBD',
    locationInfo: 'TBD',
    maxAttendees: 15,
    image: '/images/workshops/react-performance.png',
    iconColor: '#2563eb', // blue-600
    tag: '🚀 React & Next.js Performance Foundations',
    speakerId: 'faris-aziz',
    state: 'interest' as WorkshopState
  },
];

interface WorkshopsPageProps {
  speakers: Speaker[];
}

export default function WorkshopsPage({ speakers }: WorkshopsPageProps) {
  const [hoveredWorkshop, setHoveredWorkshop] = useState<string | null>(null);

  // Create a map of speakers by ID for easy lookup
  const speakersMap = speakers.reduce((map, speaker) => {
    map[speaker.id] = speaker;
    return map;
  }, {} as Record<string, Speaker>);

  // Function to render workshop state badge
  const renderWorkshopStateBadge = (state: WorkshopState) => {
    if (state === 'confirmed') {
      return (
        <span className="absolute bottom-3 right-3 z-20 bg-zurich text-white px-2 py-1 rounded-lg text-xs font-bold shadow-md backdrop-blur-sm bg-opacity-90 border border-zurich/70">
          <span className="flex items-center">🎟️ Confirmed</span>
        </span>
      );
    } else if (state === 'interest') {
      return (
        <span className="absolute bottom-3 right-3 z-20 bg-black text-js px-2 py-1 rounded-lg text-xs font-bold shadow-md backdrop-blur-sm bg-opacity-90 border border-js/50">
          <span className="flex items-center">📋 Coming Soon</span>
        </span>
      );
    }
    return null;
  };

  return (
    <Layout>
      <SEO
        title="JavaScript Workshops | ZurichJS"
        description="Join our hands-on JavaScript workshops covering React, Vue, accessibility, AI integration, and more. Limited spots available!"
        openGraph={{
          title: "JavaScript Workshops | ZurichJS",
          description: "Join our hands-on JavaScript workshops covering React, Vue, accessibility, AI integration, and more. Limited spots available!",
          type: 'website',
          image: '/images/og-workshops.jpg',
          url: '/workshops'
        }}
      />

      <Section variant="gradient" padding="lg">
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-between"
        >
          <div className="lg:w-2/3 w-full">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 text-black">ZurichJS Workshops</h1>
            <p className="text-lg md:text-2xl text-gray-800">
              Hands-on learning experiences to level up your JavaScript skills
            </p>
          </div>
          
          <div className="lg:w-1/3 w-full">
            <div className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border-2 border-zurich shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-zurich/10 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zurich">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h3 className="font-bold text-zurich text-lg sm:text-xl">Need Financial Support?</h3>
              </div>
              <p className="text-gray-800 mb-4 text-sm sm:text-base">
                Don&apos;t let cost be a barrier to learning. We offer scholarships, discounts, and special rates for underrepresented groups, career changers, and those with accessibility needs.
              </p>
              <a 
                href="mailto:hello@zurichjs.com" 
                className="inline-flex items-center gap-2 bg-zurich text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold hover:bg-zurich/90 transition-colors w-full justify-center text-base sm:text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="truncate">Get in Touch for Support Options</span>
              </a>
            </div>
          </div>
        </motion.div>
      </Section>

      <Section variant="white">
        <div className="mb-6 md:mb-8 flex flex-wrap gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 w-full">
            <div className="flex flex-col xs:flex-row gap-3 justify-start">
              <div className="flex items-center gap-2">
                <div className="bg-zurich text-white px-2 py-1 rounded-md text-xs font-bold flex items-center">
                  <span>🎟️ Confirmed</span>
                </div>
                <span className="text-gray-600 text-xs sm:text-sm">Ready to book tickets now</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-black text-js px-2 py-1 rounded-md text-xs font-bold flex items-center">
                  <span>📋 Coming Soon</span>
                </div>
                <span className="text-gray-600 text-xs sm:text-sm">Join waitlist to make it happen</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {workshops.map((workshop, index) => {
            const speaker = speakersMap[workshop.speakerId];

            return (
                <motion.div
                    key={workshop.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow duration-300"
                    onMouseEnter={() => setHoveredWorkshop(workshop.id)}
                    onMouseLeave={() => setHoveredWorkshop(null)}
                >
                  <Link href={`/workshops/${workshop.id}`} className="block h-full flex flex-col">
                    <div className="relative h-40 md:h-56 lg:h-64 overflow-hidden">
                      {renderWorkshopStateBadge(workshop.state)}
                      <div
                          className={`w-full h-full transition-transform duration-500 ${
                              hoveredWorkshop === workshop.id ? 'scale-110' : 'scale-100'
                          }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-[1]"></div>
                        <Image 
                          src={workshop.image}
                          alt={workshop.title}
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                    </div>

                    <div className="p-3 md:p-5 flex flex-col flex-grow">
                      <div>
                        <h2 className="text-lg md:text-2xl font-bold mb-1 text-gray-900">{workshop.title}</h2>
                        <p className="text-xs md:text-md font-medium mb-2 md:mb-4 text-gray-600">{workshop.subtitle}</p>

                        <div className="grid grid-cols-2 gap-2 mb-3 md:mb-5">
                          <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs md:text-sm border border-gray-100">
                            <Calendar size={12} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700 text-xs truncate">{workshop.dateInfo}</span>
                          </div>
                          <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs md:text-sm border border-gray-100">
                            <Clock size={12} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700 text-xs truncate">{workshop.timeInfo}</span>
                          </div>
                          <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs md:text-sm border border-gray-100">
                            <MapPin size={12} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700 text-xs truncate">{workshop.locationInfo}</span>
                          </div>
                          <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs md:text-sm border border-gray-100">
                            <Users size={12} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700 text-xs truncate">Max {workshop.maxAttendees}</span>
                          </div>
                        </div>

                        <p className="text-xs md:text-base text-gray-600 mb-3 md:mb-5 line-clamp-2 min-h-[2rem] md:min-h-[3rem]">
                          {workshop.description}
                        </p>
                      </div>

                      <div className="border-t border-gray-100 pt-3 md:pt-4 mt-auto flex items-center justify-between">
                        {speaker && (
                            <div className="flex items-center">
                              <div className="relative mr-2 md:mr-3 w-7 h-7 md:w-10 md:h-10 overflow-hidden rounded-full border-2 border-yellow-500">
                                <Image
                                    src={`${speaker.image}?h=100`}
                                    alt={speaker.name}
                                    fill
                                    className="object-cover"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs md:text-sm text-gray-900">{speaker.name}</span>
                                <span className="text-[10px] md:text-xs text-gray-500">Instructor</span>
                              </div>
                            </div>
                        )}

                        <div className={`text-yellow-600 font-bold text-xs md:text-sm flex items-center transition-transform duration-300 ${
                            hoveredWorkshop === workshop.id ? 'translate-x-1' : ''
                        }`}>
                          {workshop.state === 'confirmed' ? (
                            <span>Buy Tickets <ArrowRight size={14} className="ml-1" /></span>
                          ) : (
                            <span>Join Waitlist <ArrowRight size={14} className="ml-1" /></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
            )})}
        </div>
      </Section>

      <Section variant="black" padding="lg">
        <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5}}
            className="text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Ready to Level Up Your Skills? 🚀</h2>
          <p className="text-base md:text-xl mb-6 md:mb-8 max-w-3xl mx-auto">
            Our workshops are designed to provide practical, hands-on learning experiences that you can immediately apply to your projects.
          </p>

          <div className="flex flex-col xs:flex-row gap-3 md:gap-4 justify-center">
            <Link
                href="/events"
                className="bg-transparent border-2 border-js px-5 md:px-8 py-2 md:py-3 rounded-lg font-bold transition-colors text-sm md:text-base"
            >
              View All Events
            </Link>
            <Link
                href="/contact"
                className="bg-js text-black px-5 md:px-8 py-2 md:py-3 rounded-lg font-bold text-sm md:text-lg hover:bg-yellow-300 transition-colors"
            >
              Request Custom Workshop
            </Link>
          </div>
        </motion.div>
      </Section>

    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const speakers = await getSpeakers({shouldFilterVisible: false});

  return {
    props: {
      speakers
    },
    revalidate: 60 * 60 // Revalidate every hour
  };
};
