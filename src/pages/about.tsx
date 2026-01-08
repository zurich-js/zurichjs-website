// Import Chart.js modules first
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  TooltipItem
} from 'chart.js';
import { motion } from 'framer-motion';
import { Code, Users, Calendar, Heart, Sparkles, Coffee, MessageSquare, TrendingUp, ArrowUp, BarChart4, PartyPopper, Info, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getPastEvents, getStats } from '@/sanity/queries';
import { Event } from '@/sanity/queries';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Dynamically import the Chart component with no SSR to avoid hydration issues
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false
});

// Define our TypeScript interfaces
interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  website?: string;
}

interface Milestone {
  year: string;
  title: string;
  description: string;
  image?: string;
  id: string;
}

interface AboutPageProps {
  teamMembers: TeamMember[];
  milestones: Milestone[];
  stats: {
    members: number;
    eventsHosted: number;
    speakersToDate: number;
    totalAttendees: number;
  };
  pastEvents: Event[];
}

export default function About({ teamMembers, milestones, stats, pastEvents }: AboutPageProps) {
  useReferrerTracking();
  const { track } = useEvents();
  // State for mobile detection
  const [isMobile, setIsMobile] = useState(false);
  // State to control metrics explanation visibility
  const [showMetricsExplanation, setShowMetricsExplanation] = useState(false);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track CTA button clicks
  const trackCTAClick = (buttonName: string) => {
    track('cta_click', {
      button_name: buttonName,
      page: 'about'
    });
  };

  // Track when metrics info is viewed
  const handleToggleMetricsExplanation = () => {
    setShowMetricsExplanation(!showMetricsExplanation);
    if (!showMetricsExplanation) {
      track('view_explanation', {
        explanation_type: 'growth_metrics',
        page: 'about'
      });
    }
  };

  // Filter events that should be excluded from stats
  const filteredEvents = useMemo(() => {
    return pastEvents.filter(event => !event.excludeFromStats);
  }, [pastEvents]);

  // Calculate additional stats from past events
  const eventStats = useMemo(() => {
    if (!filteredEvents || filteredEvents.length === 0) {
      return {
        averageAttendees: 0,
        highestAttendance: 0,
        highestAttendanceEvent: '',
        growthRate: 0,
        totalEvents: 0,
        attendanceGrowth: 0
      };
    }

    // Sort events by date
    const sortedEvents = [...filteredEvents].sort((a, b) => 
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    // Calculate average attendees
    const totalAttendees = sortedEvents.reduce((sum, event) => sum + event.attendees, 0);
    const averageAttendees = Math.round(totalAttendees / sortedEvents.length);
    
    // Find event with highest attendance
    const highestAttendanceEvent = sortedEvents.reduce((max, event) => 
      event.attendees > max.attendees ? event : max, sortedEvents[0]);
    
    // Calculate growth rate if we have more than one event
    let growthRate = 0;
    let attendanceGrowth = 0;
    
    if (sortedEvents.length > 1) {
      const firstEvent = sortedEvents[0];
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      
      if (firstEvent.attendees > 0) {
        // Calculate percentage growth from first to last event
        attendanceGrowth = lastEvent.attendees - firstEvent.attendees;
        growthRate = Math.round((attendanceGrowth / firstEvent.attendees) * 100);
      }
    }

    return {
      averageAttendees,
      highestAttendance: highestAttendanceEvent.attendees,
      highestAttendanceEvent: highestAttendanceEvent.title,
      growthRate,
      totalEvents: sortedEvents.length,
      attendanceGrowth
    };
  }, [filteredEvents]);

  // Prepare chart data from past events
  const attendanceChartData = useMemo<ChartData<'line'>>(() => {
    // Sort events by date
    const sortedEvents = [...filteredEvents].sort((a, b) => 
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    return {
      labels: sortedEvents.map(event => {
        const date = new Date(event.datetime);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
      datasets: [
        {
          label: 'Event Attendees',
          data: sortedEvents.map(event => event.attendees),
          fill: false,
          backgroundColor: '#2563eb', // blue-600
          borderColor: '#2563eb',
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    };
  }, [filteredEvents]);

  // Chart options
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#f8fafc', // slate-50
            font: {
              size: 14,
              weight: 'bold' as const
            },
            boxWidth: 16, // Smaller box for mobile
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: '#1e293b', // slate-800
          titleColor: '#f8fafc', // slate-50
          bodyColor: '#f8fafc', // slate-50
          padding: 12,
          cornerRadius: 6,
          displayColors: false,
          bodyFont: {
            size: 14 // Larger font for better mobile readability
          },
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              if (!items.length) return '';
              const index = items[0].dataIndex;
              const sortedEvents = [...filteredEvents].sort((a, b) => 
                new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
              );
              const event = sortedEvents[index];
              return event ? event.title : '';
            }
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(248, 250, 252, 0.1)', // slate-50 with opacity
            display: !isMobile // Hide grid on mobile
          },
          ticks: {
            color: '#f8fafc', // slate-50
            maxRotation: 45, // Angle labels for better mobile display
            minRotation: 45,
            font: {
              size: isMobile ? 10 : 12 // Smaller font on mobile
            },
            autoSkip: true,
            maxTicksLimit: isMobile ? 4 : 10 // Fewer ticks on mobile
          }
        },
        y: {
          grid: {
            color: 'rgba(248, 250, 252, 0.1)', // slate-50 with opacity
            display: !isMobile // Hide grid on mobile
          },
          ticks: {
            color: '#f8fafc', // slate-50
            precision: 0,
            font: {
              size: isMobile ? 10 : 12 // Smaller font on mobile
            },
            maxTicksLimit: isMobile ? 5 : 8 // Fewer ticks on mobile
          },
          beginAtZero: true
        }
      }
    };
  }, [isMobile, filteredEvents]);

  return (
      <Layout>
        <SEO
            title="About ZurichJS | JavaScript Community in Zurich"
            description="Learn about ZurichJS - the vibrant JavaScript community in Zurich bringing together developers, enthusiasts and tech lovers since 2024."
            openGraph={{
              title: "About ZurichJS | JavaScript Community in Zurich",
              description: "Learn about ZurichJS - the vibrant JavaScript community in Zurich bringing together developers, enthusiasts and tech lovers since 2024.",
              image: "/images/community/pic-1.png",
              type: "website"
            }}
        />

        {/* Hero Section */}
        <Section variant="gradient" className="mt-20">
          <div className="flex flex-col lg:flex-row items-center">
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
                className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                Our JavaScript Story 💛
              </h1>
              <p className="text-xl mb-6 text-gray-900">
                Welcome to ZurichJS – the heart of JavaScript awesomeness in Zurich since 2024!
              </p>
              <p className="text-lg mb-6 text-gray-900">
                We&apos;re a thriving community of JS enthusiasts who love to code, learn, and connect. From React wizards to Node.js ninjas,
                TypeScript pros to vanilla JS lovers – everyone building with JavaScript has a home here!
              </p>
              <p className="text-sm mb-8 text-gray-700 bg-white/20 p-4 rounded-lg">
                <strong>Legal Note:</strong> ZurichJS is part of the Swiss JavaScript Group, a non-profit association (Verein) registered in Switzerland, dedicated to fostering JavaScript communities across the country.
              </p>
            </motion.div>

            <motion.div
                initial={{opacity: 0, scale: 0.9}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.5, delay: 0.2}}
                className="lg:w-1/2"
            >
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <div className="relative h-64 w-full rounded overflow-hidden">
                  <Image
                      src="/images/community/pic-1.png"
                      alt="ZurichJS Community"
                      fill
                      className="object-cover"
                  />
                </div>
                <div className="text-center mt-4 mb-2">
                  <span className="text-sm text-gray-700">Our amazing community at a recent meetup! 🎉</span>
                </div>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* Mission Section */}
        <Section variant="white">
          <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.5}}
              className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Our Mission 🚀</h2>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <motion.div
                initial={{opacity: 0, y: 20}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: 0.1}}
                className="text-center bg-gray-50 p-8 rounded-lg shadow-lg relative"
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-700 p-4 rounded-full shadow-lg">
                <Heart size={32} className="text-white"/>
              </div>
              <p className="text-2xl font-medium mt-6 mb-6 text-gray-900">
                &quot;To create an inclusive, vibrant space where JavaScript developers of all levels can learn, share, and grow together, fostering
                innovation and friendship in our tech community.&quot;
              </p>
              <p className="text-gray-700 italic">
                — The ZurichJS Team
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <motion.div
                initial={{opacity: 0, y: 20}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: 0.1}}
                className="text-center"
            >
              <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Code size={28} className="text-white"/>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Share Knowledge</h3>
              <p className="text-gray-700">
                We believe in freely sharing our JavaScript expertise to lift everyone up! From beginner tips to advanced techniques, we learn
                together.
              </p>
            </motion.div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: 0.2}}
                className="text-center"
            >
              <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-white"/>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Build Connections</h3>
              <p className="text-gray-700">
                At ZurichJS, it&apos;s not just about code – it&apos;s about the amazing people! We create meaningful connections that last beyond our
                meetups.
              </p>
            </motion.div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: 0.3}}
                className="text-center"
            >
              <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-white"/>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Foster Innovation</h3>
              <p className="text-gray-700">
                We&apos;re passionate about exploring new JavaScript frontiers together, from cutting-edge frameworks to revolutionary tools and
                techniques.
              </p>
            </motion.div>
          </div>
      </Section>

      {/* Organizational Structure Section */}
      <Section variant="white">
        <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5}}
            className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Our Organization 🏛️</h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Understanding the structure behind ZurichJS and our commitment to the Swiss JavaScript community
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.5, delay: 0.1}}
              className="bg-gray-50 p-8 rounded-lg shadow-lg mb-8"
          >
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Swiss JavaScript Group</h3>
            <p className="text-lg mb-4 text-gray-700">
              ZurichJS operates under the <strong>Swiss JavaScript Group</strong>, a registered non-profit association (Verein) in Switzerland. 
              This legal structure ensures our commitment to fostering JavaScript communities across Switzerland while maintaining transparency 
              and accountability to our members and the broader developer community.
            </p>
            <p className="text-lg mb-4 text-gray-700">
              The Swiss JavaScript Group serves as the umbrella organization for JavaScript meetups and events throughout Switzerland, 
              with ZurichJS being our flagship community in the Zurich area. This structure allows us to:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-700">
              <li className="mb-2">Operate as a recognized non-profit organization under Swiss law</li>
              <li className="mb-2">Maintain transparent financial operations and governance</li>
              <li className="mb-2">Collaborate with other JavaScript communities across Switzerland</li>
              <li className="mb-2">Provide legal protection and proper insurance for our events</li>
              <li className="mb-2">Ensure compliance with Swiss regulations and data protection laws</li>
            </ul>
          </motion.div>

          <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.5, delay: 0.2}}
              className="bg-blue-50 p-8 rounded-lg shadow-lg"
          >
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Non-Profit Commitment</h3>
            <p className="text-lg mb-4 text-gray-700">
              As a non-profit association, our primary mission is to serve the JavaScript community, not to generate profit. 
              All revenue from events and sponsorships goes directly back into improving our community offerings, 
              securing better venues, bringing in top-tier speakers, and expanding our reach across Switzerland.
            </p>
            <p className="text-lg text-gray-700">
              This commitment ensures that ZurichJS remains accessible, community-focused, and dedicated to advancing 
              JavaScript education and networking opportunities for developers at all levels.
            </p>
          </motion.div>
        </div>
      </Section>

  {/* Timeline Section */}
  <Section variant="white">
    <motion.div
        initial={{opacity: 0, y: 20}}
        whileInView={{opacity: 1, y: 0}}
        viewport={{once: true}}
        transition={{duration: 0.5}}
        className="text-center mb-12"
    >
      <h2 className="text-3xl font-bold mb-3 text-gray-900">Our JavaScript Journey</h2>
      <p className="text-xl text-gray-700 max-w-3xl mx-auto">
        From humble beginnings to an unstoppable community of JS enthusiasts!
      </p>
    </motion.div>

    {/* Desktop Timeline - Hidden on mobile */}
    <div className="relative hidden md:block">
      {/* Timeline line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-700"></div>

      {/* Timeline events */}
      <div className="relative">
        {milestones.map((milestone, index) => (
            <motion.div
                key={milestone.id}
                initial={{opacity: 0, y: 20}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: index * 0.2}}
                className={`flex items-center mb-16 ${
                    index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                }`}
            >
              <div className={`w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">{milestone.title}</h3>
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-3">
                      {milestone.year}
                    </span>
                <p className="text-gray-700">{milestone.description}</p>
              </div>

              {/* Timeline dot */}
              <div className="w-2/12 flex justify-center">
                <div className="bg-blue-700 rounded-full w-8 h-8 border-4 border-white shadow-md z-10"></div>
              </div>

              {/* Image on alternate sides */}
              <div className={`w-5/12 ${index % 2 === 0 ? 'pl-8' : 'pr-8'}`}>
                {milestone.image && (
                    <div className="relative h-48 w-full rounded-lg overflow-hidden shadow-lg">
                      <Image
                          src={milestone.image}
                          alt={milestone.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile Timeline - Visible only on mobile */}
          <div className="md:hidden">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 h-full w-1 bg-blue-700"></div>

              {/* Timeline events - Mobile version */}
              <div className="relative">
                {milestones.map((milestone, index) => (
                  <motion.div
                    key={'mobile-' + milestone.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className="pl-12 relative mb-12"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-6 transform -translate-x-1/2 bg-blue-700 rounded-full w-8 h-8 border-4 border-white shadow-md z-10"></div>

                    <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                      {milestone.year}
                    </span>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{milestone.title}</h3>
                    <p className="text-gray-700 mb-4">{milestone.description}</p>

                    {/* Image for mobile */}
                    {milestone.image && (
                      <div className="relative h-48 w-full rounded-lg overflow-hidden shadow-lg mb-4">
                        <Image
                          src={milestone.image}
                          alt={milestone.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Community Stats */}
        <Section variant="black">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-3">ZurichJS by the numbers</h2>
            <p className="text-xl max-w-3xl mx-auto">
              Our JavaScript community continues to grow and thrive thanks to amazing members like you!
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: <Users size={40} />, value: stats.members, label: "Community Members", delay: 0.1 },
              { icon: <Calendar size={40} />, value: stats.eventsHosted, label: "Meetups Hosted", delay: 0.2 },
              { icon: <MessageSquare size={40} />, value: stats.speakersToDate, label: "Amazing Speakers", delay: 0.3 },
              { icon: <Coffee size={40} />, value: stats.totalAttendees, label: "Total Attendees", delay: 0.4 }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: stat.delay }}
                className="bg-gray-900 p-6 rounded-lg"
              >
                <div className="text-blue-800 mx-auto mb-4">
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Growth Stats Section */}
        <Section variant="black">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-3">Our Growth Journey 📈</h2>
            <p className="text-xl max-w-3xl mx-auto">
              Watch how our meetup attendance has grown as the ZurichJS community expands!
            </p>
          </motion.div>

          {/* Additional Event Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-900 p-5 rounded-lg"
            >
              <div className="text-blue-400 mb-2">
                <BarChart4 size={28} />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{eventStats.averageAttendees}</div>
              <div className="text-sm md:text-base text-gray-400">Avg. Attendees</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-900 p-5 rounded-lg"
            >
              <div className="text-blue-400 mb-2">
                <PartyPopper size={28} />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{eventStats.highestAttendance}</div>
              <div className="text-sm md:text-base text-gray-400">Highest Attendance</div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gray-900 p-5 rounded-lg"
            >
              <div className="text-blue-400 mb-2">
                <ArrowUp size={28} />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">
                {eventStats.growthRate > 0 ? '+' : ''}{eventStats.growthRate}%
              </div>
              <div className="text-sm md:text-base text-gray-400">Attendance Growth</div>
              <div className="mt-2 text-xs text-gray-500">
                Percentage increase from our first to latest meetup
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gray-900 p-5 rounded-lg"
            >
              <div className="text-blue-400 mb-2">
                <Users size={28} />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">
                {eventStats.attendanceGrowth > 0 ? '+' : ''}{eventStats.attendanceGrowth}
              </div>
              <div className="text-sm md:text-base text-gray-400">New Attendees</div>
              <div className="mt-2 text-xs text-gray-500">
                Additional attendees gained since our first meetup
              </div>
            </motion.div>
          </div>

          {/* Attendance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-900 p-6 rounded-lg shadow-lg"
          >
            <div className="flex items-center justify-center mb-6">
              <TrendingUp size={28} className="text-blue-400 mr-2" />
              <h3 className="text-2xl font-semibold">Meetup Attendance Growth</h3>
            </div>
            
            <div className="h-80 w-full">
              {filteredEvents.length > 0 ? (
                <Chart data={attendanceChartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-lg text-gray-400">No past events data available</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 text-center text-gray-400">
              {eventStats.highestAttendanceEvent && (
                <p className="mb-2">
                  Our biggest event so far was <strong className="text-blue-400">{eventStats.highestAttendanceEvent}</strong> with {eventStats.highestAttendance} attendees!
                </p>
              )}
              <p className="mb-4">As our community grows, so does our impact on the JavaScript ecosystem in Zurich!</p>
              
              <button 
                onClick={handleToggleMetricsExplanation}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 text-sm"
              >
                {showMetricsExplanation ? (
                  <>
                    <X size={16} className="mr-2" />
                    Hide metrics explanation
                  </>
                ) : (
                  <>
                    <Info size={16} className="mr-2" />
                    Understand our growth metrics
                  </>
                )}
              </button>
              
              {showMetricsExplanation && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto mt-4 text-sm text-gray-500 bg-gray-800 p-4 rounded-lg"
                >
                  <h4 className="font-semibold text-gray-300 mb-2">Understanding Our Growth Metrics</h4>
                  <ul className="list-disc pl-5 space-y-2 text-left">
                    <li><span className="text-blue-400 font-medium">Attendance Growth:</span> Shows the percentage increase in attendees from our first meetup to our most recent one ({eventStats.growthRate}%).</li>
                    <li><span className="text-blue-400 font-medium">New Attendees:</span> Represents the additional number of people who have joined our meetups since we began ({eventStats.attendanceGrowth} people).</li>
                    <li><span className="text-blue-400 font-medium">Average Attendees:</span> The mean number of participants across all our events ({eventStats.averageAttendees} people per meetup).</li>
                  </ul>
                  <p className="mt-3 italic">These statistics help us track our community&apos;s expansion and engagement over time.</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Mobile note */}
          <div className="mt-4 text-center text-sm text-gray-500 md:hidden">
            <p>Tip: Rotate your device for a better view of the chart</p>
          </div>
        </Section>

        {/* Meet the Team */}
        <Section variant="white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Meet the JS Enthusiasts Behind the Magic ✨</h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Our team is passionate about building an amazing JavaScript community in Zurich!
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-50 rounded-lg overflow-hidden shadow-md"
              >
                <div className="relative h-64 w-full">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1 text-gray-900">{member.name}</h3>
                  <p className="text-blue-700 mb-4">{member.role}</p>
                  <p className="text-gray-700 mb-4">{member.bio}</p>
                  <div className="flex space-x-4">
                    {member.twitter && (
                      <a
                        href={member.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-400"
                        aria-label={`${member.name}'s Twitter profile`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                        </svg>
                      </a>
                    )}
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-black"
                        aria-label={`${member.name}'s GitHub profile`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </a>
                    )}
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-700"
                        aria-label={`${member.name}'s LinkedIn profile`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                        </svg>
                      </a>
                    )}
                  {member.website && (
                      <a
                          href={member.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-green-600"
                          aria-label={`${member.name}'s personal website`}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 16.057v-3.057h2.994c-.059 1.143-.212 2.24-.456 3.279-.823-.12-1.674-.188-2.538-.222zm1.957 2.162c-.499 1.33-1.159 2.497-1.957 3.456v-3.62c.666.028 1.319.081 1.957.164zm-1.957-7.219v-3.015c.868-.034 1.721-.103 2.548-.224.238 1.027.389 2.111.446 3.239h-2.994zm0-5.014v-3.661c.806.969 1.471 2.15 1.971 3.496-.642.084-1.3.137-1.971.165zm2.703-3.267c1.237.496 2.354 1.228 3.29 2.146-.642.234-1.311.442-2.019.607-.344-.992-.775-1.91-1.271-2.753zm-7.241 13.56c-.244-1.039-.398-2.136-.456-3.279h2.994v3.057c-.865.034-1.714.102-2.538.222zm2.538 1.776v3.62c-.798-.959-1.458-2.126-1.957-3.456.638-.083 1.291-.136 1.957-.164zm-2.994-7.055c.057-1.128.207-2.212.446-3.239.827.121 1.68.19 2.548.224v3.015h-2.994zm1.024-5.179c.5-1.346 1.165-2.527 1.97-3.496v3.661c-.671-.028-1.329-.081-1.97-.165zm-2.005-.35c-.708-.165-1.377-.373-2.018-.607.937-.918 2.053-1.65 3.29-2.146-.496.844-.927 1.762-1.272 2.753zm-.549 1.918c-.264 1.151-.434 2.36-.492 3.611h-3.933c.165-1.658.739-3.197 1.617-4.518.88.361 1.816.67 2.808.907zm.009 9.262c-.988.236-1.92.542-2.797.9-.89-1.328-1.471-2.879-1.637-4.551h3.934c.058 1.265.231 2.488.5 3.651zm.553 1.917c.342.976.768 1.881 1.257 2.712-1.223-.49-2.326-1.211-3.256-2.115.636-.229 1.299-.435 1.999-.597zm9.924 0c.7.163 1.362.367 1.999.597-.931.903-2.034 1.625-3.257 2.116.489-.832.915-1.737 1.258-2.713zm.553-1.917c.27-1.163.442-2.386.501-3.651h3.934c-.167 1.672-.748 3.223-1.638 4.551-.877-.358-1.81-.664-2.797-.9zm.501-5.651c-.058-1.251-.229-2.46-.492-3.611.992-.237 1.929-.546 2.809-.907.877 1.321 1.451 2.86 1.616 4.518h-3.933z" />
                          </svg>
                      </a>
                  )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Values Section */}
        <Section variant="gradient">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-3 text-gray-900">What Makes ZurichJS Special 💫</h2>
            <p className="text-xl max-w-3xl mx-auto text-gray-900">
              Our community thrives because of these shared values that guide everything we do!
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Inclusivity & Respect 🤝</h3>
              <p className="text-gray-700">
                ZurichJS welcomes everyone, regardless of experience level, background, or coding style! We believe in creating a safe, respectful space where all JavaScript enthusiasts feel valued and heard.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Learning & Growth 📚</h3>
              <p className="text-gray-700">
                We&apos;re passionate about continuous learning! From beginners to experts, everyone has something to learn and something to teach. We embrace new ideas and technologies with open arms.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Collaboration & Support 🌟</h3>
              <p className="text-gray-700">
                The magic happens when we work together! We encourage collaboration, mentorship, and supporting each other&apos;s growth in the JavaScript ecosystem.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <h3 className="text-xl font-bold mb-3 border-b border-blue-700 pb-2 text-gray-900">Fun & Creativity 🎨</h3>
              <p className="text-gray-700">
                JavaScript should be fun! We celebrate creative solutions, quirky approaches, and the joy of coding. Our meetups combine learning with fun social interactions.
              </p>
            </motion.div>
          </div>
        </Section>

        {/* Join Us CTA */}
        <Section variant="white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-black text-white rounded-xl shadow-lg p-8 text-center"
          >
            <h2 className="text-3xl font-bold mb-4 text-blue-400">Ready to Join the JS Revolution? 🚀🧑‍💻</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Become part of our vibrant JavaScript community and connect with fellow developers in Zurich!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                href="https://meetup.com/zurich-js"
                variant="primary"
                size="lg"
                className="bg-blue-700 text-white hover:bg-blue-600"
                onClick={() => trackCTAClick('join_meetup')}
              >
                Join Our Meetup Group 🎉
              </Button>
              <Button
                href="/events"
                variant="outline"
                size="lg"
                className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
                onClick={() => trackCTAClick('discover_events')}
              >
                Discover Upcoming Events
              </Button>
            </div>
          </motion.div>
        </Section>
    </Layout>
  );
}

