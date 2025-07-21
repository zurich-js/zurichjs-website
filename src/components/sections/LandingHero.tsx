import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Clock } from "lucide-react";
import Image from "next/image";
import Link from 'next/link';

import Section from "@/components/Section";
import { Workshop } from "@/components/sections/UpcomingWorkshops";
import Button from "@/components/ui/Button";
import Stats from "@/components/ui/Stats";
import useEvents from "@/hooks/useEvents";
import { Event } from "@/sanity/queries";
import { Speaker } from "@/types";

// Helper function to add ordinal suffix to dates
const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
};

const formatDateWithOrdinal = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

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

    // Get the next event and workshop
    const nextEvent = upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents[0] : null;
    const nextWorkshop = upcomingWorkshops && upcomingWorkshops.length > 0 ? upcomingWorkshops[0] : null;

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

    return (
        <Section variant="gradient" padding="lg" className="min-h-[90vh] flex items-center">
            <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    {/* Left Content - Main value proposition */}
                    <div className="text-center lg:text-left px-4 sm:px-0">
                        {/* Clean badge */}
                        <div className="inline-flex items-center bg-black/10 px-3 sm:px-4 py-2 rounded-full mb-6 sm:mb-8 border border-black/20">
                            <span className="text-xs sm:text-sm font-semibold text-black">Switzerland&apos;s JavaScript Community</span>
                        </div>

                        {/* Logo */}
                        <div className="mb-6 sm:mb-8">
                            <Image
                                src="/logo.svg"
                                alt="ZurichJS"
                                width={400}
                                height={61}
                                className="w-full max-w-xs sm:max-w-sm mx-auto lg:mx-0"
                                priority
                            />
                        </div>

                        {/* Clear value proposition */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-black leading-tight px-2 sm:px-0">
                            Connect, Learn & Build with JavaScript
                        </h1>

                        <p className="text-base sm:text-lg md:text-xl text-black/80 mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto lg:mx-0 px-2 sm:px-0">
                            From React ninjas to Node gurus, TypeScript enthusiasts to vanilla JS lovers – we&apos;re building a vibrant community of developers who create amazing things with JavaScript. Connect, learn, and level up your skills in Switzerland&apos;s most dynamic tech community!
                        </p>

                        {/* Clear call-to-action with improved mobile spacing */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-4 sm:px-0">
                            <Button
                                href="/events"
                                variant="primary"
                                size="lg"
                                className="bg-black hover:bg-gray-800 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto min-h-[48px] touch-manipulation"
                                onClick={handleJoinMeetupClick}
                            >
                                <span>Join Our Next Event</span>
                                <ArrowRight size={20} className="ml-2 text-[#258BCC] flex-shrink-0" />
                            </Button>
                            <Button
                                href="/cfp"
                                variant="outline"
                                size="lg"
                                className="border-2 border-black text-black hover:bg-black hover:text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto min-h-[48px] touch-manipulation"
                                onClick={handleSubmitTalkClick}
                            >
                                Submit a Talk
                            </Button>
                        </div>
                    </div>

                    {/* Right Content - Next event/workshop cards */}
                    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0 mt-8 lg:mt-0">
                        {/* Next Event Card */}
                        {nextEvent ? (
                            <div className="bg-white rounded-2xl p-4 sm:p-6 hover:shadow-xl transition-all duration-200 shadow-lg cursor-pointer border border-black/10">
                                <div className="flex items-center mb-3 sm:mb-4">
                                    <div className="bg-[#258BCC]/10 p-2 rounded-lg mr-3">
                                        <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-[#258BCC]" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-black uppercase tracking-wider">Next Event</span>
                                </div>
                                
                                <h3 className="text-lg sm:text-xl font-bold text-black mb-3 sm:mb-4 leading-tight">
                                    {nextEvent.title}
                                </h3>
                                
                                <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                                    <div className="flex items-center text-black/70 hover:text-black transition-colors cursor-pointer">
                                        <Calendar className="w-4 h-4 mr-3 text-[#258BCC] flex-shrink-0" />
                                        <span className="text-sm font-medium">{formatDateWithOrdinal(new Date(nextEvent.datetime))}</span>
                                    </div>
                                    
                                    <div className="flex items-center text-black/70 hover:text-black transition-colors cursor-pointer">
                                        <MapPin className="w-4 h-4 mr-3 text-[#258BCC] flex-shrink-0" />
                                        <span className="text-sm font-medium line-clamp-2">{nextEvent.location}</span>
                                    </div>
                                </div>

                                <a
                                    href={nextEvent.meetupUrl || `/events/${nextEvent.id}`}
                                    className="block w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg text-center transition-all duration-200 cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center"
                                    onClick={() => handleReserveSpotClick(nextEvent.title)}
                                >
                                    Reserve Your Spot
                                </a>
                            </div>
                        ) : null}

                        {/* Next Workshop Card */}
                        {nextWorkshop ? (
                            <div className="bg-white rounded-2xl p-4 sm:p-6 hover:shadow-xl transition-all duration-200 shadow-lg cursor-pointer border border-black/10">
                                <div className="flex items-center mb-3 sm:mb-4">
                                    <div className="bg-[#258BCC]/10 p-2 rounded-lg mr-3">
                                        <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-[#258BCC]" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-black uppercase tracking-wider">Next Workshop</span>
                                </div>
                                
                                <h3 className="text-lg sm:text-xl font-bold text-black mb-3 sm:mb-4 leading-tight">
                                    {nextWorkshop.title}
                                </h3>
                                
                                <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                                    <div className="flex items-center text-black/70 hover:text-black transition-colors cursor-pointer">
                                        <Calendar className="w-4 h-4 mr-3 text-[#258BCC] flex-shrink-0" />
                                        <span className="text-sm font-medium">
                                            {nextWorkshop.dateInfo !== 'TBD' 
                                                ? formatDateWithOrdinal(new Date(nextWorkshop.dateInfo)) 
                                                : nextWorkshop.dateInfo}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center text-black/70 hover:text-black transition-colors cursor-pointer">
                                        <Clock className="w-4 h-4 mr-3 text-[#258BCC] flex-shrink-0" />
                                        <span className="text-sm font-medium">{nextWorkshop.timeInfo}</span>
                                    </div>
                                    
                                    {nextWorkshop.price && (
                                        <div className="flex items-center">
                                            <span className="bg-black/10 text-black font-bold text-sm px-3 py-1 rounded-full">
                                                CHF {nextWorkshop.price.replace(/[$\u20ac]/g, '')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <a
                                    href={`/workshops/${nextWorkshop.id}`}
                                    className="block w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg text-center transition-all duration-200 cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center"
                                >
                                    Learn More
                                </a>
                            </div>
                        ) : null}

                        {/* Fallback when no events or workshops */}
                        {!nextEvent && !nextWorkshop && (
                            <div className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-lg border border-black/10">
                                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-black">
                                    New Events Coming Soon
                                </h3>
                                <p className="text-black/70 mb-4 sm:mb-6">
                                    We&apos;re planning our next JavaScript adventure. Stay tuned for updates!
                                </p>
                                <Button
                                    href="https://meetup.com/zurich-js"
                                    variant="primary"
                                    className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto min-h-[48px] touch-manipulation"
                                >
                                    Get Notified
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrolling Speakers Showcase */}
                {speakers && speakers.length > 0 && (
                    <div className="mt-12 sm:mt-16 lg:mt-20 mb-8 sm:mb-12 lg:mb-16">
                        <div className="text-center mb-6 sm:mb-8 px-4 sm:px-0">
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-2">
                                Meet Our <span className="text-[#258BCC]">Speakers</span>
                            </h3>
                            <p className="text-black/70 text-base sm:text-lg">JavaScript experts sharing their knowledge with our community</p>
                        </div>

                        <div className="relative bg-white/50 backdrop-blur rounded-2xl py-4 sm:py-6 border border-black/10 shadow-lg overflow-hidden mx-4 sm:mx-0">
                            <div className="relative">
                                <motion.div
                                    className="flex gap-3 sm:gap-4"
                                    animate={{
                                        x: [0, -((speakers.length * 80) + (speakers.length * 16))]
                                    }}
                                    transition={{
                                        duration: speakers.length * 3,
                                        ease: "linear",
                                        repeat: Infinity,
                                    }}
                                    style={{ width: `${(speakers.length * 2) * (80 + 16)}px` }}
                                >
                                    {/* First set of speakers */}
                                    {speakers.map((speaker) => (
                                        <motion.div
                                            key={`${speaker.id}-1`}
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
                                                <Link href={`/speakers/${speaker.id}`} className="block cursor-pointer">
                                                    <div className="relative bg-white rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-black/10 group-hover:border-[#258BCC]/50 overflow-hidden w-[70px] h-[70px] cursor-pointer">
                                                        <img
                                                            src={speaker.image || '/images/speakers/default.png'}
                                                            alt={speaker.name}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                        
                                                        {/* Talk count mini badge */}
                                                        {speaker.talks && speaker.talks.length > 0 && (
                                                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#258BCC] to-[#FFD736] text-black text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg">
                                                                {speaker.talks.length}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                                
                                                {/* Hover tooltip */}
                                                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                                    <div className="text-center font-medium">{speaker.name}</div>
                                                    {speaker.company && (
                                                        <div className="text-center text-xs text-gray-300">{speaker.company}</div>
                                                    )}
                                                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    
                                    {/* Duplicate set for seamless loop */}
                                    {speakers.map((speaker) => (
                                        <motion.div
                                            key={`${speaker.id}-2`}
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
                                                <Link href={`/speakers/${speaker.id}`} className="block cursor-pointer">
                                                    <div className="relative bg-white rounded-full shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-black/10 group-hover:border-[#258BCC]/50 overflow-hidden w-[70px] h-[70px] cursor-pointer">
                                                        <img
                                                            src={speaker.image || '/images/speakers/default.png'}
                                                            alt={speaker.name}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                        
                                                        {/* Talk count mini badge */}
                                                        {speaker.talks && speaker.talks.length > 0 && (
                                                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#258BCC] to-[#FFD736] text-black text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg">
                                                                {speaker.talks.length}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                                
                                                {/* Hover tooltip */}
                                                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                                    <div className="text-center font-medium">{speaker.name}</div>
                                                    {speaker.company && (
                                                        <div className="text-center text-xs text-gray-300">{speaker.company}</div>
                                                    )}
                                                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                            
                            {/* Quick stats overlay */}
                            <div className="text-center mt-3 sm:mt-4">
                                <p className="text-black/60 text-xs sm:text-sm">
                                    <span className="font-bold text-[#258BCC]">{speakers.length} expert speakers</span> • 
                                    <span className="font-bold text-black ml-1">{speakers.reduce((total, speaker) => total + (speaker.talks?.length || 0), 0)} amazing talks</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clean Stats Section */}
                <div className="mt-16 sm:mt-20 lg:mt-24 px-4 sm:px-0">
                    <Stats 
                        stats={stats}
                    />
                </div>
            </div>
        </Section>
    );
}
