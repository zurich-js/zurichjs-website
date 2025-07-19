import {motion} from "framer-motion";
import { Linkedin, Calendar, MapPin, ArrowRight, Sparkles, Code, BookOpen, Clock } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

import Section from "@/components/Section";
import { Workshop } from "@/components/sections/UpcomingWorkshops";
import Button from "@/components/ui/Button";
import Stats from "@/components/ui/Stats";
import useEvents from "@/hooks/useEvents";
import { Event } from "@/sanity/queries";

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
    
    const handleLinkedInClick = () => {
        track('social_click', { name: 'linkedin' });
    };

    // Floating animation variants
    const floatingVariants = {
        animate: {
            y: [-10, 10, -10],
            transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    const staggerChildren = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { 
            opacity: 1, 
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    return (
        <Section variant="gradient" padding="lg" className="relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute top-20 -left-40 w-96 h-96 bg-yellow-400 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-64 h-64 bg-yellow-200 rounded-full opacity-15 blur-3xl"></div>
            </div>
            
            {/* Floating JS symbols */}
            <motion.div
                className="absolute top-20 left-10 text-4xl opacity-20"
                variants={floatingVariants}
                animate="animate"
            >
                ⚛️
            </motion.div>
            <motion.div
                className="absolute top-40 right-20 text-3xl opacity-25"
                variants={floatingVariants}
                animate="animate"
                style={{ animationDelay: '2s' }}
            >
                🚀
            </motion.div>
            <motion.div
                className="absolute bottom-40 left-20 text-3xl opacity-20"
                variants={floatingVariants}
                animate="animate"
                style={{ animationDelay: '4s' }}
            >
                💻
            </motion.div>

            <motion.div 
                className="relative z-10"
                variants={staggerChildren}
                initial="initial"
                animate="animate"
            >
                <div className="flex flex-col xl:flex-row gap-12 xl:gap-16 items-center">
                    {/* Left Content */}
                    <div className="flex-1 flex flex-col text-center xl:text-left">
                        <motion.div variants={fadeInUp} className="mb-6">
                            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30">
                                <Sparkles size={18} className="text-yellow-600 mr-2" />
                                <span className="font-medium text-black text-sm">Switzerland&apos;s Premier JS Community</span>
                            </div>
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-black mb-6 leading-tight">
                            <Image
                                src="/logo.svg"
                                alt="ZurichJS"
                                width={662}
                                height={101}
                                className="w-full max-w-[32rem] mx-auto xl:mx-0"
                                priority
                            />
                        </motion.h1>

                        <motion.h2 variants={fadeInUp} className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-black">
                            Where Zurich&apos;s <span className="text-yellow-700">JavaScript wizards</span> unite! ✨
                        </motion.h2>

                        <motion.p variants={fadeInUp} className="text-lg md:text-xl mb-8 text-black max-w-2xl mx-auto xl:mx-0 leading-relaxed">
                            From React ninjas to Node gurus, TypeScript enthusiasts to vanilla JS lovers –
                            we&apos;re building a vibrant community of developers who create amazing things with JavaScript.
                            Connect, learn, and level up your skills in Switzerland&apos;s most dynamic tech community!
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 mb-8 justify-center xl:justify-start">
                            <Button
                                href="/events"
                                variant="primary"
                                size="lg"
                                className="group bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                                onClick={handleJoinMeetupClick}
                            >
                                <span>Join next meetup</span>
                                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                href="/cfp"
                                variant="outline"
                                size="lg"
                                className="border-2 border-black text-black hover:bg-black hover:text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                                onClick={handleSubmitTalkClick}
                            >
                                Submit a talk
                            </Button>
                        </motion.div>
                        
                        {/* Enhanced Social Media Links */}
                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center gap-4 justify-center xl:justify-start">
                            <p className="text-black font-semibold flex items-center">
                                <Code size={18} className="mr-2" />
                                Connect with us:
                            </p>
                            <motion.a
                                href="https://linkedin.com/company/zurichjs"
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="inline-flex items-center gap-2 bg-[#0A66C2] text-white px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 group"
                                aria-label="Follow on LinkedIn"
                                onClick={handleLinkedInClick}
                            >
                                <Linkedin size={18} />
                                <span className="font-medium">Follow Us</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </motion.a>
                        </motion.div>
                    </div>

                    {/* Right Content - Event and Workshop Cards */}
                    <motion.div 
                        variants={fadeInUp}
                        className="flex-1 w-full max-w-lg"
                    >
                        {/* Dual cards for Event and Workshop */}
                        <div className="space-y-6">
                            {/* Next Event Card */}
                            {nextEvent ? (
                                <motion.div
                                    whileHover={{ y: -5, rotateY: 2 }}
                                    className="relative"
                                >
                                    {/* Next Event Badge - positioned to overlap on top */}
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow-lg transform rotate-2 z-20">
                                        🎯 Next Event
                                    </div>
                                    
                                    <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/50 p-4">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/30"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="pt-2">
                                                <h3 className="text-lg font-bold mb-3 text-gray-900 line-clamp-2">
                                                    {nextEvent.title}
                                                </h3>
                                                
                                                <div className="grid grid-cols-1 gap-2 mb-4">
                                                    <div className="flex items-center p-2.5 bg-gradient-to-r from-blue-50/90 to-blue-100/90 backdrop-blur-sm rounded-xl border border-blue-200/60 shadow-sm">
                                                        <div className="bg-blue-500 rounded-full p-1.5 mr-3">
                                                            <Calendar className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                        <span className="font-semibold text-blue-900 text-sm">{formatDateWithOrdinal(new Date(nextEvent.datetime))}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center p-2.5 bg-gradient-to-r from-green-50/90 to-green-100/90 backdrop-blur-sm rounded-xl border border-green-200/60 shadow-sm">
                                                        <div className="bg-green-500 rounded-full p-1.5 mr-3">
                                                            <MapPin className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                        <span className="font-semibold text-green-900 text-sm">{nextEvent.location}</span>
                                                    </div>
                                                </div>

                                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                    <a
                                                        href={nextEvent.meetupUrl || `/events/${nextEvent.id}`}
                                                        className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-200 group text-sm"
                                                        onClick={() => handleReserveSpotClick(nextEvent.title)}
                                                    >
                                                        <span className="flex items-center justify-center">
                                                            Reserve Your Spot
                                                            <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                                        </span>
                                                    </a>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-2xl blur-xl scale-105"></div>
                                </motion.div>
                            ) : null}

                            {/* Next Workshop Card */}
                            {nextWorkshop ? (
                                <motion.div
                                    whileHover={{ y: -5, rotateY: -2 }}
                                    className="relative"
                                >
                                    {/* Next Workshop Badge - positioned to overlap on top */}
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow-lg transform -rotate-2 z-20">
                                        🛠️ Next Workshop
                                    </div>
                                    
                                    <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/50 p-4">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/30"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="pt-2">
                                                <h3 className="text-lg font-bold mb-3 text-gray-900 line-clamp-2">
                                                    {nextWorkshop.title}
                                                </h3>
                                                
                                                <div className="grid grid-cols-1 gap-2 mb-4">
                                                    <div className="flex items-center p-2.5 bg-gradient-to-r from-orange-50/90 to-orange-100/90 backdrop-blur-sm rounded-xl border border-orange-200/60 shadow-sm">
                                                        <div className="bg-orange-500 rounded-full p-1.5 mr-3">
                                                            <Calendar className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                        <span className="font-semibold text-orange-900 text-sm">{nextWorkshop.dateInfo !== 'TBD' ? formatDateWithOrdinal(new Date(nextWorkshop.dateInfo)) : nextWorkshop.dateInfo}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center p-2.5 bg-gradient-to-r from-pink-50/90 to-pink-100/90 backdrop-blur-sm rounded-xl border border-pink-200/60 shadow-sm">
                                                        <div className="bg-pink-500 rounded-full p-1.5 mr-3">
                                                            <Clock className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                        <span className="font-semibold text-pink-900 text-sm">{nextWorkshop.timeInfo}</span>
                                                    </div>
                                                    
                                                    {nextWorkshop.price && (
                                                        <div className="flex items-center p-2.5 bg-gradient-to-r from-yellow-50/90 to-yellow-100/90 backdrop-blur-sm rounded-xl border border-yellow-200/60 shadow-sm">
                                                            <div className="bg-yellow-500 rounded-full p-1.5 mr-3 flex items-center justify-center">
                                                                <span className="text-white text-xs font-bold">💰</span>
                                                            </div>
                                                            <span className="font-bold text-yellow-900 text-sm">{nextWorkshop.price}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                    <a
                                                        href={`/workshops/${nextWorkshop.id}`}
                                                        className="block w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-4 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-200 group text-sm"
                                                    >
                                                        <span className="flex items-center justify-center">
                                                            Learn More
                                                            <BookOpen size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                                        </span>
                                                    </a>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-orange-400/20 to-pink-400/20 rounded-2xl blur-xl scale-105"></div>
                                </motion.div>
                            ) : null}

                            {/* Fallback when no events or workshops */}
                            {!nextEvent && !nextWorkshop && (
                                <motion.div 
                                    whileHover={{ y: -5 }}
                                    className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center border border-white/50"
                                >
                                    <div className="text-6xl mb-4">🚀</div>
                                    <h3 className="text-2xl font-bold mb-3 text-gray-900">
                                        Something Amazing is Coming!
                                    </h3>
                                    <p className="text-gray-700 mb-4">
                                        Our next JavaScript adventure is being planned. Stay tuned for updates!
                                    </p>
                                    <Button
                                        href="https://meetup.com/zurich-js"
                                        variant="primary"
                                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                                    >
                                        Get Notified
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Enhanced Stats Section */}
            <motion.div
                initial={isClient ? {opacity: 0, y: 30} : {opacity: 1, y: 0}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: isClient ? 1.2 : 0, duration: 0.8}}
                className="relative z-10 mt-20"
            >
                <Stats 
                    stats={stats}
                    backgroundColor="bg-black/70 backdrop-blur-xl"
                />
            </motion.div>
        </Section>
    );
}
