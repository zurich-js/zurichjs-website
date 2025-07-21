import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Sparkles, Users, MapPin, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

import Section from "@/components/Section";
import Button from '@/components/ui/Button';
import { Event } from '@/sanity/queries';
import { formatDateWithOrdinal } from '@/utils/dateUtils';

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({
  events,
}: UpcomingEventsProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sort events by date
  const sortedEvents = events ? [...events].sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  ) : [];

  if (!events || events.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <Section variant="white" className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-200 to-blue-200 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute bottom-20 -left-40 w-96 h-96 bg-gradient-to-br from-blue-100 to-yellow-100 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Enhanced header */}
        <motion.div
          initial={isClient ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center bg-gradient-to-r from-yellow-50 to-blue-50 backdrop-blur-sm px-6 py-3 rounded-full mb-6 border border-yellow-200/50">
            <Calendar size={20} className="text-blue-600 mr-2" />
            <span className="font-semibold text-blue-900">What&apos;s Coming Up</span>
            <Sparkles size={18} className="text-yellow-600 ml-2" />
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            Upcoming <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-600">Events</span> 🎯
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Join us for amazing JavaScript sessions, insightful talks, and networking with fellow developers in Zurich&apos;s most vibrant tech community!
          </p>
        </motion.div>

        {/* Events grid with enhanced animations */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12"
        >
          {sortedEvents.map((event) => (
            <motion.div
              key={event.id}
              variants={cardVariants}
              whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="group h-full"
            >
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-yellow-300 h-full flex flex-col">
                {/* Event image with overlay - Increased height */}
                <div className="relative h-64 overflow-hidden flex-shrink-0">
                  {event.image ? (
                    <img
                      src={event.image as string}
                      alt={`${event.title} - ZurichJS event`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 via-yellow-500 to-blue-600 flex items-center justify-center p-6">
                      <div className="text-center text-white">
                        <div className="text-5xl mb-3">🚀</div>
                        <div className="flex justify-center space-x-3 opacity-80">
                          <span className="text-2xl">⚛️</span>
                          <span className="text-2xl">💻</span>
                          <span className="text-2xl">🔥</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Bottom shadow gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Date badge with ordinal suffix */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-black text-sm font-bold px-3 py-2 rounded-full shadow-lg border border-white/50">
                    {formatDateWithOrdinal(new Date(event.datetime))}
                  </div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white text-xl font-bold line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                </div>

                {/* Event details - Flexible container */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Event info grid */}
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors">
                      <Clock className="w-4 h-4 mr-3 text-blue-500" />
                      <span className="font-medium">
                        {new Date(event.datetime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors">
                      <MapPin className="w-4 h-4 mr-3 text-yellow-600" />
                      <span className="font-medium line-clamp-1">{event.location || 'Venue TBD'}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 group-hover:text-gray-800 transition-colors">
                      <Users className="w-4 h-4 mr-3 text-blue-500" />
                      <span className="font-medium">
                        {event.attendees && event.attendees > 0 
                          ? `${event.attendees} JavaScript enthusiasts joining`
                          : "Be one of the first to RSVP"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 group-hover:text-gray-700 transition-colors flex-1">
                      {event.description}
                    </p>
                  )}

                  {/* CTA Button - Always at bottom */}
                  <div className="mt-auto">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <a
                        href={event.meetupUrl || `/events/${event.id}`}
                        className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 group-hover:shadow-2xl"
                      >
                        <span>Join This Event</span>
                        <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced call to action */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center bg-gradient-to-r from-blue-50 to-yellow-50 rounded-2xl p-8 border border-yellow-200/50 backdrop-blur-sm"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Ready to Join Our JavaScript Adventure? 🚀
            </h3>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Amazing talks, brilliant minds, delicious food, and great vibes – everything you need for the perfect tech meetup experience!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              href="https://meetup.com/zurich-js"
              variant="primary"
              size="lg"
              className="group bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
            >
              <span>Join Our Meetup Group</span>
              <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              href="/cfp"
              variant="outline"
              size="lg"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
            >
              Become a Speaker
            </Button>
          </div>
          
          <div className="mt-6 flex items-center justify-center text-gray-600 text-sm">
            <Sparkles size={16} className="mr-2 text-yellow-500" />
            <span>Amazing talks • Great networking • JavaScript magic ✨</span>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
