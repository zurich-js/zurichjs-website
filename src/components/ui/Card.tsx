import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { Event } from '@/sanity/queries';

interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
  talks: number;
  talkCount?: number;
}

interface CardProps {
  type: 'event' | 'speaker';
  item: Event | Speaker;
}

export default function Card({
  type = 'event',
  item,
  ...props
}: CardProps) {
  if (type === 'event') {
    const eventItem = item as Event;
    return (
      <motion.div
        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl cursor-pointer border border-black/10 hover:border-[#258BCC] transition-all duration-200"
        {...props}
      >
        <Link href={`/events/${eventItem.id}`} className="block cursor-pointer">
          <div className="relative h-64 w-full">
            {eventItem.image ? (
              <Image
                src={eventItem.image as string}
                alt={`${eventItem.title} - ZurichJS event`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">⚛️</div>
                  <div className="mt-3 flex justify-center space-x-3">
                    <span className="text-2xl">🚀</span>
                    <span className="text-2xl">💻</span>
                    <span className="text-2xl">🔥</span>
                  </div>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <span className="bg-blue-700 text-xs text-white px-2 py-1 rounded-full mb-2 inline-block">
                Don&apos;t miss it!
              </span>
              <h3 className="text-lg font-bold line-clamp-2">{eventItem.title}</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center text-blue-700 mb-2 font-medium">
              <Calendar size={16} className="mr-1" />
              <span className="text-sm">
                {eventItem.datetime ? new Date(eventItem.datetime).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) + ' at ' + new Date(eventItem.datetime).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Date TBA'}
              </span>
            </div>
            <div className="flex items-center text-gray-700 mb-2">
              <MapPin size={16} className="mr-1" />
              <span className="text-sm">{eventItem.location}</span>
            </div>
            {eventItem.attendees > 0 && (
              <div className="flex items-center text-gray-700">
                <Users size={16} className="mr-1" />
                <span className="text-sm">
                  {eventItem.attendees}+ JavaScript enthusiasts joining! 🎉
                </span>
              </div>
            )}
            {eventItem.attendees === 0 && (
              <div className="flex items-center text-blue-700">
                <Sparkles size={16} className="mr-1" />
                <span className="text-sm">
                  Be among the first to RSVP! ⚡
                </span>
              </div>
            )}
          </div>
        </Link>
      </motion.div>
    );
  }

  if (type === 'speaker') {
    const speakerItem = item as Speaker;
    return (
      <motion.div
        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl cursor-pointer border border-black/10 hover:border-[#258BCC] transition-all duration-200"
        {...props}
      >
        <Link href={`/speakers/${speakerItem.id}`} className="block cursor-pointer">
          <div className="relative h-64 w-full">
            <Image
              src={speakerItem.image || '/images/speakers/default.jpg'}
              alt={`${speakerItem.name} - ZurichJS speaker`}
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="inline-block bg-blue-700 text-white text-xs px-2 py-1 rounded-full mb-2">
                JS Wizard 🧙‍♂️
              </div>
              {(speakerItem.talkCount !== undefined && speakerItem.talkCount > 0) && (
                <div className="inline-block ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {speakerItem.talkCount} {speakerItem.talkCount === 1 ? 'talk' : 'talks'} 🎤
                </div>
              )}
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{speakerItem.name}</h3>
            <p className="text-sm mb-2 text-gray-700 line-clamp-1">{speakerItem.title}</p>
            {speakerItem.talks > 0 && (
              <div className="mt-2 inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                {speakerItem.talks} amazing {speakerItem.talks === 1 ? 'talk' : 'talks'} 🎤
              </div>
            )}
          </div>
        </Link>
      </motion.div>
    );
  }

  return null;
}
