import { Calendar, MapPin, ArrowRight, Clock, Users } from 'lucide-react';

import Section from '@/components/Section';
import Button from '@/components/ui/Button';
import useEvents from '@/hooks/useEvents';
import { Event } from '@/sanity/queries';
import { formatDateWithOrdinal } from '@/utils/dateUtils';

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({
  events,
}: UpcomingEventsProps) {
  const { track } = useEvents();

  const handleReserveClick = (eventId: string, eventTitle: string) => {
    track('event_rsvp', {
      eventId: eventId,
      eventTitle: eventTitle,
      source: 'upcoming_events_homepage'
    });
  };

  // Sort events by date
  const sortedEvents = events ? [...events].sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  ) : [];

  if (!events || events.length === 0) {
    return (
      <Section variant="gradient" padding="lg">
        <div className="text-center max-w-2xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center bg-black/10 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6 border border-black/20">
            <Calendar size={16} className="text-black mr-2" />
            <span className="font-semibold text-black text-xs sm:text-sm">Upcoming Events</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4 sm:mb-6">
            New Events Coming Soon
          </h2>
          <p className="text-base sm:text-lg text-black/80 mb-6 sm:mb-8">
            We&apos;re planning exciting JavaScript sessions and networking opportunities. Stay tuned for updates!
          </p>
          
          <Button
            href="https://www.meetup.com/zurich-js"
            variant="primary"
            size="lg"
            className="bg-black hover:bg-gray-800 text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation"
          >
            Get Notified
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <Section variant="gradient" padding="lg">
      <div className="px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center bg-black/10 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6 border border-black/20">
            <Calendar size={16} className="text-black mr-2" />
            <span className="font-semibold text-black text-xs sm:text-sm">What&apos;s Coming Up</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4 sm:mb-6">
            Upcoming <span className="text-zurich">Events</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-black/80 max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
            Join us for JavaScript sessions, insightful talks, and networking with fellow developers in Zurich.
          </p>
        </div>

        {/* Events grid with enhanced animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {sortedEvents.map((event) => (
            <div
              key={event.id}
              className="group h-full cursor-pointer"
            >
              <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-black/10 hover:border-black/20 h-full flex flex-col">
                {/* Event image with overlay - Responsive height */}
                <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden flex-shrink-0">
                  {event.image ? (
                    <img
                      src={event.image as string}
                      alt={`${event.title} - ZurichJS event`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-js via-js-dark to-zurich flex items-center justify-center p-4 sm:p-6">
                      <div className="text-center text-black">
                        <div className="text-4xl sm:text-5xl mb-3">🚀</div>
                        <div className="flex justify-center space-x-2 sm:space-x-3 opacity-80">
                          <span className="text-xl sm:text-2xl">⚛️</span>
                          <span className="text-xl sm:text-2xl">💻</span>
                          <span className="text-xl sm:text-2xl">🔥</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Bottom shadow gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Date badge with ordinal suffix */}
                  <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-white/95 backdrop-blur-sm text-black text-xs sm:text-sm font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-full shadow-lg border border-white/50">
                    {formatDateWithOrdinal(new Date(event.datetime))}
                  </div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                    <h3 className="text-white text-lg sm:text-xl font-bold line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                </div>

                {/* Event details - Flexible container */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  {/* Event info grid */}
                  <div className="grid grid-cols-1 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex items-center text-black/70 hover:text-black transition-colors cursor-pointer">
                      <Clock className="w-4 h-4 mr-3 text-zurich flex-shrink-0" />
                      <span className="font-medium text-sm">
                        {new Date(event.datetime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-black/70 hover:text-black transition-colors cursor-pointer">
                      <MapPin className="w-4 h-4 mr-3 text-zurich flex-shrink-0" />
                      <span className="font-medium line-clamp-2 text-sm">{event.location || 'Venue TBD'}</span>
                    </div>
                    
                    <div className="flex items-center text-black/70 hover:text-black transition-colors cursor-pointer">
                      <Users className="w-4 h-4 mr-3 text-zurich flex-shrink-0" />
                      <span className="font-medium text-sm">
                        {event.attendees && event.attendees > 0 
                          ? `${event.attendees} JavaScript enthusiasts joining`
                          : "Be one of the first to RSVP"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="text-black/60 text-sm leading-relaxed mb-3 sm:mb-4 line-clamp-3 group-hover:text-black/70 transition-colors flex-1">
                      {event.description}
                    </p>
                  )}

                  {/* CTA Button - Always at bottom */}
                  <div className="mt-auto">
                    <a
                      href={event.meetupUrl || `/events/${event.id}`}
                      className="inline-flex items-center justify-center w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 group-hover:shadow-2xl cursor-pointer min-h-[48px] touch-manipulation"
                      onClick={() => handleReserveClick(event.id, event.title)}
                    >
                      <span>Join This Event</span>
                      <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Compact Community CTA */}
        <div className="relative overflow-hidden">
          <div className="bg-gradient-to-r from-black via-gray-900 to-black rounded-xl shadow-2xl border border-gray-700/50">
            <div className="absolute inset-0 bg-gradient-to-r from-js/10 via-transparent to-zurich/10"></div>
            <div className="relative px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6">
                <div className="text-center lg:text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                    Stay Connected with ZurichJS
                  </h3>
                  <p className="text-gray-300 text-sm leading-tight">
                    Get notified about new events and join our growing community
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 flex-shrink-0 w-full lg:w-auto">
                  <Button
                    href="https://www.meetup.com/zurich-js"
                    variant="primary"
                    size="md"
                    className="bg-white hover:bg-js !text-black hover:text-black font-semibold cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl px-4 sm:px-6 border border-white min-h-[48px] touch-manipulation w-full sm:w-auto"
                  >
                    Join the Meetup Group
                  </Button>
                  
                  <Button
                    href="/events"
                    variant="outline"
                    size="md"
                    className="border-2 border-white/70 text-white hover:bg-js hover:!text-black cursor-pointer transition-all duration-200 font-medium px-4 sm:px-6 hover:border-js min-h-[48px] touch-manipulation w-full sm:w-auto"
                  >
                    Browse Events
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