export async function getStaticProps() {
  // Get stats using the same function as the homepage
  const stats = await getStats();
  const pastEvents = await getPastEvents();

  // This would be replaced with actual CMS fetching
  return {
    props: {
      teamMembers: [
        {
          id: '1',
          name: 'Faris Aziz',
          role: 'Founder & Lead Organizer',
          image: '/images/team/faris.jpg',
          bio: 'Staff Software Engineer and conference speaker focused on React, resilient systems, and scaling products used by millions. Founder of ZurichJS, passionate about practical architecture, great DX, and developer communities.',
          twitter: 'https://x.com/farisaziz12',
          github: 'https://github.com/farisaziz12',
          linkedin: 'https://linkedin.com/in/farisaziz12',
          website: 'https://faziz-dev.com'
        },
        {
          id: '2',
          name: 'Bogdan Mihai Ilie',
          role: 'Founder & Lead Organizer',
          image: '/images/team/bogdan.jpg',
          bio: 'Frontend specialist with a knack for making everyone feel welcome! Passionate about inclusive tech communities and Vue.',
          twitter: 'https://x.com/nosthrillz',
          github: 'https://github.com/nosthrillz',
          linkedin: 'https://linkedin.com/in/ilie-bogdan',
          website: 'https://bugdan.dev'
        },
        {
          id: '3',
          name: 'Enrique Ruiz Durazo',
          role: 'Official Photographer',
          image: '/images/team/enrique.jpeg',
          bio: 'Software engineer, product designer, and content creator. Obsessed with crafting great websites, apps, and creating quality content.',
          twitter: 'https://x.com/ruizdurazo',
          github: 'https://github.com/ruizdurazo',
          linkedin: 'https://linkedin.com/in/ruizdurazo',
          website: 'https://ruizdurazo.com'
        },
        {
          id: '4',
          name: 'Nadja Hesselbjerg',
          role: 'Community Supporter',
          image: '/images/team/nadja.png',
          bio: "Nadja is a Zurich-based frontend developer with a flair for crafting sleek, user-friendly web experiences. With a passion for innovative UX/UI design, she transforms complex ideas into intuitive digital solutions. Her multicultural background adds a unique perspective to her work. When she's not coding, Nadja is likely exploring the latest design trends or enjoying the vibrant Swiss tech scene.",
          github: 'https://github.com/Nadjaroemer',
          linkedin: 'https://www.linkedin.com/in/nadja-r%C3%B8mer-hesselbjerg-47002a12b/',
        },
      ],
      milestones: [
        {
          id: '2024-11-14',
          year: 'November 2024',
          title: 'Zurich JS is Born!',
          description: 'Our first meetup brought together 34 developers at novu! We seized the opportunity to redefine what a JavaScript community could be in the Zurich area. We were honored to have Nico Martin, a renowned AI Google Developer Expert, as our inaugural speaker.',
          image: '/images/community/meetup-1.png',
        },
        {
          id: '2025-01-31',
          year: 'January 2025',
          title: 'Our Community Grows',
          description: 'We reached 100 followers on LinkedIn while our Meetup group flourished to 80-90 active members. The momentum was building!',
          image: '/images/community/web-zurich-dinner.png',
        },
        {
          id: '2025-02-06',
          year: 'February 2025',
          title: 'Zurich JS Makes International & Local Friends',
          description: 'For our second meetup, we welcomed Evangelia who flew in specially from Thessaloniki, Greece. This month also marked the beginning of our valuable partnership with Web Zurich!',
          image: '/images/community/meetup-2.png',
        },
        {
          id: '2025-02-28',
          year: 'March 2025',
          title: 'Partnerships to the Moon!',
          description: 'We expanded into the international conference scene, establishing partnerships with React Paris and Code Blossom, complementing our existing collaborations with CityJS and Grusp.',
          image: '/images/community/meetup-3.jpeg',
        },
        {
          id: '2025-03-06',
          year: 'March 2025',
          title: 'ZurichJS x Vue Zurich',
          description: 'We proudly merged with the Vue Zurich meetup, welcoming their community into ours. We celebrated with Adam Berecz, a distinguished Vue.js expert from Hungary and founder of Vueform, as our featured speaker.',
          image: '/images/community/vue-zurich.jpeg',
        },
        {
          id: '2025-04-17',
          year: 'April 2025',
          title: 'ZurichJS Comes to Smallpdf',
          description: 'Smallpdf graciously hosted our 4th meetup, joining our roster of generous venue partners alongside Ginetta, novu ag, and GetYourGuide in Zurich.',
          image: '/images/community/meetup-3-crowd.jpg',
        },
        {
          id: '2025-05-15',
          year: 'May 2025',
          title: 'May the Code be with you',
          description: 'We heard from local JS Jedi Masters about the way of a founder and dove deep on performance testing.',
          image: '/images/community/may-the-force.webp',
        },
        {
          id: '2025-06-19',
          year: 'June 2025',
          title: 'Explore JavaScript on the Server Side',
          description: 'This meetup and the workshop were all about server side JavaScript and Node.js.',
          image: '/images/community/june-workshop.png',
        },
        {
          id: '2025-07-24',
          year: 'July 2025',
          title: 'Sizzling hot JavaScript in July',
          description: 'Astro and PHP plus our friends from Belgium joined us for an exciting summer meetup and brought some merch in their bags.',
          image: '/images/community/sizzling-june.webp',
        },
        {
          id: '2025-09-10',
          year: 'September 2025',
          title: 'Flare up your performance',
          description: 'Cloudflare joined us to share insights on optimizing web performance and security.',
          image: '/images/community/cloudflare.png',
        },
        {
          id: '2025-10-28',
          year: 'October 2025',
          title: '(H)aunt the Gaps in your Apps',
          description: 'Our spooky October meetup focused on identifying and fixing performance gaps and bugs in web applications with the support of Dynatrace, just in time for Halloween!',
          image: '/images/community/haunt-the-gaps.webp',
        },
        {
          id: '2025-11-13',
          year: 'November 2025',
          title: 'One year anniversary is here!',
          description: 'We celebrated our first anniversary with a special meetup back where it all started at Pause im Foifi presented by Digitec/Galaxus!',
          image: '/images/community/1year-anniversary.webp',
        },
        {
            id: '2026-01-22',
            year: 'January 2026',
            title: 'Vue x Stripe!',
            description: 'We partnered with Stripe and Get Your Guide to bring an exciting Vue.js focused meetup to our community!',
            image: '/images/community/vue-zurich.jpeg',
        }
        /*        {
          id: '2026-01-22',
          year: 'February 2026',
          title: 'Front-Conf Warmup',
          description: 'We are the official warump meetup for Front-Conf 2026 in Zurich!',
          image: '/images/community/meetup-3-crowd.jpg',
      }*/
      ],
      stats,
      pastEvents
    },
  };
}
