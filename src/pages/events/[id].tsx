import { Disclosure, DisclosurePanel, DisclosureButton } from '@headlessui/react';
import { atcb_action } from 'add-to-calendar-button-react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ExternalLink, ChevronLeft, ChevronRight, Building, Ticket, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import React, { Fragment, useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import EventFeedback from '@/components/ui/EventFeedback';
import EventInterestButton from '@/components/ui/EventInterestButton';
import ProductDemoHighlight from '@/components/ui/ProductDemoHighlight';
import TicketSelection from '@/components/workshop/TicketSelection';
import { FeatureFlags } from '@/constants';
import useEvents from '@/hooks/useEvents';
import { useStripePrice } from '@/hooks/useStripePrice';
import { getEventById, getUpcomingEvents, getPastEvents, Event } from '@/sanity/queries';
import { ProductDemo } from '@/types';
import { getRelatedWorkshops } from '@/utils/workshopEventMatcher';

interface EventDetailPageProps {
  event: Event & { duration?: number };
}

export default function EventDetail({ event }: EventDetailPageProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  const showNewsletter = useFeatureFlagEnabled(FeatureFlags.Newsletter);
  const { price: stripePrice } = useStripePrice(event.stripePriceId);
  const { track } = useEvents();

  // Check if we're in feedback mode
  const isFeedbackMode = router.query.feedback === 'true';

  // Get related workshops that occur on the same day or up to 48h before the event
  const relatedWorkshops = event.datetime ? getRelatedWorkshops(event.datetime) : [];

  // Calculate if event is upcoming
  const isUpcoming = new Date(event.datetime) > new Date();

  // Calculate available talk slots based on duration
  const regularTalks = event.talks.filter(talk => talk.durationMinutes && talk.durationMinutes >= 10);
  const lightningTalks = event.talks.filter(talk => talk.durationMinutes && talk.durationMinutes < 10);

  const hasRegularSlotAvailable = isUpcoming && regularTalks.length < 2;
  const hasLightningSlotAvailable = isUpcoming && lightningTalks.length < 1;
  const hasSlotsAvailable = hasRegularSlotAvailable || hasLightningSlotAvailable;

  // Set up client-side rendering flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Function to format date in CEST timezone
  const formatDateCEST = (date: string, options: Intl.DateTimeFormatOptions) => {
    // Create a date object
    const dateObj = new Date(date);

    // Format the date in CEST timezone (Europe/Zurich)
    return new Intl.DateTimeFormat('en-GB', {
      ...options,
      timeZone: 'Europe/Zurich'
    }).format(dateObj);
  };

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/google-maps?location=${encodeURIComponent(event.address || event.location)}`);
      const data = await response.json();
      setMapUrl(data.url);
    })();
  }, [event.address, event.location]);

  // Add animation for ticket section when scrolled to
  useEffect(() => {
    const handleScroll = () => {
      const ticketSection = document.getElementById('event-tickets-section');
      if (ticketSection) {
        const rect = ticketSection.getBoundingClientRect();
        // Check if the ticket section is in the viewport
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          ticketSection.classList.add('highlight-ticket');
        } else {
          ticketSection.classList.remove('highlight-ticket');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Add-to-calendar function
  const addToCalendar = () => {
    if (!event.datetime) return;

    // Track the calendar add event
    track('add_to_calendar', {
      event_id: event.id,
      event_title: event.title,
      event_date: event.datetime,
      is_pro_meetup: event.isProMeetup
    });

    // Create date objects using the event datetime
    const dateObj = new Date(event.datetime);

    // Duration in minutes (default: 3 hours = 180 minutes)
    const durationMinutes = event.duration || 180;

    // Format dates for calendar - ensure we use YYYY-MM-DD format
    const formatDate = (date: Date): string => {
      return date.toLocaleDateString('en-CA', {
        timeZone: 'Europe/Zurich'
      }); // en-CA uses YYYY-MM-DD format
    };

    // Format time with hours and minutes in 24-hour format (HH:MM)
    const formatTime = (date: Date): string => {
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Zurich'
      });
    };

    // Get start time components in Zurich timezone
    const startDate = formatDate(dateObj);
    const startTime = formatTime(dateObj);

    // Calculate end time
    // Create a date object using the formatted date and time strings to ensure timezone consistency
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    let endDate = startDate; // Usually same day for most events

    // Calculate end hours and minutes
    let endHours = startHours + Math.floor(durationMinutes / 60);
    let endMinutes = startMinutes + (durationMinutes % 60);

    // Adjust for minute overflow
    if (endMinutes >= 60) {
      endHours += 1;
      endMinutes -= 60;
    }

    // Handle next day overflow (if event runs past midnight)
    if (endHours >= 24) {
      // Create a new date object for the end date by adding one day
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + Math.floor(endHours / 24));
      endDate = formatDate(nextDay);
      endHours = endHours % 24;
    }

    // Format end time properly with leading zeros
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    // Debug logging to help troubleshoot timezone issues
    console.log('Calendar event details:', {
      original: {
        datetime: event.datetime,
        dateObj: dateObj.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      formatted: {
        startDate,
        startTime,
        endDate,
        endTime,
        targetTimezone: 'Europe/Zurich'
      }
    });

    atcb_action({
      name: event.title,
      startDate,
      endDate,
      startTime,
      endTime,
      location: event.location || 'TBD',
      description: event.description || `ZurichJS event: ${event.title}`,
      options: ['Apple', 'Google', 'iCal', 'Microsoft365', 'Outlook.com', 'Yahoo'],
      timeZone: 'Europe/Zurich',
      iCalFileName: `zurichjs-event-${event.id}`,
      buttonStyle: 'date'
    });
  };

  // Share event function
  const shareEvent = async () => {
    // Create base URL
    const baseUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.id}`;

    // Add UTM parameters for tracking
    const utmParams = new URLSearchParams({
      utm_source: 'share_button',
      utm_medium: 'social',
      utm_campaign: 'event_share',
      utm_content: event.id
    }).toString();

    // Complete share URL with UTM parameters
    const shareUrl = `${baseUrl}?${utmParams}`;

    // Format the date for sharing in CEST timezone
    const formattedDate = isClient && event.datetime
      ? formatDateCEST(event.datetime, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'TBD';

    const shareText = `Join me at ${event.title} on ${formattedDate} with ZurichJS!`;

    // Track share event
    track('share_event', {
      event_id: event.id,
      event_title: event.title,
      share_method: typeof navigator !== 'undefined' && 'share' in navigator ? 'web_share_api' : 'clipboard'
    });

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
        // Track successful share via Web Share API
        track('share_completed', {
          event_id: event.id,
          method: 'web_share_api'
        });
      } catch (err) {
        console.error('Error sharing:', err);
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      console.error('Clipboard API not available');
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        // Track successful clipboard copy
        track('share_completed', {
          event_id: event.id,
          method: 'clipboard'
        });
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Prevent scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopySuccess(true);
            track('share_completed', {
              event_id: event.id,
              method: 'clipboard_fallback'
            });
            setTimeout(() => setCopySuccess(false), 2000);
          }
        } catch (err) {
          console.error('Fallback clipboard copy failed:', err);
        }

        document.body.removeChild(textarea);
      });
  };

  return (
    <Layout>
      <style jsx global>{`
        @keyframes pulseHighlight {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .highlight-ticket {
          animation: pulseHighlight 2s ease-in-out 1;
        }
      `}</style>

      <SEO
        title={`${event.title} | ZurichJS`}
        description={`Join us for ${event.title} on ${new Date(event.datetime).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })} at ${event.location}. ${event.description.slice(0, 120)}...`}
        openGraph={{
          title: `${event.title} | ZurichJS`,
          description: event.description.slice(0, 120) + '...',
          type: 'website',
          image: event.image ? `${event.image}?h=300` : '',
          url: `/events/${event.id}`
        }}
      />

        {/* Hero Section */}
        <Section variant="gradient">
          <div className="mb-4">
            <Link href="/events" className="inline-flex items-center text-black hover:underline">
              <ChevronLeft size={16} className="mr-1" />
              Back to all events
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:w-1/2 w-full"
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {isUpcoming ? (
                  <div className="bg-black text-js inline-block px-3 py-1 rounded-full text-sm font-bold">
                    🔥 Upcoming Event!
                  </div>
                ) : (
                  <div className="bg-black text-js inline-block px-3 py-1 rounded-full text-sm font-bold">
                    📅 Past Event
                  </div>
                )}
                {event.isProMeetup && (
                  <div className="bg-zurich text-white inline-block px-3 py-1 rounded-full text-sm font-bold">
                    🌟 Pro Meetup
                  </div>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {event.title}
              </h1>

              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                  <Calendar size={16} className="mr-1.5" />
                    <span>{isClient && event.datetime
                      ? formatDateCEST(event.datetime, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Date TBD'}
                    </span>
                </div>
                <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                  <Clock size={16} className="mr-1.5" />
                  <span>{isClient && event.datetime
                    ? `${formatDateCEST(event.datetime, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} CEST`
                    : 'Time TBD'}
                  </span>
                </div>
                <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                  <MapPin size={16} className="mr-1.5" />
                  <span>{event.location || 'Location TBD'}</span>
                </div>
                {isUpcoming && (
                  <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                    <Users size={16} className="mr-1.5" />
                    {event.attendees > 0 ? <span>{event.attendees} attending</span> : <span>Be one of the first to sign up!</span>}
                  </div>
                )}
              </div>

              {event.description ? (
                <div className="text-lg mb-6 whitespace-pre-line">
                  {event.description}
                </div>
              ) : (
                <div className="text-lg mb-6">
                  <p className="italic">We&apos;re working on bringing this event to life! Check back soon for more details on this exciting JavaScript gathering.</p>
                  <div className="mt-2 flex items-center text-black text-sm">
                    <span className="animate-pulse">⏳ Coming soon...</span>
                  </div>
                  <div className="mt-4 p-4 bg-white bg-opacity-70 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Want to be the first to know?</strong> Register your interest below and we&apos;ll notify you as soon as {event.isProMeetup ? 'tickets' : 'RSVP'} opens!
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {isUpcoming && (event.isProMeetup ? event.stripePriceId : event.meetupUrl) ? (
                  event.isProMeetup ? (
                    <Button
                      onClick={() => {
                        const ticketSection = document.getElementById('event-tickets-section');
                        if (ticketSection) {
                          ticketSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      variant="primary"
                      size="lg"
                      className="bg-zurich text-white hover:bg-blue-600"
                    >
                      Get Tickets 🎟️
                    </Button>
                  ) : (
                    <Button
                      href={event.meetupUrl}
                      variant="primary"
                      size="lg"
                      className="bg-black text-js hover:bg-gray-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      RSVP on Meetup 🚀
                    </Button>
                  )
                ) : isUpcoming && (
                  <EventInterestButton
                    eventId={event.id}
                    eventTitle={event.title}
                    variant="primary"
                    size="lg"
                    className="bg-black text-js hover:bg-gray-800"
                  />
                )}

                {isClient && (
                  <Button
                    onClick={shareEvent}
                    variant="outline"
                    className="border-black text-black hover:bg-black hover:text-js"
                  >
                    <Share2 size={16} className="mr-1.5" />
                    {copySuccess ? 'Link copied! 👍' : 'Share event'}
                  </Button>
                )}

                {isClient && event.datetime && (
                  <Button
                    onClick={() => {
                      track('calendar_button_click', {
                        event_id: event.id,
                        source: 'hero_section'
                      });
                      addToCalendar();
                    }}
                    variant="outline"
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none hover:from-purple-600 hover:to-indigo-700"
                  >
                    <Calendar size={16} className="mr-1.5" />
                    Add to Calendar
                  </Button>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-1/2 w-full"
            >
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden shadow-lg">
                {event.image ? (
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="text-5xl mb-3">⚛️</div>
                      <h3 className="text-xl font-bold text-white mb-3">{event.title}</h3>
                      <div className="mt-3 flex justify-center space-x-3">
                        <span className="text-2xl">🚀</span>
                        <span className="text-2xl">💻</span>
                        <span className="text-2xl">🔥</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Related Workshops Cross-Promotion - Compact Banner */}
          {relatedWorkshops.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8"
            >
              {relatedWorkshops.map((workshop) => (
                <Link
                  key={workshop.id}
                  href={`/workshops/${workshop.id}`}
                  className="block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 p-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-grow">
                      <span className="text-2xl">🎓</span>
                      <div>
                        <p className="text-white font-bold text-sm md:text-base">{workshop.title}</p>
                        <p className="text-blue-100 text-xs md:text-sm">
                          {workshop.dateInfo} • {workshop.timeInfo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-md transition-colors">
                      <span className="text-white text-xs md:text-sm font-medium">View Workshop</span>
                      <ChevronRight size={16} className="text-white" />
                    </div>
                  </div>
                </Link>
              ))}
            </motion.div>
          )}

          {/* Add spacing between the event image and content below */}
          <div className="mt-16"></div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Main Content */}
            <div className="lg:w-2/3">
              {/* Feedback Section - Only shows when in feedback mode */}
              <EventFeedback
                event={{
                  id: event.id,
                  title: event.title,
                  datetime: event.datetime,
                  talks: event.talks.map(talk => ({
                    id: talk.id,
                    title: talk.title,
                    productDemo: talk.productDemo as unknown as ProductDemo,
                    productDemos: talk.productDemos as unknown as ProductDemo[],
                    speakers: talk.speakers
                  }))
                }}
                isFeedbackMode={isFeedbackMode}
              />

              {/* Feedback Button for Past Events */}
              {!isUpcoming && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="mb-10"
                >
                  <Link
                    href={`/events/${event.id}?feedback=true`}
                    className="inline-flex items-center bg-zurich hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Leave Feedback for This Event
                  </Link>
                </motion.div>
              )}

              {/* Schedule */}
              {event.talks.length > 0 && (
                <Section id="schedule" variant="white" className="rounded" padding="sm">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-2xl font-bold mb-3 py-2">
                      Event Schedule
                    </h2>
                    <p className="text-sm text-gray-500 italic mb-6">Times are estimates and subject to change</p>

                    {(() => {
                      // Schedule generation logic
                      const getTypeColor = (type?: string, durationMins?: number) => {
                        if (durationMins && durationMins < 10) {
                          return 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800';
                        }
                        switch (type?.toLowerCase()) {
                          case 'talk':
                          case 'presentation':
                            return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800';
                          case 'break':
                          case 'networking':
                            return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800';
                          case 'welcome':
                          case 'opening':
                            return 'bg-gradient-to-r from-js/20 to-yellow-100 text-yellow-900';
                          case 'closing':
                          case 'wrap-up':
                            return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800';
                          default:
                            return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800';
                        }
                      };

                      const getTypeEmoji = (type?: string, durationMins?: number) => {
                        if (durationMins && durationMins < 10) return '⚡';
                        switch (type?.toLowerCase()) {
                          case 'talk':
                          case 'presentation': return '🎤';
                          case 'break':
                          case 'networking': return '🍕';
                          case 'welcome':
                          case 'opening': return '👋';
                          case 'closing':
                          case 'wrap-up': return '🎉';
                          default: return '📋';
                        }
                      };

                      // Create schedule from event data with proper timing
                      const eventDate = new Date(event.datetime);

                      // Doors open: 17:30-18:30
                      const doorsOpenTime = new Date(eventDate);
                      doorsOpenTime.setHours(17, 30, 0, 0);

                      // Welcome & intro: 18:30-18:45
                      const welcomeTime = new Date(eventDate);
                      welcomeTime.setHours(18, 30, 0, 0);

                      // First talk starts at 18:50
                      const firstTalkTime = new Date(eventDate);
                      firstTalkTime.setHours(18, 50, 0, 0);

                      const baseSchedule = [
                        {
                          time: doorsOpenTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }),
                          title: "Doors Open",
                          type: "welcome",
                          durationMins: 60,
                          speaker: undefined,
                          speakerIds: undefined,
                          talkId: undefined
                        },
                        {
                          time: welcomeTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }),
                          title: "Welcome & Intro",
                          type: "opening",
                          durationMins: 15,
                          speaker: undefined,
                          speakerIds: undefined,
                          talkId: undefined
                        }
                      ];

                      // Add talks from Sanity data with proper timing and break logic
                      let currentTime = firstTalkTime.getTime();
                      const talksSchedule: Array<{
                        time: string;
                        title: string;
                        speaker?: string;
                        speakerIds?: string[];
                        type: string;
                        durationMins: number;
                        talkId?: string;
                      }> = [];

                      event.talks.forEach((talk, index) => {
                        const talkTime = new Date(currentTime);
                        const duration = talk.durationMinutes || 20;

                        const scheduleItem = {
                          time: talkTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }),
                          title: talk.title,
                          speaker: talk.speakers.map(s => s.name).join(', '),
                          speakerIds: talk.speakers.map(s => s.id),
                          type: talk.type || 'talk',
                          durationMins: duration,
                          talkId: talk.id
                        };

                        talksSchedule.push(scheduleItem);
                        currentTime += duration * 60000; // Add talk duration

                        // Add 15 min break after 2 talks (index 1 means 2nd talk, 0-indexed)
                        if (index === 1) {
                          const breakTime = new Date(currentTime);
                          talksSchedule.push({
                            time: breakTime.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            }),
                            title: "Pizza Break",
                            type: "break",
                            durationMins: 15,
                            speaker: undefined,
                            speakerIds: undefined,
                            talkId: undefined
                          });
                          currentTime += 15 * 60000; // Add break duration
                        } else if (index < event.talks.length - 1) {
                          // Add 5 min buffer between other talks
                          currentTime += 5 * 60000;
                        }
                      });

                      // Add networking at the end - starts after last talk, ends at 21:30
                      const networkingStartTime = new Date(currentTime + 5 * 60000); // 5 min buffer after last talk
                      const networkingEndTime = new Date(eventDate);
                      networkingEndTime.setHours(21, 30, 0, 0);

                      // Calculate networking duration from start time to 21:30
                      const networkingDuration = Math.max(30, Math.round((networkingEndTime.getTime() - networkingStartTime.getTime()) / 60000));

                      const endSchedule = [{
                        time: networkingStartTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        }),
                        title: "Networking & Drinks",
                        type: "closing",
                        durationMins: networkingDuration,
                        speaker: undefined,
                        speakerIds: undefined,
                        talkId: undefined
                      }];

                      const schedule = [...baseSchedule, ...talksSchedule, ...endSchedule];

                      return (
                        <div className="space-y-3">
                          {schedule.map((item, index) => {
                            const isTalk = item.talkId !== undefined;
                            const talk = isTalk ? event.talks.find(t => t.id === item.talkId) : null;

                            if (isTalk && talk) {
                              return (
                                <Disclosure key={index}>
                                  {({ open }) => (
                                    <div className={`bg-white rounded-lg overflow-hidden border transition-all duration-200 ${
                                      open ? 'border-zurich shadow-lg' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                                    }`}>
                                      <DisclosureButton className="w-full p-3 sm:p-4 text-left">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="bg-black text-js px-2 py-1 rounded-md text-xs font-bold min-w-[50px] text-center flex-shrink-0">
                                              {item.time}
                                            </div>

                                            <div className={`px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0 ${getTypeColor(item.type, item.durationMins)}`}>
                                              <span className="sm:hidden">{getTypeEmoji(item.type, item.durationMins)}</span>
                                              <span className="hidden sm:inline">{getTypeEmoji(item.type, item.durationMins)} {item.type || 'Event'}</span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            {item.durationMins && (
                                              <div className="text-xs text-gray-500 font-medium">
                                                {item.durationMins}m
                                              </div>
                                            )}

                                            <ChevronDown className={`h-5 w-5 text-zurich transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                                          </div>
                                        </div>

                                        <div className="mt-2">
                                          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                                            {item.title}
                                          </h3>

                                          {item.speaker && (
                                            <div className="text-xs sm:text-sm text-gray-600 mt-1">
                                              {item.speakerIds && item.speakerIds.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                  {item.speakerIds.map((speakerId: string, speakerIndex: number) => {
                                                    const speakerName = item.speaker!.split(', ')[speakerIndex];
                                                    return (
                                                      <span key={speakerId} className="text-zurich font-bold">
                                                        {speakerName}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-zurich font-bold">{item.speaker}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </DisclosureButton>

                                      <DisclosurePanel>
                                        {() => (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                                            className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100"
                                          >
                                            {talk.description && (
                                              <p className="text-gray-700 mb-4 mt-3">
                                                {talk.description.split('\n').map((line, i) => (
                                                  <Fragment key={i}>
                                                    {line}
                                                    {i < talk.description!.split('\n').length - 1 && <br />}
                                                  </Fragment>
                                                ))}
                                              </p>
                                            )}

                                            <div className="space-y-3 mb-4">
                                              <h4 className="font-semibold text-gray-700 text-sm">
                                                {talk.speakers.length === 1 ? 'Speaker:' : 'Speakers:'}
                                              </h4>
                                              {talk.speakers.map((speaker) => (
                                                <div key={speaker.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                    <Image
                                                      src={speaker.image ? `${speaker.image}?h=150` : '/images/speakers/default.jpg'}
                                                      alt={speaker.name}
                                                      fill
                                                      className="object-cover"
                                                    />
                                                  </div>
                                                  <div className="flex-grow">
                                                    <div className="font-bold">{speaker.name}</div>
                                                    <div className="text-gray-600 text-sm">{speaker.title}</div>
                                                  </div>
                                                  <Link
                                                    href={`/speakers/${speaker.id}`}
                                                    className="flex-shrink-0 inline-flex items-center text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                                                  >
                                                    <ExternalLink size={14} className="mr-1" />
                                                    View Profile
                                                  </Link>
                                                </div>
                                              ))}
                                            </div>

                                            {(!isUpcoming && (talk.slides || talk.videoUrl)) && (
                                              <div className="flex flex-wrap gap-2 mb-4">
                                                {talk.slides && (
                                                  <a
                                                    href={talk.slides}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                                                  >
                                                    <ExternalLink size={14} className="mr-1" />
                                                    Slides
                                                  </a>
                                                )}

                                                {talk.videoUrl && (
                                                  <a
                                                    href={talk.videoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
                                                  >
                                                    <ExternalLink size={14} className="mr-1" />
                                                    Video Recording
                                                  </a>
                                                )}
                                              </div>
                                            )}

                                            {(talk.productDemos?.length || talk.productDemo) && (
                                              <div className="pt-3 border-t border-gray-100">
                                                <ProductDemoHighlight
                                                  productDemos={talk.productDemos?.length
                                                    ? talk.productDemos as unknown as ProductDemo[]
                                                    : [talk.productDemo as unknown as ProductDemo]
                                                  }
                                                  isUpcoming={isUpcoming}
                                                />
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </DisclosurePanel>
                                    </div>
                                  )}
                                </Disclosure>
                              );
                            }

                            // Non-talk items (doors open, breaks, networking)
                            return (
                              <div
                                key={index}
                                className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 sm:p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="bg-black text-js px-2 py-1 rounded-md text-xs font-bold min-w-[50px] text-center flex-shrink-0">
                                      {item.time}
                                    </div>

                                    <div className={`px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0 ${getTypeColor(item.type, item.durationMins)}`}>
                                      <span className="sm:hidden">{getTypeEmoji(item.type, item.durationMins)}</span>
                                      <span className="hidden sm:inline">{getTypeEmoji(item.type, item.durationMins)} {item.type || 'Event'}</span>
                                    </div>
                                  </div>

                                  {item.durationMins && (
                                    <div className="text-xs text-gray-500 font-medium flex-shrink-0">
                                      {item.durationMins}m
                                    </div>
                                  )}
                                </div>

                                <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight mt-2">
                                  {item.title}
                                </h3>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </motion.div>
                </Section>
              )}


              {/* Submit a Talk CTA (for upcoming events) */}
              {isUpcoming && hasSlotsAvailable && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gradient-to-r from-yellow-50 to-amber-50 p-5 rounded-lg shadow-md mb-12 border-l-4 border-yellow-400"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎤</span>
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold mb-2">Open Speaking Slots</h3>
                      <p className="text-sm mb-3">
                        {hasRegularSlotAvailable && hasLightningSlotAvailable && (
                          <span>Regular talks (20-30 mins) and lightning talks (5-10 mins) available.</span>
                        )}
                        {hasRegularSlotAvailable && !hasLightningSlotAvailable && (
                          <span>{2 - regularTalks.length} regular talk slot{regularTalks.length === 1 ? '' : 's'} (20-30 mins) available.</span>
                        )}
                        {!hasRegularSlotAvailable && hasLightningSlotAvailable && (
                          <span>1 lightning talk slot (5-10 mins) available.</span>
                        )}
                      </p>
                      <Button href="/cfp" variant="primary" size="sm" className="bg-black text-js hover:bg-gray-800" target="_blank" rel="noopener noreferrer">
                        Submit Proposal
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* No Slots Available Message */}
              {isUpcoming && !hasSlotsAvailable && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gray-50 p-4 rounded-lg shadow-sm mb-12 border-l-4 border-gray-300"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✓</span>
                    <div>
                      <h3 className="text-base font-bold mb-1">All Slots Filled</h3>
                      <p className="text-sm text-gray-700 mb-3">
                        This event is full. Submit a proposal for future events.
                      </p>
                      <Button href="/cfp" variant="outline" size="sm" className="border-black text-black hover:bg-black hover:text-js" target="_blank" rel="noopener noreferrer">
                        Submit for Future Events
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:w-1/3 mt-10 lg:mt-0">
              {/* Venue Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white p-6 rounded-lg shadow-md mb-8"
              >
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <MapPin className="mr-2 text-yellow-500" size={20} />
                  Venue Details
                </h3>

                {event.location && !event.location.toLowerCase().includes('tbd') ? (
                  <>
                    <p className="font-bold mb-2">{event.location}</p>
                    {event.address && <p className="text-gray-600 mb-5">{event.address}</p>}

                    <div className="relative h-48 sm:h-56 w-full rounded-lg overflow-hidden mb-5">
                      {mapUrl ? (
                        <Image
                          src={mapUrl}
                          alt={`Map of ${event.location}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <p className="text-gray-500">Map loading...</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-600 hover:text-yellow-700 font-medium flex items-center"
                      >
                        Get Directions
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-3 italic">Venue details coming soon!</p>
                    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-5">
                      <div className="text-center">
                        <MapPin size={40} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">Location to be announced</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 animate-pulse mb-4">⏳ We&apos;re finalizing the perfect spot...</p>

                    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-700 mb-2">Want to host this event? 🏢</h4>
                      <p className="text-sm text-gray-700 mb-3">
                        Have a cool office space? Hosting a ZurichJS meetup is a great way to showcase your company and connect with the JavaScript community!
                      </p>
                      <Link href="/partnerships#sponsorship-tiers" className="inline-flex items-center text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded-md hover:bg-blue-200 transition-colors" target="_blank" rel="noopener noreferrer">
                        <Building size={16} className="mr-2" />
                        Partner with us as a Venue Host
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Save the Date (Add new section for upcoming events) */}
              {isUpcoming && event.datetime && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-lg shadow-md mb-8 text-white"
                >
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <Calendar className="mr-2" size={20} />
                    Save the Date
                  </h3>
                  <p className="mb-4">Don&apos;t miss this event! Add it to your calendar to get notified.</p>

                  {isClient && (
                    <button
                      onClick={() => {
                        track('calendar_button_click', {
                          event_id: event.id,
                          source: 'save_the_date_section'
                        });
                        addToCalendar();
                      }}
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                    >
                      <Calendar size={18} className="mr-2" />
                      Add to My Calendar
                    </button>
                  )}
                </motion.div>
              )}


              {/* What to Bring - Collapsible */}
              {isUpcoming && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="mb-8"
                >
                  <details className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <summary className="cursor-pointer font-bold text-lg flex items-center justify-between list-none p-4 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">💼</span>
                        <span>What to Bring</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-normal">Click to expand</span>
                        <ChevronRight size={18} className="transition-transform group-open:rotate-90 text-blue-600" />
                      </div>
                    </summary>
                    <ul className="px-4 pb-4 pt-2 space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        <span>Your curious JavaScript mind!</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        <span>Questions for speakers</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        <span>Business cards for networking</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        <span>Laptop (optional)</span>
                      </li>
                    </ul>
                  </details>
                </motion.div>
              )}

              {/* Pro Meetup Info */}
              {event.isProMeetup && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="bg-blue-50 p-6 rounded-lg shadow-md mb-8 border-l-4 border-zurich"
                >
                  <h3 className="text-xl font-bold mb-4 text-zurich flex items-center">
                    <span className="mr-2">🌟</span>
                    Pro Meetup Event
                  </h3>
                  <div className="text-gray-700">
                    <p className="mb-3">
                      This is a premium ZurichJS Pro Meetup featuring world-class speakers and exclusive content.
                    </p>
                    <details className="mb-3">
                      <summary className="font-medium text-zurich cursor-pointer">What is a Pro Meetup?</summary>
                      <div className="mt-2 pl-4 text-sm">
                        <p className="mb-2">
                          Pro Meetups are premium JavaScript events featuring world-class speakers who often travel from abroad to share their expertise with our community.
                        </p>
                        <p className="mb-2">
                          These special events require:
                        </p>
                        <ul className="list-disc pl-5 mb-2 space-y-1">
                          <li>Ticket purchase to secure your spot and support speaker travel costs</li>
                          <li>Higher commitment to attend to prevent no-shows</li>
                          <li>Additional venue and catering arrangements</li>
                        </ul>
                        <p>
                          Your support helps us bring exceptional JavaScript talent to Zurich and create memorable learning experiences!
                        </p>
                      </div>
                    </details>

                    {/* Financial Support Notice */}
                    <details className="mt-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-zurich/30 shadow-sm overflow-hidden">
                      <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                        <h4 className="font-semibold text-blue-700 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Need Financial Support?
                        </h4>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </summary>
                      <div className="px-4 pb-4">
                        <p className="text-sm text-gray-700 mb-3">
                          Don&apos;t let cost be a barrier to learning. We offer scholarships, discounts, and special rates for underrepresented groups, career changers, and those with accessibility needs.
                        </p>
                        <a
                          href="mailto:hello@zurichjs.com"
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Get in Touch for Support Options
                        </a>
                      </div>
                    </details>

                    {isUpcoming && event.stripePriceId && (
                      <div id="event-tickets-section" className="mt-5 bg-white p-5 rounded-lg shadow-md border-t-4 border-zurich">
                        <h4 className="text-xl font-bold mb-3 text-center flex items-center justify-center">
                          <Ticket className="mr-2 text-zurich" size={22} />
                          Secure Your Spot
                        </h4>
                        <div className="bg-blue-50 p-3 rounded-lg mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-800">Date:</span>
                            <span className="text-black">{isClient && event.datetime
                              ? formatDateCEST(event.datetime, {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'Date TBD'}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-800">Time:</span>
                            <span className="text-black">{isClient && event.datetime
                              ? `${formatDateCEST(event.datetime, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} CEST`
                              : 'Time TBD'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-800">Location:</span>
                            <span className="text-black">{event.location || 'Location TBD'}</span>
                          </div>
                        </div>
                        <TicketSelection
                          options={[{
                            id: event.stripePriceId,
                            title: 'Pro Meetup Ticket',
                            description: `Access to ${event.title}`,
                            price: stripePrice ? stripePrice.unitAmount / 100 : 0,
                            features: [
                              'Full access to the pro meetup',
                              'Networking opportunities',
                              'Food and drinks included',
                              'Q&A sessions with speakers'
                            ],
                            autoSelect: true,
                            ticketType: 'event',
                            eventId: event.id
                          }]}
                          eventId={event.id}
                          ticketType="event"
                          buttonText="Complete Purchase"
                          className="max-w-lg mx-auto"
                        />
                        <p className="mt-4 text-sm text-center text-gray-600">
                          Tickets are non-refundable but can be transferred to someone else.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Call to Action */}
              {isUpcoming && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className={`${event.isProMeetup ? 'bg-blue-100' : 'bg-js'} p-5 rounded-lg shadow-md text-center`}
                >
                  <h3 className="text-lg font-bold mb-3">
                    {event.datetime ? (
                      event.isProMeetup ? (
                        event.stripePriceId ? 'Secure Your Spot 🎟️' : "Registration Opening Soon"
                      ) : (
                        event.meetupUrl ? 'Reserve Your Spot 🚀' : "Details Coming Soon"
                      )
                    ) : (
                      'Save the Date'
                    )}
                  </h3>
                  {event.isProMeetup ? (
                    event.stripePriceId ? (
                      <Button
                        onClick={() => {
                          const ticketSection = document.getElementById('event-tickets-section');
                          if (ticketSection) {
                            ticketSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        variant="primary"
                        size="lg"
                        className="w-full bg-zurich text-white hover:bg-blue-600"
                      >
                        Get Your Ticket
                      </Button>
                    ) : (
                      <EventInterestButton
                        eventId={event.id}
                        eventTitle={event.title}
                        variant="primary"
                        size="lg"
                        className="w-full bg-zurich text-white hover:bg-blue-600"
                      />
                    )
                  ) : (
                    event.meetupUrl ? (
                      <Button
                        href={event.meetupUrl}
                        variant="primary"
                        size="lg"
                        className="w-full bg-black text-js hover:bg-gray-800"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        RSVP on Meetup
                      </Button>
                    ) : (
                      <EventInterestButton
                        eventId={event.id}
                        eventTitle={event.title}
                        variant="primary"
                        size="lg"
                        className="w-full bg-black text-js hover:bg-gray-800"
                      />
                    )
                  )}
                </motion.div>
              )}

              {/* Feedback Mode Notice */}
              {isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-blue-50 p-6 rounded-lg shadow-md"
                >
                  <h3 className="text-xl font-bold mb-3">Feedback Mode 📝</h3>
                  <p className="mb-4">
                    You&apos;re currently in feedback mode. Please rate the talks to help us improve future events and provide valuable insights to our speakers.
                  </p>
                  <p className="text-sm text-blue-600">
                    Your feedback will remain anonymous to speakers and will only be used to improve our community events. You can submit feedback at any time.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </Section>

        {/* Newsletter Section */}
        {showNewsletter && !isFeedbackMode && (
          <Section variant="gradient">
              <motion.div
                  initial={{opacity: 0, y: 20}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5}}
                  className="bg-black text-white rounded-lg p-8 shadow-md"
              >
                <div className="md:flex items-center justify-between">
                  <div className="md:w-3/5 mb-6 md:mb-0">
                    <h2 className="text-2xl font-bold mb-2 text-js">Never Miss a JavaScript Gathering! 📬</h2>
                    <p className="text-lg">
                      Subscribe to our newsletter and be the first to know about upcoming events, speaker announcements, and community news!
                    </p>
                  </div>
                  <div className="md:w-2/5">
                    <div className="flex">
                      <input
                          type="email"
                          placeholder="your@email.com"
                          className="flex-grow px-4 py-3 rounded-l-md focus:outline-none focus:ring-2 focus:ring-js"
                      />
                      <button className="bg-js text-black px-6 py-3 rounded-r-md font-bold hover:bg-yellow-300 transition-colors">
                        Subscribe
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Section>
          )}
    </Layout>
  );
}

export async function getStaticPaths() {
  // This would be replaced with actual CMS fetching
  const upcomingEvents = await getUpcomingEvents();
  const pastEvents = await getPastEvents();

  const paths = [
    ...upcomingEvents.map((event: Event) => ({
      params: {id: event.id},
    })),
    ...pastEvents.map((event: Event) => ({
      params: {id: event.id},
    })),
  ];

  return {
    paths,
    fallback: 'blocking', // Show a loading state for events not generated at build time
  };
}

export async function getStaticProps({params}: { params: { id: string } }) {
  // This would be replaced with actual CMS fetching based on the id
  const {id} = params;
  const event = await getEventById(id);

  return {
    props: {event},
  };
}
