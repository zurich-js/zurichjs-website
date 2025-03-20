import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ExternalLink, Twitter, Github, Linkedin, Users, TrendingUp, Clock, Award } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import SEO from '@/components/SEO';
import { Event, getSpeakers, getTalks } from '@/sanity/queries';
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
}

interface UpcomingTalk {
  id: string;
  title: string;
  speakerName: string;
  speakerId: string;
  date: string;
  location: string;
}

// Add these interfaces for the talk data structure
interface TalkData {
  title: string;
  events?: Event[];
  speakers?: SpeakerData[];
}

interface SpeakerData {
  id: string;
  name: string;
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

      <div className="pt-20">
        {/* Hero Section with Topic Insights */}
        <section className="bg-gradient-to-br from-yellow-400 to-amber-500 py-16">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Our Amazing Speakers 🎤
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
                <div className="p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div>
                      <span className="inline-block bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
                        ZurichJS Community
                      </span>
                      <h2 className="text-3xl font-bold">Community Spotlight</h2>
                      <p className="text-gray-600">Our growing JavaScript community in Zurich</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                      <Button href="https://meetup.com/zurich-js" external variant="secondary" className="flex items-center">
                        Join Our Community <ExternalLink size={16} className="ml-2" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Community Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <Users size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Total Speakers</p>
                        <h3 className="text-2xl font-bold">{speakerStats?.totalSpeakers}</h3>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                        <TrendingUp size={24} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Total Talks</p>
                        <h3 className="text-2xl font-bold">{speakerStats?.totalTalks}</h3>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                        <MapPin size={24} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Top Location</p>
                        <h3 className="text-lg font-bold">{speakerStats?.topLocation}</h3>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                        <Clock size={24} className="text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Total Talk Minutes</p>
                        <h3 className="text-2xl font-bold">{speakerStats?.totalTalkMinutes}</h3>
                      </div>
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
                            <Link href={`/events/${talk.id}`} className="block">
                              <h4 className="font-bold text-lg hover:text-yellow-600 transition-colors">{talk.title}</h4>
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
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* All Speakers Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10"
            >
              <div>
                <h2 className="text-3xl font-bold mb-2">Past & Upcoming Speakers</h2>
                <p className="text-gray-600">
                  All the amazing talent who has been on the ZurichJS stage!
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button href="/cfp" variant="secondary">
                  Become a Speaker 🎤
                </Button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {speakers.map((speaker, index) => (
                <motion.div
                  key={speaker.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index % 4 * 0.1 }}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <Link href={`/speakers/${speaker.id}`} className="block">
                    <div className="relative h-64 w-full">
                      <Image
                        src={speaker.image}
                        alt={speaker.name}
                        fill
                        className="object-cover"
                      />
                      {/* Badge positioned absolutely on top right of image */}
                      {isClient && (
                        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded shadow-sm">
                          {speaker.talks.length > 0 ? `${speaker.talks.length} talk${speaker.talks.length > 1 ? 's' : ''} 🎤` : 'No talks yet'}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold">{speaker.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{speaker.title}</p>
                      
                      {/* Only render this on client-side to prevent hydration mismatch */}
                      {isClient && (
                        <div className="flex space-x-2">
                          {speaker.twitter && (
                            <a 
                              href={speaker.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 hover:text-blue-400"
                              aria-label="Twitter profile"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Twitter size={16} />
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
                              <Github size={16} />
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
                              <Linkedin size={16} />
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
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-black text-white rounded-xl shadow-lg p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-4">Ready to Share Your JavaScript Knowledge? 💡</h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto">
                Join our lineup of amazing speakers! Submit your talk proposal and inspire the ZurichJS community.
              </p>
              <Button href="/cfp" variant="primary" size="lg" className="bg-gradient-to-br from-yellow-400 to-amber-500 text-black hover:bg-yellow-600">
                Submit a Talk Proposal 🚀
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const speakers = await getSpeakers({ shouldFilterVisible: true });
  const talks = await getTalks();

  // Calculate total talks across all speakers
  const totalTalks = speakers.reduce((sum: number, speaker: Speaker) => sum + speaker.talks.length, 0);
  
  // Calculate total talk minutes
  const totalTalkMinutes = speakers.reduce((sum: number, speaker: Speaker) => {
    return sum + speaker.talks.reduce((talkSum: number, talk: Talk) => talkSum + (talk.durationMinutes ?? 0), 0);
  }, 0);
  
  // Example community statistics
  const speakerStats = {
    totalSpeakers: speakers.length,
    totalTalks: totalTalks,
    topLocation: "Ginetta, Zurich",
    totalTalkMinutes: totalTalkMinutes
  };
  
  // Get upcoming talks from the talks data
  const now = new Date();
  const upcomingTalks: UpcomingTalk[] = talks
    .filter((talk: TalkData) => talk.events && talk.events.length > 0)
    .flatMap((talk: TalkData) => 
      talk.events!.map((event: Event) => ({
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