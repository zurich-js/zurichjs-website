import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ExternalLink, ChevronLeft, Building } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useState, useEffect } from 'react';
import React from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import EventFeedback from '@/components/ui/EventFeedback';
import { FeatureFlags } from '@/constants';
import { getEventById, getUpcomingEvents, getPastEvents, Event } from '@/sanity/queries';




interface EventDetailPageProps {
  event: Event;
}

export default function EventDetail({ event }: EventDetailPageProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  const showNewsletter = useFeatureFlagEnabled(FeatureFlags.Newsletter);
  
  // Check if we're in feedback mode
  const isFeedbackMode = router.query.feedback === 'true';
  
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

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/google-maps?location=${encodeURIComponent(event.address || event.location)}`);
      const data = await response.json();
      setMapUrl(data.url);
    })();
  }, [event.address])

  // Share event function
  const shareEvent = async () => {
    const shareUrl = `${window.location.origin}/events/${event.id}`;

    // Format the date for sharing
    const eventDate = new Date(event.datetime);
    const formattedDate = eventDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const shareText = `Join me at ${event.title} on ${formattedDate} with ZurichJS!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
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
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <Layout>
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

      <div className="pt-20 bg-gradient-to-br from-js to-js-dark">
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
                      ? new Date(event.datetime).toLocaleDateString('en-GB', {
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
                    ? new Date(event.datetime).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
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
                <p className="text-lg mb-6">
                  {event.description}
                </p>
              ) : (
                <div className="text-lg mb-6">
                  <p className="italic">We&apos;re working on bringing this event to life! Check back soon for more details on this exciting JavaScript gathering.</p>
                  <div className="mt-2 flex items-center text-black text-sm">
                    <span className="animate-pulse">⏳ Coming soon...</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {isUpcoming && (event.isProMeetup ? event.ticketSaleUrl : event.meetupUrl) ? (
                  <Button
                    href={event.isProMeetup ? event.ticketSaleUrl : event.meetupUrl}
                    variant="primary"
                    size="lg"
                    className={`${event.isProMeetup ? 'bg-zurich' : 'bg-black'} text-js hover:${event.isProMeetup ? 'bg-blue-600' : 'bg-gray-800'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {event.isProMeetup ? 'Get Tickets' : 'RSVP on Meetup 🚀'}
                  </Button>
                ) : isUpcoming && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-black text-js hover:bg-gray-800 cursor-not-allowed"
                    disabled
                  >
                    Hold tight! {event.isProMeetup ? 'Tickets' : 'RSVP'} coming soon ⏳
                  </Button>
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
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-1/2 w-full"
            >
              <div className="relative h-64 sm:h-80 md:h-96 w-full rounded-lg overflow-hidden shadow-lg">
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
          
          {/* Add spacing between the event image and content below */}
          <div className="mt-16"></div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Main Content */}
            <div className="lg:w-2/3">
              {/* Feedback Section - Only shows when in feedback mode */}
              <EventFeedback 
                event={event} 
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

              {/* Talks */}
              {event.talks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="mb-12"
                >
                  <h2 className="text-2xl font-bold mb-6 py-2">
                    Amazing Talks at This Event 🎤
                  </h2>
                  <div className="space-y-8">
                    {event.talks.map((talk, index) => (
                      <motion.div
                        key={talk.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="bg-white p-6 rounded-lg shadow-md"
                      >
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
                              <h3 className="text-xl font-bold">{talk.title}</h3>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                                (!talk.durationMinutes || talk.durationMinutes < 10) 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {(!talk.durationMinutes || talk.durationMinutes < 15) ? '⚡ Lightning Talk' : '🎤 Regular Talk'}
                              </span>
                            </div>

                            {talk.description && (
                              <p className="text-gray-700 mb-4">
                                {talk.description?.split('\n').map((line, i) => (
                                  <React.Fragment key={i}>
                                    {line}
                                    {i < talk.description!.split('\n').length - 1 && <br />}
                                  </React.Fragment>
                                ))}
                              </p>
                            )}

                            <div className="mb-4 text-gray-600 flex items-center gap-3">
                              {talk.durationMinutes && (
                                <div className="flex items-center bg-gray-100 px-2 py-0.5 rounded-md">
                                  <Clock size={12} className="mr-1 text-gray-500" />
                                  <span className="text-sm font-medium">
                                    {talk.durationMinutes} min{talk.durationMinutes !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 mb-4">
                              <h4 className="font-semibold text-gray-700">
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
                                  <div className="flex-grow mt-2 sm:mt-0">
                                    <div className="font-bold">{speaker.name}</div>
                                    <div className="text-gray-600 text-sm">{speaker.title}</div>
                                  </div>
                                  <Link
                                    href={`/speakers/${speaker.id}`}
                                    className="mt-2 sm:mt-0 flex-shrink-0 inline-flex items-center text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                                  >
                                    <ExternalLink size={14} className="mr-1" />
                                    View Profile
                                  </Link>
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {/* Talk links here (slides, video recordings, etc.) */}
                              {!isUpcoming && talk.slides && (
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

                              {!isUpcoming && talk.videoUrl && (
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
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Submit a Talk CTA (for upcoming events) */}
              {isUpcoming && hasSlotsAvailable && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gray-50 p-6 rounded-lg shadow-md mb-12"
                >
                  <h3 className="text-xl font-bold mb-3">Want to give a talk? 🎤</h3>
                  <p className="mb-4">
                    We&apos;re looking for JavaScript enthusiasts to share their knowledge at this event!
                    {hasRegularSlotAvailable && hasLightningSlotAvailable && (
                      <span> We have slots available for <strong>both regular talks (20-30 mins)</strong> and <strong>lightning talks (5-10 mins)</strong>.</span>
                    )}
                    {hasRegularSlotAvailable && !hasLightningSlotAvailable && (
                      <span> We have <strong>{2 - regularTalks.length} slot{regularTalks.length === 1 ? '' : 's'} available for regular talks (20-30 mins)</strong>.</span>
                    )}
                    {!hasRegularSlotAvailable && hasLightningSlotAvailable && (
                      <span> We have <strong>1 slot available for a lightning talk (5-10 mins)</strong>.</span>
                    )}
                  </p>
                  <Button href="/cfp" variant="primary" className="bg-black text-js hover:bg-gray-800" target="_blank" rel="noopener noreferrer">
                    Submit a Talk Proposal
                  </Button>
                </motion.div>
              )}

              {/* No Slots Available Message */}
              {isUpcoming && !hasSlotsAvailable && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gray-50 p-6 rounded-lg shadow-md mb-12"
                >
                  <h3 className="text-xl font-bold mb-3">All talk slots are filled! 🎉</h3>
                  <p className="mb-4">
                    We&apos;ve reached our maximum number of talks for this event. Please check our future events for speaking opportunities or submit a proposal for consideration at upcoming meetups.
                  </p>
                  <Button href="/cfp" variant="outline" className="border-black text-black hover:bg-black hover:text-js" target="_blank" rel="noopener noreferrer">
                    Submit for Future Events
                  </Button>
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

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-600 hover:text-yellow-700 font-medium flex items-center"
                    >
                      Get Directions
                      <ExternalLink size={14} className="ml-1" />
                    </a>
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
                      <Link href="/partnerships#partnership-tiers" className="inline-flex items-center text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded-md hover:bg-blue-200 transition-colors" target="_blank" rel="noopener noreferrer">
                        <Building size={16} className="mr-2" />
                        Partner with us as a Venue Host
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* What to Bring */}
              {isUpcoming && !isFeedbackMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white p-6 rounded-lg shadow-md mb-8"
                >
                  <h3 className="text-xl font-bold mb-3">What to Bring 💼</h3>
                  <ul className="space-y-2">
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
                    {isUpcoming && event.ticketSaleUrl && (
                      <Button
                        href={event.ticketSaleUrl}
                        variant="primary"
                        className="bg-zurich hover:bg-blue-600 text-white"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get Your Tickets Now
                      </Button>
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
                  className={`${event.isProMeetup ? 'bg-blue-100' : 'bg-js'} p-6 rounded-lg shadow-md text-center`}
                >
                  <h3 className="text-xl font-bold mb-3">Ready to Join Us? 🚀</h3>
                  <p className="mb-4">
                    Don&apos;t miss this amazing JavaScript event!
                    {event.datetime ? (
                      event.isProMeetup ? (
                        event.ticketSaleUrl ? ' Secure your ticket now!' : " We're finalizing ticket sales - check back soon!"
                      ) : (
                        event.meetupUrl ? ' RSVP now to secure your spot.' : " We're finalizing the details - check back soon!"
                      )
                    ) : (
                      ' We&apos;re still working on the details but save some space in your calendar!'
                    )}
                  </p>
                  {event.isProMeetup ? (
                    event.ticketSaleUrl ? (
                      <Button
                        href={event.ticketSaleUrl}
                        variant="primary"
                        size="lg"
                        className="w-full bg-zurich text-white hover:bg-blue-600"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get Tickets
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-zurich text-white hover:bg-blue-600 cursor-not-allowed opacity-80"
                        disabled
                      >
                        Tickets Coming Soon
                      </Button>
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
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-black text-js hover:bg-gray-800 cursor-not-allowed opacity-80"
                        disabled
                      >
                        RSVP Coming Soon
                      </Button>
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
      </div>
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
