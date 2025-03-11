import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Sparkles } from 'lucide-react';

// Define TypeScript interfaces
interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  attendees: number;
}

interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
  talks: number;
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
        className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl"
        {...props}
      >
        <Link href={`/events/${eventItem.id}`} className="block">
          <div className="relative h-48 w-full">
            <Image
              src={eventItem.image || '/images/events/default.jpg'}
              alt={`${eventItem.title} - ZurichJS event`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <span className="bg-blue-700 text-xs text-white px-2 py-1 rounded-full mb-2 inline-block">
                Don&apos;t miss it! 🔥
              </span>
              <h3 className="text-lg font-bold line-clamp-2">{eventItem.title}</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center text-blue-700 mb-2 font-medium">
              <Calendar size={16} className="mr-1" />
              <span className="text-sm">{eventItem.date} • {eventItem.time}</span>
            </div>
            <div className="flex items-center text-gray-700 mb-2">
              <MapPin size={16} className="mr-1" />
              <span className="text-sm">{eventItem.location}</span>
            </div>
            {eventItem.attendees > 0 && (
              <div className="flex items-center text-gray-700">
                <Users size={16} className="mr-1" />
                <span className="text-sm">
                  {eventItem.attendees} JavaScript enthusiasts joining! 🎉
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
        className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl"
        {...props}
      >
        <Link href={`/speakers/${speakerItem.id}`} className="block">
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
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-900">{speakerItem.name}</h3>
            <p className="text-sm mb-2 text-gray-700">{speakerItem.title}</p>
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