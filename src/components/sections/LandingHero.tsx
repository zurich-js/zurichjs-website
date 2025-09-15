import {motion} from "framer-motion";
import { Linkedin, Users, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from 'next/link';
import { useState, useEffect } from "react";

import Section from "@/components/Section";
import type { Workshop } from "@/components/sections/UpcomingWorkshops";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import Stats from "@/components/ui/Stats";
import useEvents from "@/hooks/useEvents";
import { Event } from "@/sanity/queries";
import { Speaker } from "@/types";

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
    stats,
    upcomingWorkshops,
    speakers
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
                        <a
                            href="https://donate.raisenow.io/qnnqt"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-lg font-semibold transform hover:scale-105 transition-transform hover:bg-gray-800"
                        >
                            <Image
                                src="/images/twint-logo.webp"
                                alt="TWINT"
                                width={36}
                                height={36}
                            />
                            Donate with TWINT
                        </a>
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

            {/* Featured Speakers Showcase */}
            {speakers && speakers.length > 0 && (
                <motion.div
                    initial={isClient ? {opacity: 0, y: 30} : {opacity: 1, y: 0}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: isClient ? 1.2 : 0, duration: 0.5}}
                    className="mt-16 px-4 sm:px-6"
                >
                    <div className="text-center mb-8 sm:mb-12">
                        <div className="inline-flex items-center bg-js/90 backdrop-blur px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6 border border-yellow-400 shadow-sm">
                            <Users size={16} className="text-black mr-2" />
                            <span className="font-semibold text-black text-xs sm:text-sm">Meet Our Speakers</span>
                        </div>
                        
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-black">
                            Our <span className="text-black">Speakers</span>
                        </h2>
                        <p className="text-black text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto px-2 sm:px-0">
                            Get inspired by JavaScript experts sharing their knowledge and insights with our community.
                        </p>
                    </div>

                    {/* Horizontal scrolling speakers showcase */}
                    <div className="mb-6 sm:mb-8 overflow-hidden">
                        <div className="relative">
                            <div className="relative bg-js/90 backdrop-blur rounded-3xl py-6 sm:py-8 px-4 sm:px-6 border border-yellow-400 shadow-lg overflow-hidden">
                                {/* Scrolling container */}
                                <div className="relative">
                                    <motion.div
                                        className="flex gap-3 sm:gap-4"
                                        animate={{
                                            x: [0, -((speakers.length * 70) + (speakers.length * 12))]
                                        }}
                                        transition={{
                                            duration: speakers.length * 3,
                                            ease: "linear",
                                            repeat: Infinity,
                                        }}
                                        style={{ width: `${(speakers.length * 2) * (70 + 12)}px` }}
                                    >
                                        {/* First set of speakers */}
                                        {speakers.map((speaker, index) => (
                                            <motion.div
                                                key={`${speaker.id}-1`}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ 
                                                    duration: 0.4, 
                                                    delay: index * 0.05,
                                                    type: "spring",
                                                    bounce: 0.3
                                                }}
                                                whileHover={{ 
                                                    scale: 1.1,
                                                    y: -8,
                                                    transition: { duration: 0.2 },
                                                    zIndex: 50
                                                }}
                                                className="group relative flex-shrink-0 cursor-pointer"
                                                style={{ width: '70px', height: '70px' }}
                                            >
                                                <div className="relative">
                                                    {/* Hover glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-js/20 to-white/20 rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-md"></div>
                                                    
                                                    {/* Mini profile card */}
                                                    <Link href={`/speakers/${speaker.id}`} className="block cursor-pointer">
                                                        <div className="relative bg-white/90 rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-white/20 group-hover:border-white/40 overflow-hidden w-[70px] h-[70px] cursor-pointer">
                                                            <img
                                                                src={speaker.image || '/images/speakers/default.png'}
                                                                alt={speaker.name}
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                            />
                                                        </div>
                                                    </Link>
                                                    
                                                    {/* Hover tooltip - positioned to avoid cutoff */}
                                                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                                        <div className="text-center font-medium">{speaker.name}</div>
                                                        {speaker.company && (
                                                            <div className="text-center text-xs text-gray-300">{speaker.company}</div>
                                                        )}
                                                        {/* Tooltip arrow */}
                                                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                        
                                        {/* Duplicate set for seamless loop */}
                                        {speakers.map((speaker) => (
                                            <motion.div
                                                key={`${speaker.id}-2`}
                                                initial={{ opacity: 1, scale: 1 }}
                                                whileHover={{ 
                                                    scale: 1.1,
                                                    y: -8,
                                                    transition: { duration: 0.2 },
                                                    zIndex: 50
                                                }}
                                                className="group relative flex-shrink-0 cursor-pointer"
                                                style={{ width: '70px', height: '70px' }}
                                            >
                                                <div className="relative">
                                                    {/* Hover glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-js/20 to-white/20 rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-md"></div>
                                                    
                                                    {/* Mini profile card */}
                                                    <Link href={`/speakers/${speaker.id}`} className="block cursor-pointer">
                                                        <div className="relative bg-white/90 rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-white/20 group-hover:border-white/40 overflow-hidden w-[70px] h-[70px] cursor-pointer">
                                                            <img
                                                                src={speaker.image || '/images/speakers/default.png'}
                                                                alt={speaker.name}
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                            />
                                                        </div>
                                                    </Link>
                                                    
                                                    {/* Hover tooltip - positioned to avoid cutoff */}
                                                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                                        <div className="text-center font-medium">{speaker.name}</div>
                                                        {speaker.company && (
                                                            <div className="text-center text-xs text-gray-300">{speaker.company}</div>
                                                        )}
                                                        {/* Tooltip arrow */}
                                                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                </div>
                                
                                {/* Quick stats - Accurate speaker count */}
                                <div className="mt-6 sm:mt-8 text-center">
                                    <p className="text-black text-xs sm:text-sm">
                                        <span className="font-bold text-black">{speakers.length} speakers</span> • 
                                        <span className="font-bold text-black ml-1">{speakers.reduce((total, speaker) => total + speaker.talks.length, 0)} talks</span> • 
                                        <span className="font-bold text-black ml-1">One amazing community</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Call to action */}
                    <div className="text-center bg-js/90 backdrop-blur rounded-2xl p-6 sm:p-8 border border-yellow-400 shadow-lg">
                        <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                            Want to Speak at ZurichJS?
                        </h3>
                        <p className="text-black mb-4 sm:mb-6 leading-relaxed max-w-xl mx-auto text-sm sm:text-base px-2 sm:px-0">
                            Share your JavaScript knowledge with our community. We welcome speakers of all experience levels 
                            and provide a supportive environment to share your story.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
                            <Button
                                href="/cfp"
                                variant="primary"
                                size="lg"
                                className="bg-black hover:bg-gray-800 text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation font-semibold"
                            >
                                Submit a Talk
                            </Button>
                            
                            <Button
                                href="/speakers"
                                variant="outline"
                                size="lg"
                                className="border-2 border-black text-black hover:bg-black hover:text-white cursor-pointer transition-all duration-200 w-full sm:w-auto min-h-[48px] touch-manipulation font-semibold"
                            >
                                View All Speakers <ArrowRight size={14} className="ml-2 flex-shrink-0" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </Section>
    );
}
