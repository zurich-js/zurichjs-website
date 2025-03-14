import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ExternalLink, Building, ChevronLeft } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { getEventById, getUpcomingEvents, getPastEvents } from '@/sanity/queries';
import SEO from '@/components/SEO';

// Define our TypeScript interfaces
interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
  bio?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
}

interface EventTalk {
  id: string;
  title: string;
  speakers: Speaker[];
  description?: string;
  time?: string;
  durationMinutes?: number; // Duration in minutes
  slidesUrl?: string;
  videoUrl?: string;
}

interface EventDetails {
  id: string;
  title: string;
  slug: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  description: string;
  image: string;
  attendees: number;
  maxAttendees?: number;
  meetupUrl: string;
  companyUrl?: string;
  companyName?: string;
  companyLogo?: string;
  talks: EventTalk[];
  relatedEvents?: {
    id: string;
    slug: string;
    title: string;
    date: string;
    image: string;
  }[];
}

interface EventDetailPageProps {
  event: EventDetails;
}

export default function EventDetail({ event }: EventDetailPageProps) {
  const [isClient, setIsClient] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  
  // Calculate if event is upcoming
  const isUpcoming = new Date(event.date) > new Date();

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
    const shareText = `Join me at ${event.title} on ${event.date} with ZurichJS!`;

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
        description={`Join us for ${event.title} on ${event.date} at ${event.location}. ${event.description.slice(0, 120)}...`}
        openGraph={{
          title: `${event.title} | ZurichJS`,
          description: event.description.slice(0, 120) + '...',
          type: 'website',
          image: event.image,
          url: `/events/${event.id}`
        }}
      />

      <div className="pt-20 bg-gradient-to-br from-yellow-400 to-amber-500">
        {/* Hero Section */}
        <section className="py-12">
          <div className="container mx-auto px-6">
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
                className="lg:w-1/2"
              >
                <div className="bg-black text-yellow-400 inline-block px-3 py-1 rounded-full text-sm font-bold mb-4">
                  {isUpcoming ? '🔥 Upcoming Event!' : '📅 Past Event'}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {event.title}
                </h1>

                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                    <Calendar size={16} className="mr-1.5" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                    <Clock size={16} className="mr-1.5" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                    <MapPin size={16} className="mr-1.5" />
                    <span>{event.location}</span>
                  </div>
                  {isUpcoming && (
                    <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                      <Users size={16} className="mr-1.5" />
                      <span>{event.attendees} attending</span>
                    </div>
                  )}
                </div>

                <p className="text-lg mb-6">
                  {event.description}
                </p>

                <div className="flex flex-wrap gap-3">
                  {isUpcoming && (
                    <Button
                      href={event.meetupUrl}
                      variant="primary"
                      size="lg"
                      className="bg-black text-yellow-400 hover:bg-gray-800"
                    >
                      RSVP on Meetup 🚀
                    </Button>
                  )}

                  {isClient && (
                    <Button
                      onClick={shareEvent}
                      variant="outline"
                      className="border-black text-black hover:bg-black hover:text-yellow-400"
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
                className="lg:w-1/2"
              >
                <div className="relative display-none md:h-96 w-full rounded-lg overflow-hidden shadow-lg">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Event Details */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Main Content */}
              <div className="lg:w-2/3">
                {/* Talks */}
                {event.talks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                  >
                    <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-yellow-400">
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
                            <div className="md:w-1/4">
                              <div className="relative w-24 h-24 md:w-full md:h-32 rounded-lg overflow-hidden mx-auto md:mx-0">
                                <Image
                                  src={talk.speakers[0]?.image || '/images/speakers/default.jpg'}
                                  alt={talk.speakers[0]?.name || 'Speaker'}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              {talk.speakers.length > 1 && (
                                <div className="flex mt-2 justify-center md:justify-start">
                                  {talk.speakers.slice(1).map((speaker, idx) => (
                                    <div
                                      key={speaker.id}
                                      className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white -ml-2 first:ml-0"
                                      style={{ zIndex: 10 - idx }}
                                    >
                                      <Image
                                        src={speaker.image}
                                        alt={speaker.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="md:w-3/4">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                                <h3 className="text-xl font-bold">{talk.title}</h3>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                                  (!talk.durationMinutes || talk.durationMinutes < 10) 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {(!talk.durationMinutes || talk.durationMinutes < 10) ? '⚡ Lightning Talk' : '🎤 Regular Talk'}
                                </span>
                              </div>

                              <div className="mb-3">
                                {talk.speakers.map((speaker, idx) => (
                                  <div key={speaker.id} className={idx > 0 ? 'mt-1' : ''}>
                                    <div className="flex items-center">
                                      <span className="font-bold mr-2">{speaker.name}</span>
                                      <span className="text-gray-600 text-sm">{speaker.title}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="mb-3 text-gray-600 flex items-center gap-3">
                                {talk.time && (
                                  <div className="flex items-center">
                                    <Clock size={14} className="mr-1" />
                                    <span>{talk.time}</span>
                                  </div>
                                )}
                                {talk.durationMinutes && (
                                  <div className="flex items-center">
                                    <span className="text-sm">
                                      {talk.durationMinutes} min{talk.durationMinutes !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {talk.description && (
                                <p className="text-gray-700 mb-4">{talk.description}</p>
                              )}

                              <div className="flex flex-wrap gap-2">
                                {!isUpcoming && talk.slidesUrl && (
                                  <a
                                    href={talk.slidesUrl}
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

                                {talk.speakers.map(speaker => (
                                  <Link
                                    key={speaker.id}
                                    href={`/speakers/${speaker.id}`}
                                    className="inline-flex items-center text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                                  >
                                    <ExternalLink size={14} className="mr-1" />
                                    {speaker.name}&apos;s Profile
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Submit a Talk CTA (for upcoming events) */}
                {isUpcoming && hasSlotsAvailable && (
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
                    <Button href="/cfp" variant="primary" className="bg-black text-yellow-400 hover:bg-gray-800">
                      Submit a Talk Proposal
                    </Button>
                  </motion.div>
                )}

                {/* No Slots Available Message */}
                {isUpcoming && !hasSlotsAvailable && (
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
                    <Button href="/cfp" variant="outline" className="border-black text-black hover:bg-black hover:text-yellow-400">
                      Submit for Future Events
                    </Button>
                  </motion.div>
                )}

                {/* Related Events */}
                {event.relatedEvents && event.relatedEvents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-yellow-400">
                      You Might Also Like 💛
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {event.relatedEvents.map((relatedEvent) => (
                        <Link
                          key={relatedEvent.id}
                          href={`/events/${relatedEvent.slug}`}
                          className="flex items-center gap-4 p-4 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
                        >
                          <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={relatedEvent.image}
                              alt={relatedEvent.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="font-bold">{relatedEvent.title}</h3>
                            <p className="text-sm text-gray-600">{relatedEvent.date}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:w-1/3">
                {/* Venue Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="bg-white p-6 rounded-lg shadow-md mb-6"
                >
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <MapPin className="mr-2 text-yellow-500" size={20} />
                    Venue Details
                  </h3>

                  <p className="font-bold mb-1">{event.location}</p>
                  {event.address && <p className="text-gray-600 mb-4">{event.address}</p>}

                  <div className="relative h-48 w-full rounded overflow-hidden mb-4">
                    <Image
                      src={mapUrl}
                      alt={`Map of ${event.location}`}
                      fill
                      className="object-cover"
                    />
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
                </motion.div>

                {/* Hosted By */}
                {event.companyName && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white p-6 rounded-lg shadow-md mb-6"
                  >
                    <h3 className="text-xl font-bold mb-3 flex items-center">
                      <Building className="mr-2 text-yellow-500" size={20} />
                      Hosted By
                    </h3>

                    <div className="flex items-center mb-4">
                      {event.companyLogo ? (
                        <div className="relative w-12 h-12 mr-3">
                          <Image
                            src={event.companyLogo}
                            alt={event.companyName}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <Building className="mr-3 text-gray-400" size={32} />
                      )}
                      <div>
                        <p className="font-bold">{event.companyName}</p>
                        <p className="text-sm text-gray-600">Event Host</p>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4">
                      A big thank you to {event.companyName} for providing the venue and refreshments for this meetup! 🙏
                    </p>

                    {event.companyUrl && (
                      <a
                        href={event.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-600 hover:text-yellow-700 font-medium flex items-center"
                      >
                        Visit {event.companyName}
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    )}
                  </motion.div>
                )}

                {/* What to Bring */}
                {isUpcoming && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white p-6 rounded-lg shadow-md mb-6"
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

                {/* Call to Action */}
                {isUpcoming && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-yellow-400 p-6 rounded-lg shadow-md text-center"
                  >
                    <h3 className="text-xl font-bold mb-3">Ready to Join Us? 🚀</h3>
                    <p className="mb-4">
                      Don&apos;t miss this amazing JavaScript event! RSVP now to secure your spot.
                    </p>
                    <Button
                      href={event.meetupUrl}
                      variant="primary"
                      size="lg"
                      className="w-full bg-black text-yellow-400 hover:bg-gray-800"
                    >
                      RSVP on Meetup
                    </Button>
                    <p className="mt-3 text-sm">
                      {event.attendees} people are already attending!
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-black text-white rounded-lg p-8 shadow-md"
            >
              <div className="md:flex items-center justify-between">
                <div className="md:w-3/5 mb-6 md:mb-0">
                  <h2 className="text-2xl font-bold mb-2 text-yellow-400">Never Miss a JavaScript Gathering! 📬</h2>
                  <p className="text-lg">
                    Subscribe to our newsletter and be the first to know about upcoming events, speaker announcements, and community news!
                  </p>
                </div>
                <div className="md:w-2/5">
                  <div className="flex">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="flex-grow px-4 py-3 rounded-l-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button className="bg-yellow-400 text-black px-6 py-3 rounded-r-md font-bold hover:bg-yellow-300 transition-colors">
                      Subscribe 🚀
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticPaths() {
  // This would be replaced with actual CMS fetching
  const upcomingEvents = await getUpcomingEvents();
  const pastEvents = await getPastEvents();

  const paths = [
    ...upcomingEvents.map((event: EventDetails) => ({
      params: { id: event.id },
    })),
    ...pastEvents.map((event: EventDetails) => ({
      params: { id: event.id },
    })),
  ];

  return {
    paths,
    fallback: 'blocking', // Show a loading state for events not generated at build time
  };
}

export async function getStaticProps({ params }: { params: { id: string } }) {
  // This would be replaced with actual CMS fetching based on the id
  const { id } = params;
  const event = await getEventById(id);

  return {
    props: { event },
  };
}