import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';
import { GetStaticProps } from 'next';
import { getSpeakers } from '@/sanity/queries';
import type { Speaker } from '@/types';
import Section from "@/components/Section";

// Workshop data
const workshops = [
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
    speakerId: 'aleksej-dix'
  },
  {
    id: 'ai-workshop',
    title: 'Building AI-Powered JavaScript Applications',
    subtitle: 'From Basics to Production',
    description: 'Discover how to integrate modern AI capabilities into your JavaScript applications using popular frameworks and APIs.',
    dateInfo: 'TBD',
    timeInfo: 'TBD',
    locationInfo: 'TBD',
    maxAttendees: 15,
    image: '/images/workshops/ai-powered-js-apps.png',
    iconColor: '#7c3aed', // violet-600
    tag: '🚀 AI Workshop',
    speakerId: 'adele-kuzmiakova'
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
    speakerId: 'faris-aziz'
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
            className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black">ZurichJS Workshops</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-800">
            Hands-on learning experiences to level up your JavaScript skills
          </p>
        </motion.div>
      </Section>

      <Section variant="white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="relative h-48 md:h-64 lg:h-72 overflow-hidden">
                      <div className="absolute top-4 left-4 z-10">
                      </div>
                      <div
                          className={`w-full h-full transition-transform duration-500 ${
                              hoveredWorkshop === workshop.id ? 'scale-110' : 'scale-100'
                          }`}
                      >
                        <Image 
                          src={workshop.image}
                          alt={workshop.title}
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                    </div>

                    <div className="p-4 md:p-6 flex flex-col flex-grow">
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold mb-1 text-gray-900">{workshop.title}</h2>
                        <p className="text-sm md:text-md font-medium mb-3 md:mb-5 text-gray-600">{workshop.subtitle}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-5">
                          <div className="flex items-center bg-gray-50 px-2 py-2 rounded-lg text-xs md:text-sm border border-gray-100">
                            <Calendar size={14} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700">{workshop.dateInfo}</span>
                          </div>
                          <div className="flex items-center bg-gray-50 px-2 py-2 rounded-lg text-xs md:text-sm border border-gray-100">
                            <Clock size={14} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700">{workshop.timeInfo}</span>
                          </div>
                          <div className="flex items-center bg-gray-50 px-2 py-2 rounded-lg text-xs md:text-sm border border-gray-100">
                            <MapPin size={14} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700">{workshop.locationInfo}</span>
                          </div>
                          <div className="flex items-center bg-gray-50 px-2 py-2 rounded-lg text-xs md:text-sm border border-gray-100">
                            <Users size={14} className="mr-1 md:mr-2 text-yellow-600 flex-shrink-0" />
                            <span className="text-gray-700">Max {workshop.maxAttendees}</span>
                          </div>
                        </div>

                        <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 line-clamp-2 min-h-[2.5rem] md:min-h-[3rem]">
                          {workshop.description}
                        </p>
                      </div>

                      <div className="border-t border-gray-100 pt-3 md:pt-5 mt-auto flex items-center justify-between">
                        {speaker && (
                            <div className="flex items-center">
                              <div className="relative mr-2 md:mr-3 w-8 h-8 md:w-12 md:h-12 overflow-hidden rounded-full border-2 border-yellow-500">
                                <Image
                                    src={speaker.image}
                                    alt={speaker.name}
                                    fill
                                    className="object-cover"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs md:text-sm text-gray-900">{speaker.name}</span>
                                <span className="text-xs text-gray-500">Instructor</span>
                              </div>
                            </div>
                        )}

                        <div className={`text-yellow-600 font-bold text-xs md:text-base flex items-center transition-transform duration-300 ${
                            hoveredWorkshop === workshop.id ? 'translate-x-1' : ''
                        }`}>
                          View Details <ArrowRight size={16} className="ml-1" />
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
          <h2 className="text-3xl font-bold mb-4">Ready to Level Up Your Skills? 🚀</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Our workshops are designed to provide practical, hands-on learning experiences that you can immediately apply to your projects.
          </p>

          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link
                href="/events"
                className="bg-transparent border-2 border-js px-8 py-3 rounded-lg font-bold transition-colors"
            >
              View All Events
            </Link>
            <Link
                href="/contact"
                className="bg-js text-black px-8 py-3 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
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
