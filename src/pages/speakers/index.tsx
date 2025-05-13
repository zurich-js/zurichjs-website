import { motion } from 'framer-motion';
import { Calendar, MapPin, ExternalLink, Twitter, Github, Linkedin, Users, TrendingUp, Clock, Award, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { getSpeakers, getTalks } from '@/sanity/queries';
import { Speaker, Talk } from '@/types';

interface SpeakersProps {
  speakers: Speaker[];
  speakerStats: SpeakerStats;
  upcomingTalks: UpcomingTalk[];
}

interface SpeakerStats {
  totalSpeakers: number;
  totalTalks: number;
  topLocation: string;
  totalTalkMinutes: number;
  averageTalkLength: number;
  topTags: {tag: string, count: number}[];
  mostActiveSpeaker: {name: string, talkCount: number};
}

interface UpcomingTalk {
  id: string;
  title: string;
  speakerName: string;
  speakerId: string;
  date: string;
  location: string;
}

interface TalkWithEventDate extends UpcomingTalk {
  eventDate: Date;
}

export default function Speakers({ speakers, speakerStats, upcomingTalks }: SpeakersProps) {
  // Add client-side state to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set isClient to true once component mounts on the client
    setIsClient(true);
  }, []);

  return (
    <Layout>
      <SEO
        title="Speakers | ZurichJS"
        description="Meet the amazing speakers who have shared their JavaScript knowledge at ZurichJS meetups."
        openGraph={{
          title: "ZurichJS Speakers",
          description: "Meet the amazing speakers who have shared their JavaScript knowledge at ZurichJS meetups.",
          image: `/api/og/speakers`, // Dynamic OG image
          type: "website"
        }}
      />

        {/* Hero Section with Topic Insights */}
        <Section variant="gradient" className="mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Our Amazing Speakers
              </h1>
              <p className="text-xl max-w-2xl mx-auto">
                Meet the talented developers who have shared their JavaScript expertise at ZurichJS meetups!
              </p>
            </motion.div>

            {/* Community Dashboard - Replacement for Featured Speaker */}
            {isClient && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white rounded-xl shadow-xl overflow-hidden"
              >
                <div className="p-4 sm:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                      <span className="inline-block bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                        ZurichJS Community
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold">Community Spotlight</h2>
                      <p className="text-gray-600 text-sm sm:text-base">Our growing JavaScript community in Zurich</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                      <Button href="https://meetup.com/zurich-js" external variant="secondary" className="flex items-center text-sm sm:text-base">
                        Join Our Community <ExternalLink size={16} className="ml-2" />
                      </Button>
                    </div>
                  </div>

                  {/* Community Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-5 flex flex-col shadow-sm">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                          <Users size={16} className="text-white sm:hidden" />
                          <Users size={20} className="text-white hidden sm:block" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold">{speakerStats?.totalSpeakers}</h3>
                      </div>
                      <p className="text-gray-700 text-xs sm:text-sm font-medium mt-auto">Total Speakers</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-5 flex flex-col shadow-sm">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                          <TrendingUp size={16} className="text-white sm:hidden" />
                          <TrendingUp size={20} className="text-white hidden sm:block" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold">{speakerStats?.totalTalks}</h3>
                      </div>
                      <p className="text-gray-700 text-xs sm:text-sm font-medium mt-auto">Total Talks</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 sm:p-5 flex flex-col shadow-sm">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                          <Award size={16} className="text-white sm:hidden" />
                          <Award size={20} className="text-white hidden sm:block" />
                        </div>
                        <h3 className="text-sm sm:text-lg font-bold truncate max-w-[110px] sm:max-w-full">{speakerStats?.mostActiveSpeaker?.name || 'N/A'}</h3>
                      </div>
                      <p className="text-gray-700 text-xs sm:text-sm font-medium mt-auto">
                        Top Speaker ({speakerStats?.mostActiveSpeaker?.talkCount || 0})
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-5 flex flex-col shadow-sm">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                          <MapPin size={16} className="text-white sm:hidden" />
                          <MapPin size={20} className="text-white hidden sm:block" />
                        </div>
                        <h3 className="text-sm sm:text-lg font-bold truncate max-w-[110px] sm:max-w-full">{speakerStats?.topLocation}</h3>
                      </div>
                      <p className="text-gray-700 text-xs sm:text-sm font-medium mt-auto">Top Venue</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 sm:p-5 flex flex-col shadow-sm">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                          <Clock size={16} className="text-white sm:hidden" />
                          <Clock size={20} className="text-white hidden sm:block" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold">{speakerStats?.totalTalkMinutes}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">minutes of JS knowledge</p>
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-gray-700 text-xs sm:text-sm font-medium">
                          Average talk: {speakerStats?.averageTalkLength} minutes
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 sm:p-5 flex flex-col shadow-sm">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                          <Calendar size={16} className="text-white sm:hidden" />
                          <Calendar size={20} className="text-white hidden sm:block" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold">Join Our Next Event</h3>
                      </div>
                      <Button href="/events" variant="secondary" size="sm" className="mt-auto text-xs sm:text-sm">
                        View All Events <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 sm:p-5 flex flex-col shadow-sm mb-6">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-500 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                          <TrendingUp size={16} className="text-white sm:hidden" />
                          <TrendingUp size={20} className="text-white hidden sm:block" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold">Popular Topics</h3>
                      </div>
                      <Button href="/cfp" variant="ghost" size="sm" className="text-pink-600 hover:text-pink-700 text-xs sm:text-sm">
                        Submit Talk <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3 overflow-y-auto max-h-28 sm:max-h-32 p-1">
                      {speakerStats?.topTags?.map((tag, index) => {
                        // Assign different colored borders and text but keep backgrounds white for contrast
                        const colorClasses = [
                          'text-yellow-700 border-yellow-400 hover:bg-yellow-50',
                          'text-blue-700 border-blue-400 hover:bg-blue-50',
                          'text-green-700 border-green-400 hover:bg-green-50',
                          'text-purple-700 border-purple-400 hover:bg-purple-50',
                          'text-red-700 border-red-400 hover:bg-red-50',
                          'text-indigo-700 border-indigo-400 hover:bg-indigo-50',
                          'text-cyan-700 border-cyan-400 hover:bg-cyan-50',
                          'text-gray-700 border-gray-400 hover:bg-gray-50'
                        ];
                        const colorClass = colorClasses[index % colorClasses.length];
                        
                        return (
                          <span 
                            key={index} 
                            className={`inline-block bg-white ${colorClass} px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border-2 shadow-sm hover:shadow-md transition-all cursor-default`}
                          >
                            {tag?.tag || 'Unknown'} <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 rounded-full h-4 w-4 sm:h-5 sm:w-5 ml-1 text-xs">{tag?.count || 0}</span>
                          </span>
                        );
                      }) || (
                        <span className="inline-block bg-white px-2 py-1 rounded text-sm font-medium">
                          No tags available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Talks Section */}
                  {upcomingTalks && upcomingTalks.length > 0 && (
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <h3 className="font-bold text-lg mb-2 sm:mb-0">Upcoming Talks</h3>
                        <Link href="/events" className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center">
                          View All Events <ExternalLink size={14} className="ml-1" />
                        </Link>
                      </div>

                      <div className="space-y-4">
                        {upcomingTalks.map((talk) => (
                          <div key={talk.id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="block">
                              <Link href={`/events/${talk.id}`}>
                                <h4 className="font-bold text-lg hover:text-yellow-600 transition-colors">{talk.title}</h4>
                              </Link>
                              <div className="flex flex-col sm:flex-row sm:items-center mt-2 text-sm text-gray-500">
                                <div className="flex items-center mb-2 sm:mb-0">
                                  <Award size={16} className="mr-1 flex-shrink-0" />
                                  <Link href={`/speakers/${talk.speakerId}`} className="mr-4 hover:text-yellow-600 truncate">
                                    {talk.speakerName}
                                  </Link>
                                </div>
                                <div className="flex items-center mb-2 sm:mb-0">
                                  <Calendar size={16} className="mr-1 flex-shrink-0" />
                                  <span className="mr-4">{new Date(talk.date).toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin size={16} className="mr-1 flex-shrink-0" />
                                  <span className="truncate">{talk.location}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
        </Section>

        {/* All Speakers Section */}
        <Section variant="white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 sm:mb-10"
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Past & Upcoming Speakers</h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  All the amazing talent who has been on the ZurichJS stage!
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button href="/cfp" variant="secondary" className="text-sm sm:text-base">
                  Become a Speaker 🎤
                </Button>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {speakers.map((speaker, index) => (
                <motion.div
                  key={speaker.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index % 4 * 0.1 }}
                  className="bg-white rounded-lg shadow-md overflow-hidden h-full"
                >
                  <Link href={`/speakers/${speaker.id}`} className="block h-full flex flex-col">
                    <div className="relative h-40 sm:h-56 w-full">
                      <Image
                        src={`${speaker.image}?h=400`}
                        alt={speaker.name}
                        fill
                        className="object-cover"
                      />
                      {/* Badge positioned absolutely on top right of image */}
                      {isClient && (
                        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded shadow-sm">
                          {speaker.talks.length > 0 ? `${speaker.talks.length} talk${speaker.talks.length > 1 ? 's' : ''}` : 'No talks yet'}
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex-grow flex flex-col">
                      <h3 className="text-base sm:text-lg font-bold line-clamp-1">{speaker.name}</h3>
                      <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-1">{speaker.title}</p>

                      {/* Only render this on client-side to prevent hydration mismatch */}
                      {isClient && (
                        <div className="flex space-x-2 mt-auto">
                          {speaker.twitter && (
                            <a
                              href={speaker.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-blue-400"
                              aria-label="Twitter profile"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Twitter size={14} className="sm:hidden" />
                              <Twitter size={16} className="hidden sm:block" />
                            </a>
                          )}
                          {speaker.github && (
                            <a
                              href={speaker.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-black"
                              aria-label="GitHub profile"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Github size={14} className="sm:hidden" />
                              <Github size={16} className="hidden sm:block" />
                            </a>
                          )}
                          {speaker.linkedin && (
                            <a
                              href={speaker.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-blue-700"
                              aria-label="LinkedIn profile"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Linkedin size={14} className="sm:hidden" />
                              <Linkedin size={16} className="hidden sm:block" />
                            </a>
                          )}
                          {speaker.website && (
                            <a
                              href={speaker.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-yellow-600"
                              aria-label="Personal website"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={14} className="sm:hidden" />
                              <ExternalLink size={16} className="hidden sm:block" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
        </Section>

        {/* CTA */}
        <Section variant="black">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-black text-white rounded-xl shadow-lg p-5 sm:p-8 text-center"
            >
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Ready to Share Your JavaScript Knowledge? 💡</h2>
              <p className="text-base sm:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto">
                Join our lineup of amazing speakers! Submit your talk proposal and inspire the ZurichJS community.
              </p>
              <Button href="/cfp" variant="primary" size="lg" className="bg-yellow-500 text-black hover:bg-yellow-600 text-sm sm:text-base">
                Submit a Talk Proposal 🚀
              </Button>
            </motion.div>
        </Section>
    </Layout>
  );
}

export async function getStaticProps() {
  const speakers = await getSpeakers({ shouldFilterVisible: true });
  const talks = await getTalks();

  // Calculate total talks across all speakers
  const totalTalks = speakers.reduce((sum: number, speaker: Speaker) => sum + speaker.talks.length, 0);

  // Calculate total talk minutes and get the average
  const totalTalkMinutes = speakers.reduce((sum: number, speaker: Speaker) => {
    return sum + speaker.talks.reduce((talkSum: number, talk: Talk) => talkSum + (talk.durationMinutes ?? 0), 0);
  }, 0);
  
  const averageTalkLength = totalTalks > 0 ? Math.round(totalTalkMinutes / totalTalks) : 0;

  // Find most active speaker
  const mostActiveSpeaker = speakers.length > 0 
    ? speakers.reduce((most, current) => 
        (current.talks.length > most.talkCount) 
          ? {name: current.name, talkCount: current.talks.length} 
          : most, 
        {name: speakers[0]?.name || 'N/A', talkCount: speakers[0]?.talks.length || 0})
    : {name: "N/A", talkCount: 0};

  // Define types inline to avoid unused imports
  type TalkType = {
    title: string;
    events?: Array<{
      id: string;
      title: string;
      datetime: string;
      location: string;
    }>;
    speakers?: Array<{
      id: string;
      name: string;
    }>;
    tags?: string[];
    durationMinutes?: number;
  };

  // Calculate location frequencies
  const locationCounts: Record<string, number> = {};
  talks.forEach((talk: TalkType) => {
    if (talk.events && talk.events.length > 0) {
      talk.events.forEach((event) => {
        if (event.location) {
          locationCounts[event.location] = (locationCounts[event.location] || 0) + 1;
        }
      });
    }
  });

  // Find the most frequent location
  let topLocation = "N/A";
  let maxCount = 0;
  for (const [location, count] of Object.entries(locationCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topLocation = location;
    }
  }

  // Extract all talk tags and count frequencies
  const tagCounts: Record<string, number> = {};
  talks.forEach((talk: TalkType) => {
    if (talk.tags) {
      talk.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  
  // Get top 8 tags
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  // Ensure we have an array even if no tags are found
  const finalTopTags = topTags.length > 0 ? topTags : [];

  // Community statistics
  const speakerStats = {
    totalSpeakers: speakers.length,
    totalTalks,
    topLocation,
    totalTalkMinutes,
    averageTalkLength,
    topTags: finalTopTags,
    mostActiveSpeaker
  };

  // Get upcoming talks from the talks data
  const now = new Date();
  const upcomingTalks: UpcomingTalk[] = talks
    .filter((talk: TalkType) => talk.events && talk.events.length > 0)
    .flatMap((talk: TalkType) =>
      talk.events!.map((event) => ({
        id: event.id,
        title: talk.title,
        speakerName: talk.speakers && talk.speakers.length > 0 ? talk.speakers[0].name : 'Unknown Speaker',
        speakerId: talk.speakers && talk.speakers.length > 0 ? talk.speakers[0].id : '',
        date: event.datetime,
        location: event.location,
        eventDate: new Date(event.datetime)
      } as TalkWithEventDate))
    )
    .filter((talk: TalkWithEventDate) => talk.eventDate > now)
    .sort((a: TalkWithEventDate, b: TalkWithEventDate) => a.eventDate.getTime() - b.eventDate.getTime())
    .slice(0, 3)
    .map(({ id, title, speakerName, speakerId, date, location }: TalkWithEventDate) => ({
      id,
      title,
      speakerName,
      speakerId,
      date,
      location
    }));

  return {
    props: {
      speakers,
      speakerStats,
      upcomingTalks
    },
  };
}
