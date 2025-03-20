import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, ArrowRight, Accessibility, Brain, Rocket, Layers } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';
import { GetStaticProps } from 'next';
import { getSpeakers } from '@/sanity/queries';
import type { Speaker } from '@/types';

// Workshop data
const workshops = [
  {
    id: 'accessibility-fundementals',
    title: 'Web Accessibility Fundamentals',
    subtitle: 'Building Inclusive Digital Experiences',
    description: 'Learn how to create accessible web applications that comply with WCAG standards and the European Accessibility Act.',
    dateInfo: 'TBD',
    timeInfo: 'TBD',
    locationInfo: 'TBD',
    maxAttendees: 15,
    icon: Accessibility,
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
    icon: Brain,
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
    icon: Rocket,
    iconColor: '#2563eb', // blue-600
    tag: '🚀 React & Next.js Performance Foundations',
    speakerId: 'faris-aziz'
  },
  {
    id: 'vue-fundementals',
    title: 'Vue.js Fundamentals',
    subtitle: 'Building Modern Web Applications',
    description: 'Learn the core concepts of Vue.js and how to build reactive, component-based web applications from the ground up.',
    dateInfo: 'TBD',
    timeInfo: 'TBD',
    locationInfo: 'TBD',
    maxAttendees: 15,
    icon: Layers,
    iconColor: '#059669', // emerald-600
    tag: '🚀 Vue.js Fundamentals',
    speakerId: 'aleksej-dix'
  }
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

  console.log(speakersMap);

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

      <div className="pt-20 bg-gradient-to-br from-yellow-400 to-amber-500">
        {/* Hero Section */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black">ZurichJS Workshops</h1>
              <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-800">
                Hands-on learning experiences to level up your JavaScript skills
              </p>
            </motion.div>

            {/* Workshops Grid */}
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              {workshops.map((workshop, index) => {
                const speaker = speakersMap[workshop.speakerId];
                const IconComponent = workshop.icon;
                
                return (
                <motion.div
                  key={workshop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                  onMouseEnter={() => setHoveredWorkshop(workshop.id)}
                  onMouseLeave={() => setHoveredWorkshop(null)}
                >
                  <Link href={`/workshops/${workshop.id}`} className="block">
                    <div className="relative h-48 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black bg-opacity-80 z-10 flex items-center justify-center">
                        <div className="bg-black bg-opacity-70 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold">
                          {workshop.tag}
                        </div>
                      </div>
                      <div 
                        className={`w-full h-full transition-transform duration-500 flex items-center justify-center ${
                          hoveredWorkshop === workshop.id ? 'scale-110' : 'scale-100'
                        }`}
                        style={{ backgroundColor: `${workshop.iconColor}15` }} // Very light version of the icon color
                      >
                        <IconComponent size={96} color={workshop.iconColor} strokeWidth={1.5} />
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-2xl font-bold mb-2 text-gray-900">{workshop.title}</h2>
                      <p className="text-lg mb-4 text-gray-700">{workshop.subtitle}</p>
                      
                      <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-full text-sm">
                          <Calendar size={16} className="mr-1.5 text-yellow-600" />
                          <span className="text-gray-700">{workshop.dateInfo}</span>
                        </div>
                        <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-full text-sm">
                          <Clock size={16} className="mr-1.5 text-yellow-600" />
                          <span className="text-gray-700">{workshop.timeInfo}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 mb-6">
                        <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-full text-sm">
                          <MapPin size={16} className="mr-1.5 text-yellow-600" />
                          <span className="text-gray-700">{workshop.locationInfo}</span>
                        </div>
                        <div className="flex items-center bg-yellow-50 px-3 py-1.5 rounded-full text-sm">
                          <Users size={16} className="mr-1.5 text-yellow-600" />
                          <span className="text-gray-700">Limited to {workshop.maxAttendees} attendees</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-6 line-clamp-2">
                        {workshop.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        {speaker && (
                          <div className="flex items-center">
                            <Image
                              src={speaker.image}
                              alt={speaker.name}
                              width={40}
                              height={40}
                              className="rounded-full mr-3"
                            />
                            <span className="font-medium">{speaker.name}</span>
                          </div>
                        )}
                        
                        <div className={`text-yellow-600 font-bold flex items-center transition-transform duration-300 ${
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
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-16 bg-black">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-4 text-yellow-400">Ready to Level Up Your Skills? 🚀</h2>
              <p className="text-xl mb-8 text-gray-300 max-w-3xl mx-auto">
                Our workshops are designed to provide practical, hands-on learning experiences that you can immediately apply to your projects.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <Link 
                  href="/events" 
                  className="bg-transparent border-2 border-yellow-400 text-yellow-400 px-8 py-3 rounded-lg font-bold text-lg hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  View All Events
                </Link>
                <Link 
                  href="/contact" 
                  className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
                >
                  Request Custom Workshop
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const speakers = await getSpeakers({ shouldFilterVisible: false });
  
  return {
    props: {
      speakers
    },
    revalidate: 60 * 60 // Revalidate every hour
  };
};
