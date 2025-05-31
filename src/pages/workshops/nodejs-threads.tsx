import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, MessageSquare, Cpu, Server, Network } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import CancelledCheckout from '@/components/workshop/CancelledCheckout';
import TicketSelection from '@/components/workshop/TicketSelection';
import { workshopTickets } from '@/components/workshop/workshopTickets';
import useEvents from '@/hooks/useEvents';
import { getSpeakerById } from '@/sanity/queries';
import { Speaker } from '@/types';


interface WorkshopDetails {
    id: string;
    title: string;
    subtitle: string;
    dateInfo: string;
    timeInfo: string;
    locationInfo: string;
    description: string;
    maxAttendees: number;
    speaker: Speaker;
    topics: {
        title: string;
        description: string;
        icon: React.ReactNode;
    }[];
    takeaways: string[];
    targetAudience: string[];
    prerequisites: string[];
}

interface WorkshopPageProps {
    speaker: Speaker;
}

export default function WorkshopPage({ speaker }: WorkshopPageProps) {
    const [isClient, setIsClient] = useState(false);
    const { track } = useEvents();
    const router = useRouter();
    const { canceled } = router.query;

    // Workshop data
    const workshop: WorkshopDetails = {
        id: "nodejs-threads",
        title: "Node.js: More Threads Than You Think",
        subtitle: "Exploring the Multi-Threaded Capabilities of Node.js",
        dateInfo: "June 18, 2025",
        timeInfo: "18:30 - 20:30 (2 hours)",
        locationInfo: "ORBIZ Josef, Josefstrasse 214a, 8005 Zürich",
        description: "Node.js was announced in 2009 as a single-threaded JavaScript runtime. In 2018, it became multi-threaded, and no one noticed. This workshop explores the world of multithreaded Node.js, showing how it is no longer a single-threaded environment. It introduces the Worker Threads API for offloading CPU-intensive tasks and the MessagePort API for thread communication. It discusses the challenges of cloning and transferring objects between threads and introduces tools like Piscina to simplify multithreading. Finally, it showcases Watt, a Node.js application server that leverages worker threads for isolated service execution and network-less HTTP communication.",
        maxAttendees: 20,
        speaker: speaker,
        topics: [
            {
                title: "Worker Threads API",
                description: "Learn how to use worker_threads to offload CPU-intensive tasks.",
                icon: <Cpu className="text-green-500" size={24} />
            },
            {
                title: "Thread Communication",
                description: "Master MessagePort API for effective communication between threads.",
                icon: <MessageSquare className="text-blue-500" size={24} />
            },
            {
                title: "Advanced Multithreading",
                description: "Explore Piscina and Watt for simplified multithreading in Node.js.",
                icon: <Server className="text-purple-500" size={24} />
            }
        ],
        takeaways: [
            "Understanding of Node.js's multi-threaded capabilities",
            "Practical experience with Worker Threads API",
            "Knowledge of effective thread communication patterns",
            "Skills for building thread-based performance optimizations",
            "Experience with tools like Piscina for thread pool management",
            "Insights into Watt for isolated service execution"
        ],
        targetAudience: [
            "Node.js Developers (intermediate to advanced)",
            "Backend Engineers looking to optimize performance",
            "Technical Leads and Engineering Managers",
            "Developers working on CPU-intensive Node.js applications"
        ],
        prerequisites: [
            "Solid understanding of JavaScript and Node.js",
            "Familiarity with asynchronous programming concepts",
            "Experience building Node.js applications",
            "Laptop with Node.js installed (v14+ recommended)"
        ]
    };

    // Set up client-side rendering flag to prevent hydration issues
    useEffect(() => {
        setIsClient(true);

        // Track page view
        track('workshop_page_viewed', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });
    }, []);

    // Share event function
    const shareWorkshop = async () => {
        const shareUrl = `${window.location.origin}/workshops/${workshop.id}`;
        const shareText = `Join me at ${workshop.title} with ZurichJS!`;

        track('workshop_share_clicked', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });

        if (navigator.share) {
            try {
                await navigator.share({
                    title: workshop.title,
                    text: shareText,
                    url: shareUrl,
                });
                track('workshop_share_completed', {
                    workshop_id: workshop.id,
                    workshop_title: workshop.title,
                    share_method: 'native'
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
            track('workshop_share_completed', {
                workshop_id: workshop.id,
                workshop_title: workshop.title,
                share_method: 'clipboard'
            });
        });
    };

    // Scroll to registration function
    const scrollToRegistration = () => {
        track('workshop_registration_button_clicked', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });

        const registrationElement = document.getElementById('registrationContainer');
        if (registrationElement) {
            // Get the element's position
            const elementPosition = registrationElement.getBoundingClientRect().top + window.pageYOffset;

            // Scroll to a position 100px above the element
            window.scrollTo({
                top: elementPosition - 100,
                behavior: 'smooth'
            });

            // Add a highlight effect
            const tixtreeElement = document.getElementById('tixtree-wrapper');
            if (tixtreeElement) {
                tixtreeElement.classList.add('highlight-pulse');
                setTimeout(() => {
                    tixtreeElement.classList.remove('highlight-pulse');
                }, 2000);
            }
        }
    };

    return (
        <Layout>
            <SEO
                title={`${workshop.title} | ZurichJS Workshop`}
                description={`Join us for ${workshop.title}: ${workshop.subtitle}. ${workshop.description.slice(0, 120)}...`}
                openGraph={{
                    title: `${workshop.title} | ZurichJS Workshop`,
                    description: workshop.description.slice(0, 120) + '...',
                    type: 'website',
                    image: `/api/og/workshop?title=${encodeURIComponent(workshop.title)}&subtitle=${encodeURIComponent(workshop.subtitle)}&speakerName=${encodeURIComponent(workshop.speaker.name)}&speakerImage=${encodeURIComponent(workshop.speaker.image)}`,
                    url: `/workshops/${workshop.id}`
                }}
            />

            {/* Hero Section */}
            <Section variant="gradient" padding="lg" className="mt-2 sm:mt-3">
                <div className="mb-3 sm:mb-4">
                    <Link href="/workshops" className="inline-flex items-center text-black hover:underline text-sm sm:text-base">
                        <ChevronLeft size={16} className="mr-1"/>
                        Back to all workshops
                    </Link>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                    <motion.div
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.5}}
                        className="lg:w-1/2"
                    >
                        <div className="bg-black text-js inline-block px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-bold mb-3 sm:mb-4">
                            🚀 Premium Workshop
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 sm:mb-3 text-black leading-tight">
                            {workshop.title}
                        </h1>
                        <h2 className="text-lg sm:text-xl md:text-2xl mb-4 sm:mb-5 text-gray-800 font-medium">
                            {workshop.subtitle}
                        </h2>

                        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                            <div className="flex items-center bg-white shadow-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
                                <Calendar size={18} className="mr-1.5 sm:mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Date</p>
                                    <p>{workshop.dateInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
                                <Clock size={18} className="mr-1.5 sm:mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Duration</p>
                                    <p>{workshop.timeInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
                                <MapPin size={18} className="mr-1.5 sm:mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Location</p>
                                    <p>{workshop.locationInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
                                <Users size={18} className="mr-1.5 sm:mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Capacity</p>
                                    <p>Limited to {workshop.maxAttendees} attendees</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {isClient && (
                                <Button
                                    onClick={shareWorkshop}
                                    variant="outline"
                                    className="border-black text-black hover:bg-black hover:text-js text-sm sm:text-base py-2 sm:py-2.5"
                                >
                                    <Share2 size={16} className="mr-1.5"/>
                                    Share workshop
                                </Button>
                            )}
                            <Button
                                onClick={scrollToRegistration}
                                className="bg-black text-js hover:bg-gray-800 text-sm sm:text-base py-2 sm:py-2.5"
                            >
                                Get Your Ticket
                            </Button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{opacity: 0, scale: 0.95}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{duration: 0.5, delay: 0.2}}
                        className="lg:w-1/2 mt-6 sm:mt-8 lg:mt-0"
                    >
                        <div className="rounded-xl overflow-hidden shadow-lg sm:shadow-xl bg-white p-5 sm:p-8 border-l-4 border-green-600 lg:sticky lg:top-24 relative">
                            <div className="absolute right-0 top-0 bg-js rounded-full w-16 sm:w-24 h-16 sm:h-24 opacity-20"></div>
                            <div className="absolute -bottom-10 -left-10 bg-gradient-to-tr from-green-200 to-transparent rounded-full w-32 h-32 opacity-30"></div>
                            
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative mb-5">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-js rounded-full opacity-30 blur-lg transform scale-110"></div>
                                    <Image
                                        src={`${workshop.speaker.image}?h=300`}
                                        alt={workshop.speaker.name}
                                        width={220}
                                        height={220}
                                        className="rounded-full border-4 border-white shadow-lg relative z-10"
                                    />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-2xl text-black mb-1">{workshop.speaker.name}</h3>
                                    <p className="text-lg text-gray-600 mb-3">{workshop.speaker.title}</p>
                                    
                                    <div className="flex flex-wrap gap-2 justify-center mb-5">
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Node.js Core Team</span>
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">Published Author</span>
                                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">Founder & CTO</span>
                                    </div>
                                    
                                    <div className="bg-green-50 p-5 rounded-lg border-l-2 border-green-400">
                                        <h4 className="font-bold text-sm mb-2 text-green-800">EXPERTISE</h4>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Node.js Internals</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Performance Optimization</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Threading Models</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Async Patterns</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-5 rounded-lg mt-6 border border-gray-100">
                                <p className="font-medium text-gray-700">Limited to {workshop.maxAttendees} attendees</p>
                                <p className="text-sm text-gray-600 mt-2">See ticket options below.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </Section>

            {/* Workshop Details */}
            <Section>
                {/* Workshop Overview moved here */}
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5}}
                    className="mb-8 sm:mb-12 bg-white p-5 sm:p-7 rounded-lg shadow-md border-t-4 border-js"
                >
                    <div className="flex items-center mb-4 sm:mb-6">
                        <div className="h-1 w-6 sm:w-10 bg-js mr-2 sm:mr-3"></div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Workshop Overview</h2>
                        <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                    </div>
                    <p className="text-gray-800 leading-relaxed text-base sm:text-lg">
                        {workshop.description}
                    </p>
                </motion.div>
                
                <div className="flex flex-col lg:flex-row gap-6 sm:gap-10">
                    {/* Main Content - now 50% width */}
                    <div className="lg:w-1/2">
                        {/* Workshop Topics */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true}}
                            transition={{duration: 0.5}}
                            className="mb-8 sm:mb-12"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-green-600 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Topics We&apos;ll Cover</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.1}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <Cpu className="text-green-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Worker Threads API
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Learn the fundamentals of Node.js&apos;s Worker Threads API for creating true multi-threaded applications:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Creating and managing worker threads</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Identifying CPU-intensive tasks for offloading</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Thread lifecycle and error handling</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.2}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-blue-100 p-2 rounded-full">
                                            <MessageSquare className="text-blue-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Thread Communication
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Master effective communication patterns between threads in Node.js:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">MessagePort API for efficient data transfer</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Cloning vs. transferring objects between threads</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Parent-child communication patterns</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.3}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-purple-100 p-2 rounded-full">
                                            <Server className="text-purple-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Thread Pools with Piscina
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Simplify multithreading with thread pool management:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Implementing thread pools with Piscina</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Dynamic task distribution and load balancing</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Performance optimization techniques</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.4}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-yellow-100 p-2 rounded-full">
                                            <Network className="text-yellow-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Watt Application Server
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Explore the cutting-edge Watt server for isolated service execution:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Service isolation through worker threads</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Network-less HTTP communication</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Building resilient service architectures</span>
                                        </li>
                                    </ul>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Takeaways */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="mb-8 sm:mb-12 bg-white p-4 sm:p-8 rounded-lg shadow-md border-t-4 border-js"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-js mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">What You&apos;ll Take Away</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 sm:gap-5">
                                {workshop.takeaways.map((takeaway, index) => (
                                    <div key={index} className="flex items-start bg-gray-50 p-4 rounded-lg">
                                        <div className="bg-js h-6 w-6 rounded-full flex items-center justify-center text-black font-bold mr-3 flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-800 text-base">{takeaway}</p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-6 bg-yellow-50 border-l-4 border-js p-4 rounded-lg">
                                <p className="text-sm sm:text-base font-medium text-gray-800">
                                    <span className="text-yellow-600 font-bold">Note:</span> All participants will receive code examples and reference materials to apply multithreading techniques in their own projects after the workshop.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                
                    {/* Sidebar Content - now also 50% width */}
                    <div className="lg:w-1/2">
                        {/* Who Should Attend */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mb-8 sm:mb-12 bg-white p-4 sm:p-8 rounded-lg shadow-md border-t-4 border-green-500"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-green-500 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Who Should Attend</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            
                            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                                {workshop.targetAudience.map((audience, index) => (
                                    <div key={index} className="bg-green-50 rounded-lg p-3 sm:p-5">
                                        <Users className="mb-2 sm:mb-3 text-green-600" size={22} />
                                        <p className="font-medium text-gray-800 text-base">{audience}</p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 sm:mt-6 bg-green-50 border-l-4 border-green-500 p-3 sm:p-4 rounded-lg">
                                <p className="text-sm sm:text-base font-medium text-gray-800">
                                    <span className="text-green-600 font-bold">Perfect for:</span> Developers looking to leverage multithreading for performance-critical Node.js applications.
                                </p>
                            </div>
                        </motion.div>

                        {/* Workshop Registration */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            id="registrationContainer"
                            className="bg-white p-4 sm:p-6 rounded-lg shadow-md sm:shadow-lg mb-6 sm:mb-8 border-t-4 border-js relative"
                        >
                            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center text-black">
                                <Users className="mr-2 text-js" size={22} />
                                Secure Your Spot
                            </h3>

                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-base">Date:</span>
                                    <span className="text-black text-base">{workshop.dateInfo}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-base">Time:</span>
                                    <span className="text-black text-base">{workshop.timeInfo}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-800 text-base">Availability:</span>
                                    <span className="text-black text-base">Only {workshop.maxAttendees} spots</span>
                                </div>

                                <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-3 rounded-lg">
                                    <p className="font-bold text-red-700">
                                        Only 5 tickets left!
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1 italic">
                                        Note: Ticket availability may take up to 24h to update.
                                    </p>
                                </div>

                                <div className="mt-3 bg-orange-50 border-l-4 border-orange-400 p-3 rounded-lg">
                                    <p className="font-bold text-orange-700">
                                        Prices increase to CHF 150 per seat on June 5th
                                    </p>
                                    <div className="mt-2 p-2 bg-white rounded-md text-center">
                                        <p className="text-sm font-semibold text-gray-700">Time remaining until price increase:</p>
                                        <div id="priceIncreaseTimer" className="font-mono text-lg font-bold text-orange-600">
                                            {isClient && (
                                                <span>
                                                    {Math.floor((new Date('2025-06-05T00:00:00Z').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm sm:text-base text-gray-600">
                                        Includes workshop materials, code examples, and refreshments
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-600 mt-2 italic">
                                        All proceeds support ZurichJS running costs, refreshments, and future meetups. None of the money goes to Platformatic.
                                    </p>
                                </div>
                            </div>

                            {canceled === 'true' ? (
                                <CancelledCheckout 
                                    workshopId="nodejs-threads"
                                    workshopTitle={workshop.title}
                                />
                            ) : (
                                <>
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg mb-4">
                                        <p className="font-medium text-gray-800">
                                            Only {workshop.maxAttendees} spots available for this hands-on technical workshop.
                                        </p>
                                        <p className="text-xs text-gray-700 mt-1">
                                            <strong>Pro tip:</strong> Sign up for a ZurichJS account to get a 20% community discount, or use a coupon code by adding <code>?coupon=YOUR_CODE</code> to the URL.
                                        </p>
                                    </div>

                                    <p className="mb-4 font-medium text-base">
                                        Join our exclusive workshop to learn how to leverage Node.js&apos;s multi-threaded capabilities for high-performance applications.
                                    </p>

                                    {/* Replace TixTree Widget with TicketSelection */}
                                    {isClient && <TicketSelection
                                        options={workshopTickets}
                                        className="max-w-2xl mx-auto"
                                        workshopId="nodejs-threads"
                                    />}
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            </Section>

            {/* Call to Action */}
            <Section variant="black">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-3 sm:py-4"
                >
                    <div className="inline-block bg-gradient-to-r from-green-500 to-yellow-500 p-1 rounded-lg sm:rounded-xl mb-5 sm:mb-8">
                        <div className="bg-black rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                            <p className="text-white text-sm sm:text-base font-bold">June 18, 2024 • 18:30-20:30 • Limited to 20 participants</p>
                        </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-5 text-js">Unlock the Full Power of Node.js Threads! 🚀</h2>
                    <p className="text-base sm:text-lg md:text-xl mb-5 sm:mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Join this exclusive workshop to discover how Node.js evolved beyond its single-threaded origins. 
                        Learn practical multi-threading techniques from a Node.js expert!
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                        <a
                            href="#registrationContainer"
                            className="bg-js text-black px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-300 transition-colors w-full sm:w-auto"
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToRegistration();
                            }}
                        >
                            Get Your Ticket
                        </a>
                        <button
                            onClick={shareWorkshop}
                            className="bg-gray-800 text-white px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-gray-700 transition-colors w-full sm:w-auto mt-3 sm:mt-0"
                        >
                            <Share2 size={18} className="inline mr-2"/> 
                            Share with Your Team
                        </button>
                    </div>

                    <div className="mt-6 sm:mt-8 bg-gray-800 rounded-lg p-3 sm:p-4 max-w-xl mx-auto">
                        <p className="text-white text-base">
                            Master the art of multi-threaded programming in Node.js and take your applications to the next level of performance and scalability.
                        </p>
                        <p className="text-js font-bold mt-2 text-base">Join us on {workshop.dateInfo}</p>
                    </div>
                </motion.div>
            </Section>
        </Layout>
    );
}

export async function getStaticProps() {
    // Fetch the speaker data using the getSpeakerById function
    const speaker = await getSpeakerById('matteo-collina');

    if (!speaker) {
        return {
            notFound: true,
        };
    }

    return {
        props: {
            speaker,
        },
        revalidate: 60, // Revalidate the page every 60 seconds
    };
}
