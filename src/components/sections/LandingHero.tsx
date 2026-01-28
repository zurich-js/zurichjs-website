import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import Link from 'next/link';
import { useState, useEffect } from "react";

import type { Workshop } from "@/components/sections/UpcomingWorkshops";
import useEvents from "@/hooks/useEvents";
import { Event } from "@/sanity/queries";
import { Speaker } from "@/types";

// Design tokens from spec
const COLORS = {
  primaryBlue: '#1D4ED8',
  pageYellow: '#F0DC62',
  nextEventPillYellow: '#FDC700',
  workshopPillBg: '#DBEAFE',
  workshopPillText: '#1D4ED8',
  darkNavy: '#0F172A',
};

const CONF_URL = 'https://conf.zurichjs.com';
const UTM_PARAMS = '?utm_source=zurichjs&utm_medium=website&utm_campaign=conf2026&utm_content=hero';

interface StatsData {
  members: number;
  eventsHosted: number;
  speakersToDate: number;
  totalAttendees: number;
}

interface LandingHeroProps {
  upcomingEvents: Event[];
  stats: StatsData;
  upcomingWorkshops: Workshop[];
  speakers: Speaker[];
}

export default function LandingHero({
  upcomingEvents,
  upcomingWorkshops,
}: LandingHeroProps) {
  const { track } = useEvents();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get the next event
  const nextEvent = upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  // Get the next workshop
  const nextWorkshop = upcomingWorkshops && upcomingWorkshops.length > 0 ? upcomingWorkshops[0] : null;

  // Format event date
  const formatEventDate = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Track event handlers
  const handleJoinMeetupClick = () => {
    track('button_click', { name: 'join_next_meetup' });
  };

  const handleViewAllEventsClick = () => {
    track('button_click', { name: 'view_all_events' });
  };

  const handleViewEventDetailsClick = () => {
    track('button_click', { name: 'view_event_details' });
  };

  const handleReserveSpotClick = (eventTitle: string) => {
    track('event_rsvp', {
      name: 'reserve_spot',
      eventTitle: eventTitle
    });
  };

  const handleSubmitTalkClick = () => {
    track('button_click', { name: 'submit_talk' });
  };

  const handleWorkshopClick = (workshopTitle: string) => {
    track('workshop_click', {
      name: 'hero_workshop_click',
      workshopTitle: workshopTitle
    });
  };

  const handleConfClick = () => {
    track('button_click', { name: 'visit_conference_website' });
  };

  return (
    <section
      className="w-full py-12 lg:py-24"
      style={{ backgroundColor: COLORS.pageYellow }}
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column - Brand, tagline, conference promo, buttons */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col order-1"
          >
            {/* Brand Row */}
            <div className="flex items-center gap-4 mb-4">
              {/* ZurichJS Logo Mark */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 95 95"
                className="w-12 h-12 lg:w-16 lg:h-16 flex-shrink-0"
                aria-hidden="true"
              >
                <path d="M0 0L95 95H0V0Z" fill="#258BCC"/>
                <path d="M95 95L0 0H95V95Z" fill="white"/>
              </svg>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-black">
                Zürich JS
              </h1>
            </div>

            {/* Tagline */}
            <div className="mb-8">
              <p className="text-xl lg:text-2xl font-medium text-black mb-1">
                Where Zurich&apos;s JavaScript wizards unite!
              </p>
              <p className="text-lg lg:text-xl text-black/80">
                Join our vibrant community of developers.
              </p>
            </div>

            {/* Conference Promo Card - Hidden on mobile, shown at bottom of left column on desktop */}
            <div className="hidden lg:block">
              <ConferencePromoCard onConfClick={handleConfClick} />
            </div>

            {/* Secondary Actions - Desktop */}
            <div className="hidden lg:flex items-center gap-4 mt-6">
              <Link
                href={nextEvent?.meetupUrl || '/events'}
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-black font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                onClick={handleJoinMeetupClick}
              >
                Join Next Meetup
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center text-black font-medium hover:underline focus:outline-none focus:underline"
                onClick={handleViewAllEventsClick}
              >
                View All Events
              </Link>
            </div>
          </motion.div>

          {/* Right Column - Upcoming Events */}
          <motion.div
            initial={isClient ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 flex flex-col order-3 lg:order-2"
          >
            {/* Section Label */}
            <h2 className="text-xs font-bold uppercase tracking-wider text-black/70 mb-4">
              Upcoming Meetups
            </h2>

            {/* Event Cards Container */}
            <div className="flex flex-col gap-4">
              {/* Next Event Card */}
              {nextEvent && (
                <EventCard
                  event={nextEvent}
                  formatDate={formatEventDate}
                  onReserveClick={handleReserveSpotClick}
                  onViewDetailsClick={handleViewEventDetailsClick}
                  onSubmitTalkClick={handleSubmitTalkClick}
                />
              )}

              {/* Workshop Card */}
              {nextWorkshop && (
                <WorkshopCard
                  workshop={nextWorkshop}
                  onWorkshopClick={handleWorkshopClick}
                />
              )}
            </div>

            {/* Secondary Actions - Mobile */}
            <div className="flex justify-center mt-4 lg:hidden">
              <Link
                href="/events"
                className="inline-flex items-center justify-center text-black font-medium hover:underline focus:outline-none focus:underline py-3"
                onClick={handleViewAllEventsClick}
              >
                View All Events
              </Link>
            </div>
          </motion.div>

          {/* Mobile: Conference Card (order 2 on mobile) */}
          <div className="lg:hidden order-2">
            <ConferencePromoCard onConfClick={handleConfClick} />
          </div>
        </div>
      </div>
    </section>
  );
}

// Conference Promo Card Component
function ConferencePromoCard({ onConfClick }: { onConfClick: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Conference Pill */}
      <span
        className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide text-white rounded-full mb-4"
        style={{ backgroundColor: COLORS.primaryBlue }}
      >
        Conference 2026
      </span>

      {/* Title */}
      <h3 className="text-2xl font-bold text-black mb-2">
        ZurichJS Conf
      </h3>

      {/* Description */}
      <p className="text-gray-600 mb-6">
        Our biggest event of the year. Join developers from across Europe.
      </p>

      {/* CTA Button */}
      <a
        href={`${CONF_URL}${UTM_PARAMS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-5 py-3 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 hover:opacity-90"
        style={{ backgroundColor: COLORS.primaryBlue }}
        onClick={onConfClick}
      >
        Visit Conference Website
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </div>
  );
}

// Event Card Component
function EventCard({
  event,
  formatDate,
  onReserveClick,
  onViewDetailsClick,
  onSubmitTalkClick
}: {
  event: Event;
  formatDate: (datetime: string) => string;
  onReserveClick: (title: string) => void;
  onViewDetailsClick: () => void;
  onSubmitTalkClick: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Next Meetup Pill */}
      <span
        className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide text-black rounded-full mb-4"
        style={{ backgroundColor: COLORS.nextEventPillYellow }}
      >
        Next Meetup
      </span>

      {/* Title */}
      <h3 className="text-xl lg:text-2xl font-bold text-black mb-4">
        {event.title}
      </h3>

      {/* Meta Info */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={18} aria-hidden="true" className="flex-shrink-0" />
          <span>{formatDate(event.datetime)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin size={18} aria-hidden="true" className="flex-shrink-0" />
          <span>{event.location}</span>
        </div>
      </div>

      {/* View Event Details Button - Mobile only */}
      <Link
        href={`/events/${event.id}`}
        className="block lg:hidden w-full text-center px-5 py-3 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 hover:opacity-90 mb-3"
        style={{ backgroundColor: COLORS.darkNavy }}
        onClick={onViewDetailsClick}
      >
        View Event Details
      </Link>

      {/* Reserve Button */}
      <a
        href={event.meetupUrl || `/events/${event.id}`}
        className="block w-full text-center px-5 py-3 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 hover:opacity-90 mb-4"
        style={{ backgroundColor: COLORS.darkNavy }}
        onClick={() => onReserveClick(event.title)}
      >
        Reserve Your Spot
      </a>

      {/* Submit Talk Link */}
      <Link
        href="/cfp/form"
        className="block text-center text-sm text-gray-600 hover:text-black transition-colors focus:outline-none focus:underline"
        onClick={onSubmitTalkClick}
      >
        Want to speak? Submit a talk
      </Link>
    </div>
  );
}

// Workshop Card Component
function WorkshopCard({
  workshop,
  onWorkshopClick
}: {
  workshop: Workshop;
  onWorkshopClick: (title: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Workshop Pill */}
      <span
        className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full mb-4"
        style={{
          backgroundColor: COLORS.workshopPillBg,
          color: COLORS.workshopPillText
        }}
      >
        Workshop
      </span>

      {/* Title */}
      <h3 className="text-xl font-bold text-black mb-4">
        {workshop.title}
      </h3>

      {/* Meta Info */}
      <div className="flex flex-col gap-1 mb-6 text-gray-600">
        <span>{workshop.dateInfo}</span>
        <span>{workshop.timeInfo}</span>
      </div>

      {/* Learn More Button */}
      <Link
        href={`/workshops/${workshop.id}`}
        className="block w-full text-center px-5 py-3 font-semibold rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-gray-50"
        style={{
          borderColor: COLORS.primaryBlue,
          color: COLORS.primaryBlue
        }}
        onClick={() => onWorkshopClick(workshop.title)}
      >
        Learn More
      </Link>
    </div>
  );
}
