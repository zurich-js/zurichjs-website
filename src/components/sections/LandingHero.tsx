import {motion} from "framer-motion";
import { Linkedin } from "lucide-react";
import { useState, useEffect } from "react";

import Section from "@/components/Section";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import Stats from "@/components/ui/Stats";
import useEvents from "@/hooks/useEvents";
import { Event } from "@/sanity/queries";
import type { Workshop } from "@/components/sections/UpcomingWorkshops";

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
}

export default function LandingHero({
    upcomingEvents,
    stats,
    upcomingWorkshops
}: LandingHeroProps) {
    const { track } = useEvents();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Get the next event date dynamically
    const nextEventDate = upcomingEvents && upcomingEvents.length > 0
        ? new Date(upcomingEvents[0].datetime).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) + ' at ' + new Date(upcomingEvents[0].datetime).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    })
        : 'Coming soon';

    // Get the next workshop
    const nextWorkshop = upcomingWorkshops && upcomingWorkshops.length > 0 ? upcomingWorkshops[0] : null;

    // Countdown state for next event
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        if (!upcomingEvents || upcomingEvents.length === 0) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            const eventTime = new Date(upcomingEvents[0].datetime).getTime();
            const difference = eventTime - now;

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [upcomingEvents]);

    // Track event handlers
    const handleJoinMeetupClick = () => {
        track('button_click', { name: 'join_next_meetup' });
    };

    const handleSubmitTalkClick = () => {
        track('button_click', { name: 'submit_talk' });
    };

    const handleReserveSpotClick = (eventTitle: string) => {
        track('event_rsvp', {
            name: 'reserve_spot',
            eventTitle: eventTitle
        });
    };

    const handleLinkedInClick = () => {
        track('social_click', { name: 'linkedin' });
    };

    const handleWorkshopClick = (workshopTitle: string) => {
        track('workshop_click', {
            name: 'hero_workshop_click',
            workshopTitle: workshopTitle
        });
    };

    return (
        <Section variant="gradient" padding="lg">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-4">
                <motion.div
                    initial={isClient ? {opacity: 0, y: 20} : {opacity: 1, y: 0}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5}}
                    className="grow basis-1/2 flex flex-col"
                >
                    <h1 className="text-6xl md:text-7xl font-extrabold text-black mb-4">
                        <Logo className="w-4/5" />
                    </h1>

                    <h2 className="text-2xl md:text-3xl font-medium mb-6 text-black">
                        Where Zurich&apos;s JavaScript wizards unite!
                    </h2>
                    <p className="text-lg mb-8 text-black max-w-2xl">
                        From React ninjas to Node gurus, TypeScript enthusiasts to vanilla JS lovers –
                        we&apos;re building a vibrant community of developers who create amazing things with JavaScript.
                        Connect, learn, and level up your skills in Switzerland&apos;s most dynamic tech community!
                    </p>

                    {/* Console.log Countdown Timer */}
                    {upcomingEvents && upcomingEvents.length > 0 && (
                        <div className="mb-6">
                            <div className="bg-gray-900 text-white px-3 sm:px-4 py-3 rounded-lg border border-gray-700 shadow-lg font-mono">
                                {/* Mobile: Two-line layout for better readability */}
                                <div className="block sm:hidden">
                                    <div className="text-xs text-gray-400 mb-1">
                                        <span className="text-cyan-400">console</span>
                                        <span className="text-gray-300">.</span>
                                        <span className="text-cyan-400">log</span>
                                        <span className="text-gray-300">(</span>
                                        <span className="text-green-400">&quot;Next event in:&quot;</span>
                                        <span className="text-gray-300">);</span>
                                    </div>
                                    <div className="text-white font-bold text-lg text-center bg-gray-800 rounded px-3 py-2">
                                        {String(timeLeft.days).padStart(2, '0')}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                                    </div>
                                </div>
                                {/* Desktop: Normal size */}
                                <div className="hidden sm:flex items-center text-sm">
                                    <span className="text-cyan-400">console</span>
                                    <span className="text-gray-300">.</span>
                                    <span className="text-cyan-400">log</span>
                                    <span className="text-gray-300">(</span>
                                    <span className="text-green-400">&quot;Next event in: </span>
                                    <span className="text-white font-bold text-lg">
                                        {String(timeLeft.days).padStart(2, '0')}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                                    </span>
                                    <span className="text-green-400">&quot;</span>
                                    <span className="text-gray-300">);</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-4">
                        <Button
                            href="/events"
                            variant="primary"
                            size="lg"
                            className="transform hover:scale-105 transition-transform"
                            onClick={handleJoinMeetupClick}
                        >
                            Join next meetup
                        </Button>
                        <Button
                            href="/cfp"
                            variant="secondary"
                            size="lg"
                            className="transform hover:scale-105 transition-transform"
                            onClick={handleSubmitTalkClick}
                        >
                            Submit a talk
                        </Button>
                    </div>

                    {/* Social Media Links */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mt-6">
                        <p className="text-black font-medium">Connect with us:</p>
                        <div className="flex gap-3">
                            <motion.a
                                href="https://linkedin.com/company/zurichjs"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ y: -3, scale: 1.05 }}
                                className="flex items-center justify-center gap-1.5 text-sm bg-[#0A66C2] text-white px-2.5 py-1.5 rounded-md hover:bg-blue-600 transition-colors flex-1 sm:flex-none"
                                aria-label="Follow on LinkedIn"
                                onClick={handleLinkedInClick}
                            >
                                <Linkedin size={16} />
                                <span>Follow</span>
                            </motion.a>
                        </div>
                    </div>
                </motion.div>

                <div className="grow basis-1/2 flex flex-col gap-4 h-fit">
                    {/* Next event card */}
                    {upcomingEvents && upcomingEvents.length > 0 && (
                        <motion.div
                            initial={isClient ? {opacity: 0, y: 30} : {opacity: 1, y: 0}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.7, delay: 0.3}}
                            className="relative bg-white rounded-xl shadow-xl overflow-hidden border-4 border-gray-900"
                        >
                            <div className="relative p-6">
                                <div
                                    className="absolute -top-1 -right-1 bg-black text-js px-4 py-2 rounded-bl-lg font-mono z-10 transform rotate-2 shadow-md">
                                    Next Event
                                </div>
                                <div className="pt-4 flex flex-col h-full">
                                    <h3 className="text-2xl font-bold mb-3">{upcomingEvents[0].title}</h3>
                                    <div className="flex items-center mb-3 text-gray-800">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <span className="font-medium">{nextEventDate}</span>
                                    </div>
                                    <div className="flex items-center mb-4 text-gray-800">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        </svg>
                                        <span className="font-medium">{upcomingEvents[0].location}</span>
                                    </div>
                                    {!!upcomingEvents[0].attendees && (
                                      <div className="flex items-center text-sm bg-gray-100 p-3 rounded-lg mb-4">
                                          <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                               xmlns="http://www.w3.org/2000/svg">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                          </svg>
                                          <span className="font-medium">{upcomingEvents[0].attendees} developers joining</span>
                                      </div>
                                    )}

                                    <motion.div
                                        whileHover={{scale: 1.03}}
                                        className="mt-4 flex-1 mx-auto w-fit"
                                    >
                                        <a
                                            href={upcomingEvents[0].meetupUrl || `/events/${upcomingEvents[0].id}`}
                                            className="block bg-js text-black font-bold py-3 px-4 rounded-lg text-center shadow-md hover:bg-yellow-500 transition-colors"
                                            onClick={() => handleReserveSpotClick(upcomingEvents[0].title)}
                                        >
                                            Reserve Your Spot →
                                        </a>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Next workshop card */}
                    {nextWorkshop && (
                        <motion.div
                            initial={isClient ? {opacity: 0, y: 30} : {opacity: 1, y: 0}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.7, delay: 0.5}}
                            className="relative bg-white rounded-xl shadow-xl overflow-hidden border-4 border-blue-600"
                        >
                            <div className="relative p-6">
                                <div
                                    className="absolute -top-1 -right-1 bg-blue-600 text-white px-4 py-2 rounded-bl-lg font-mono z-10 transform rotate-2 shadow-md">
                                    Next Workshop
                                </div>
                                <div className="pt-4 flex flex-col h-full">
                                    <h3 className="text-xl font-bold mb-2">{nextWorkshop.title}</h3>
                                    <p className="text-sm text-gray-600 mb-3">{nextWorkshop.subtitle}</p>
                                    <div className="flex items-center mb-2 text-gray-800 text-sm">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                        </svg>
                                        <span className="font-medium">{nextWorkshop.dateInfo}</span>
                                    </div>
                                    <div className="flex items-center mb-2 text-gray-800 text-sm">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        <span className="font-medium">{nextWorkshop.timeInfo}</span>
                                    </div>
                                    <div className="flex items-center mb-3 text-gray-800 text-sm">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                        <span className="font-medium">Max {nextWorkshop.maxAttendees} attendees</span>
                                    </div>
                                    {nextWorkshop.speaker && (
                                        <div className="flex items-center text-gray-700 text-sm mb-3">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                                 xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                            </svg>
                                            <span className="font-medium">
                                                {nextWorkshop.speaker.name} • {nextWorkshop.speaker.title}
                                            </span>
                                        </div>
                                    )}
                                    <motion.div
                                        whileHover={{scale: 1.03}}
                                        className="mt-auto mx-auto w-fit"
                                    >
                                        <a
                                            href={`/workshops/${nextWorkshop.id}`}
                                            className="block bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-center shadow-md hover:bg-blue-700 transition-colors"
                                            onClick={() => handleWorkshopClick(nextWorkshop.title)}
                                        >
                                            Learn More →
                                        </a>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>


            {/* Stats Counter */}
            <motion.div
                initial={isClient ? {opacity: 0, y: 30} : {opacity: 1, y: 0}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: isClient ? 1 : 0, duration: 0.5}}
                className="mt-20"
            >
                <Stats stats={stats}/>
            </motion.div>
        </Section>
    );
}
