import { motion } from 'framer-motion';
import { Camera, Video, Calendar, MapPin, Users, ExternalLink, Play, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';


import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { Event, getPastEvents } from "@/sanity/queries"

export type MediaProps = {
  pastEvents: Event[];
}

interface MediaItem {
  type: 'photo' | 'video';
  url: string;
}

interface EventMedia {
  folderId: string;
  event: Event | null;
  media: MediaItem[];
}

function filterEventMedias(eventMedias: EventMedia[], activeTab: 'all' | 'photos' | 'videos'): EventMedia[] {
  if (activeTab === 'photos') {
    return eventMedias.map(eventMedia => ({
      folderId: eventMedia.folderId,
      event: eventMedia.event,
      media: eventMedia.media.filter(media => media.type === 'photo'),
    }));
  } else if (activeTab === 'videos') {
    return eventMedias.map(eventMedia => ({
      folderId: eventMedia.folderId,
      event: eventMedia.event,
      media: eventMedia.media.filter(media => media.type === 'video'),
    }));
  } else {
    return eventMedias;
  }
}

function createEventMedias(pastEvents: Event[], filesByFolder: Record<string, any[]>): EventMedia[] {
  return Object.entries(filesByFolder).map(([folderId, files]) => {
    const event = pastEvents.find(event => event.id === folderId);
    const media: MediaItem[] = files.map((file: any) => ({
      // TODO: add video type
      type: 'photo',
      url: file.url,
    }));
    return ({ 
      folderId: folderId, 
      event: event || null,  
      media,
    });
  });
}

export default function Media({ pastEvents }: MediaProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos'>('all');
  const [eventMedias, setEventMedias] = useState<EventMedia[]>([]);

  const filteredMedia = filterEventMedias(eventMedias, activeTab);

  const allMedia = eventMedias.flatMap(eventMedia => eventMedia.media);

  useEffect(() => {
    fetch('/api/imagekit/list', {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json',
      },
    }).then(response => response.json())
      .then(filesByFolder => {
        const eventMedias = createEventMedias(pastEvents, filesByFolder);
        setEventMedias(eventMedias);
      })
      .catch(console.error);
  }, []);

  const handleTabChange = (tab: 'all' | 'photos' | 'videos') => {
    setActiveTab(tab);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <SEO
        title="Photos & Videos | ZurichJS"
        description="Relive the amazing moments from ZurichJS events! Browse through photos and watch videos from our meetups, workshops, and talks."
        openGraph={{
          type: 'website',
          title: 'Photos & Videos | ZurichJS',
          description: 'Relive the amazing moments from ZurichJS events! Browse through photos and watch videos from our meetups, workshops, and talks.',
          image: '/api/og/home',
        }}
      />

      {/* Hero Section */}
      <Section variant="gradient" padding="lg" className="mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Relive the Magic! 📸🎥
          </h1>
          <p className="text-xl max-w-3xl mx-auto mb-8 text-gray-900">
            Dive into our collection of photos and videos from past ZurichJS events. From epic workshops to inspiring talks, 
            capture the energy and excitement of our JavaScript community!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Camera className="w-5 h-5 mr-2" />
              <span className="font-medium">{allMedia.filter(item => item.type === 'photo').length} Photos</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Video className="w-5 h-5 mr-2" />
              <span className="font-medium">{allMedia.filter(item => item.type === 'video').length} Videos</span>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Media Gallery */}
      <Section variant="gray">
        {/* Tabs and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex mb-4 md:mb-0 bg-white rounded-lg shadow-sm p-1">
            <button
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('all')}
            >
              <span>All Media</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{eventMedias.flatMap(eventMedia => eventMedia.media).length}</span>
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'photos'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('photos')}
            >
              <Camera size={16} />
              <span>Photos</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {allMedia.filter(item => item.type === 'photo').length}
              </span>
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'videos'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => handleTabChange('videos')}
            >
              <Video size={16} />
              <span>Videos</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {allMedia.filter(item => item.type === 'video').length}
              </span>
            </button>
          </div>
        </div>

        {/* Media Grid */}
        {filteredMedia.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map((item, index) => (
              <motion.div
                key={item.folderId}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index % 3 * 0.1 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-48 md:h-60 w-full">
                  <Image
                    src={item.media[0].url}
                    alt={item.event?.title || "Event " + item.folderId}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Overlay with type indicator */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  
                  {/* TODO snippet I saved */}
                  
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-900 line-clamp-2">
                    {item.event?.title || "Event " + item.folderId}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {item.event?.description || ""}
                  </p>

                  {/* Event details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar size={14} className="mr-2" />
                      <span>{item.event ? formatDate(item.event.datetime) : ""}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin size={14} className="mr-2" />
                      <span>{item.event?.location || ""}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users size={14} className="mr-2" />
                      <span>{item.event ? ("" + item.event?.attendees + " attendees") : ""}</span>
                    </div>
                  </div>

                  {/* Action button */}
                  {/* TODO button & fix url to go to event page */}
                  <Button
                    href={item.event?.meetupUrl || ""}
                    variant="outline"
                    size="sm"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    {"View"}
                    <ExternalLink size={14} className="ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No media found</h3>
          </div>
        )}
      </Section>

      {/* Call to Action */}
      <Section variant="white">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-gray-900">
              Want to be part of our next event? 🚀
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join us at our upcoming meetups and workshops! Connect with fellow developers, 
              learn new skills, and maybe even become part of our photo and video collection!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button href="/events" variant="primary" size="lg">
                View Upcoming Events
              </Button>
              <Button href="/cfp" variant="secondary" size="lg">
                Submit a Talk
              </Button>
            </div>
          </motion.div>
        </div>
      </Section>
    </Layout>
  );
}

export async function getStaticProps() {

  const pastEvents = await getPastEvents();
  
  return {
    props: {
      pastEvents,
    },
  };
}