import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, Layout as LayoutIcon, Rocket, Code } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import PageLayout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
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
    price: string;
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

    // Workshop data
    const workshop: WorkshopDetails = {
        id: "astro-zero-to-hero-workshop-2024",
        title: "Astro: Zero to Hero",
        subtitle: "Build High-Performance Websites with Astro",
        dateInfo: "July 23, 2025",
        timeInfo: "17:30 - 21:30 (4 hours)",
        locationInfo: "Zürich (Venue TBD)",
        price: "180 CHF",
        description: "This comprehensive workshop takes you from zero knowledge to Astro hero status in just four hours. You'll learn how to leverage Astro's unique Island Architecture to build blazing-fast websites that ship zero JavaScript by default. We'll cover everything from project setup and configuration to advanced patterns including content collections, dynamic routing, and integration with your favorite frameworks. By the end of this hands-on session, you'll walk away with the skills to build modern, SEO-friendly websites that load in milliseconds and deliver exceptional user experiences.",
        maxAttendees: 15,
        speaker: speaker,
        topics: [
            {
                title: "Astro Fundamentals",
                description: "Learn Astro's core concepts and architecture for building high-performance websites.",
                icon: <Rocket className="text-blue-500" size={24} />
            },
            {
                title: "Content Collections",
                description: "Master Astro's powerful content management and type-safe Markdown/MDX systems.",
                icon: <LayoutIcon className="text-purple-500" size={24} />
            },
            {
                title: "Framework Integrations",
                description: "Seamlessly integrate React, Vue, Svelte or other framework components with Astro Islands.",
                icon: <Code className="text-green-500" size={24} />
            }
        ],
        takeaways: [
            "Understanding of Astro's Island Architecture and how it optimizes performance",
            "Ability to structure and organize Astro projects for maintainability",
            "Skills to build content-rich websites with Markdown/MDX and content collections",
            "Knowledge of integrating components from React, Vue, Svelte or other frameworks",
            "Experience with dynamic routing and data fetching patterns",
            "Techniques for optimizing images, assets and SEO"
        ],
        targetAudience: [
            "Frontend Developers (all experience levels)",
            "Web Developers looking to upgrade their toolkit",
            "Designers transitioning to development",
            "Content creators wanting technical website skills"
        ],
        prerequisites: [
            "Basic HTML, CSS, and JavaScript knowledge",
            "Familiarity with command line and npm/yarn",
            "Your own laptop with Node.js installed (v16+ recommended)",
            "No previous Astro experience required"
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

        // Initialize TixTree when client is ready
        if (typeof window !== 'undefined') {
            // Only add script if it doesn't already exist
            if (!document.getElementById('tixtree-script')) {
                // Load the TixTree script dynamically
                const script = document.createElement('script');
                script.src = 'https://www.tixtree.com/widgets/tixtree.js';
                script.id = 'tixtree-script';
                script.dataset.type = 'event';
                script.dataset.id = 'workshop-astro-zero-to-hero-677d595b6248';
                script.async = true;
                document.body.appendChild(script);
            }

            // Add custom CSS for highlight effect
            const style = document.createElement('style');
            style.textContent = `
        @keyframes pulse-highlight {
          0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(250, 204, 21, 0); }
          100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
        }
        .highlight-pulse {
          animation: pulse-highlight 1.5s ease-in-out;
        }
        /* Fix for mobile overflow */
        body, html {
          overflow-x: hidden;
          max-width: 100%;
        }
        /* Ensure TixTree widget is responsive */
        #tixtree-wrapper {
          width: 100% !important;
          margin: 0 auto !important;
          display: block !important;
        }
        /* Hide horizontal scrollbar */
        ::-webkit-scrollbar-horizontal {
          display: none;
        }
      `;
            document.head.appendChild(style);
        }
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
        <PageLayout>
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
                                <Calendar size={18} className="mr-1.5 sm:mr-2 text-blue-600"/>
                                <div>
                                    <p className="font-semibold">Date</p>
                                    <p>{workshop.dateInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
                                <Clock size={18} className="mr-1.5 sm:mr-2 text-blue-600"/>
                                <div>
                                    <p className="font-semibold">Duration</p>
                                    <p>{workshop.timeInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
                                <MapPin size={18} className="mr-1.5 sm:mr-2 text-blue-600"/>
                                <div>
                                    <p className="font-semibold">Location</p>
                                    <p>{workshop.locationInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
                                <Users size={18} className="mr-1.5 sm:mr-2 text-blue-600"/>
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
                        <div className="rounded-xl overflow-hidden shadow-lg sm:shadow-xl bg-white p-5 sm:p-8 border-l-4 border-blue-600 lg:sticky lg:top-24 relative">
                            <div className="absolute right-0 top-0 bg-js rounded-full w-16 sm:w-24 h-16 sm:h-24 opacity-20"></div>
                            <div className="absolute -bottom-10 -left-10 bg-gradient-to-tr from-blue-200 to-transparent rounded-full w-32 h-32 opacity-30"></div>
                            
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative mb-5">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-js rounded-full opacity-30 blur-lg transform scale-110"></div>
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
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">Astro Core Team</span>
                                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">Web Performance Expert</span>
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Technical Writer</span>
                                    </div>
                                    
                                    <div className="bg-blue-50 p-5 rounded-lg border-l-2 border-blue-400">
                                        <h4 className="font-bold text-sm mb-2 text-blue-800">EXPERTISE</h4>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Astro</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Web Performance</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Jamstack</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">SSR/SSG</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-5 rounded-lg mt-6 border border-gray-100">
                                <p className="font-medium text-gray-700">Price: {workshop.price}</p>
                                <p className="text-sm text-gray-600 mt-2">Limited to {workshop.maxAttendees} attendees.</p>
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
                    {/* Main Content - 50% width */}
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
                                <div className="h-1 w-6 sm:w-10 bg-blue-600 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Topics We&apos;ll Cover</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.1}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-blue-100 p-2 rounded-full">
                                            <Rocket className="text-blue-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Astro Fundamentals
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Learn the core concepts of Astro&apos;s architecture and how it optimizes performance:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Understanding Islands Architecture</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Project setup and file-based routing</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Building your first Astro components</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.2}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-purple-100 p-2 rounded-full">
                                            <LayoutIcon className="text-purple-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Content Collections
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Master Astro&apos;s powerful content management systems:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Type-safe Markdown/MDX content</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Setting up collection schemas</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Building dynamic content pages</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.3}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <Code className="text-green-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Framework Integrations
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Integrate your favorite UI frameworks with Astro Islands:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Adding React, Vue, or Svelte components</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Client-side hydration strategies</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Sharing state between islands</span>
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
                                            <Calendar className="text-yellow-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Advanced Patterns
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Take your Astro skills to the next level:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Dynamic routing and data fetching</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Optimizing images and assets</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Advanced SEO techniques</span>
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
                                    <span className="text-yellow-600 font-bold">Note:</span> All participants will receive starter templates, code samples, and reference materials to continue building with Astro after the workshop.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                
                    {/* Sidebar Content - 50% width */}
                    <div className="lg:w-1/2">
                        {/* Who Should Attend */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mb-8 sm:mb-12 bg-white p-4 sm:p-8 rounded-lg shadow-md border-t-4 border-blue-500"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-blue-500 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Who Should Attend</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            
                            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                                {workshop.targetAudience.map((audience, index) => (
                                    <div key={index} className="bg-blue-50 rounded-lg p-3 sm:p-5">
                                        <Users className="mb-2 sm:mb-3 text-blue-600" size={22} />
                                        <p className="font-medium text-gray-800 text-base">{audience}</p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 sm:mt-6 bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg">
                                <p className="text-sm sm:text-base font-medium text-gray-800">
                                    <span className="text-blue-600 font-bold">Perfect for:</span> Developers looking to build lightning-fast websites with modern tools and minimal JavaScript.
                                </p>
                            </div>
                        </motion.div>

                        {/* Prerequisites */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="mb-8 sm:mb-12 bg-white p-4 sm:p-8 rounded-lg shadow-md border-t-4 border-purple-500"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-purple-500 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Prerequisites</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                {workshop.prerequisites.map((prerequisite, index) => (
                                    <div key={index} className="flex items-start">
                                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 mr-3">
                                            <span className="text-purple-700 font-bold text-sm">{index + 1}</span>
                                        </div>
                                        <p className="text-gray-700">{prerequisite}</p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-6 bg-purple-50 border-l-4 border-purple-400 p-4 rounded-lg">
                                <p className="text-sm sm:text-base font-medium text-gray-800">
                                    Don&apos;t worry if you&apos;re new to Astro! This workshop is designed to take you from zero experience to being able to build complete websites.
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
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-base">Location:</span>
                                    <span className="text-black text-base">{workshop.locationInfo}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-base">Price:</span>
                                    <span className="text-black text-base font-bold">{workshop.price}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-800 text-base">Availability:</span>
                                    <span className="text-black text-base">Only {workshop.maxAttendees} spots</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm sm:text-base text-gray-600">
                                        Includes workshop materials, code examples, starter templates, and refreshments
                                    </p>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg mb-4">
                                <p className="font-medium text-gray-800">
                                    Only {workshop.maxAttendees} spots available for this hands-on technical workshop.
                                </p>
                            </div>

                            <p className="mb-4 font-medium text-base">
                                Join our exclusive workshop to learn how to build blazing-fast websites with Astro&apos;s powerful architecture and tooling.
                            </p>

                            {/* TixTree Widget - Script loaded dynamically in useEffect hook */}
                            <div
                                id="tixtree-wrapper"
                                className="transition-all duration-300 overflow-x-hidden w-full"
                            ></div>
                        </motion.div>

                        {/* Join Slack Community */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="mb-8 sm:mb-12 bg-white p-4 sm:p-8 rounded-lg shadow-md border-t-4 border-purple-700"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 mb-4 flex items-center justify-center bg-purple-100 rounded-full">
                                    <svg className="w-10 h-10 text-purple-700" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Join Our Developer Community</h3>
                                <p className="text-gray-600 mb-4">Get help, share your projects, and connect with other Astro enthusiasts in our Slack community.</p>
                                <a 
                                    href="https://join.slack.com/t/zurichjs/shared_invite/zt-33h65a5nr-ReVlKRBWJ0SDRIZsveuoMQ" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-purple-700 hover:bg-purple-800 text-white py-2 px-6 rounded-md font-medium transition-colors inline-flex items-center"
                                >
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                                    </svg>
                                    Join ZurichJS Slack
                                </a>
                            </div>
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
                    <div className="inline-block bg-gradient-to-r from-blue-500 to-yellow-500 p-1 rounded-lg sm:rounded-xl mb-5 sm:mb-8">
                        <div className="bg-black rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                            <p className="text-white text-sm sm:text-base font-bold">{workshop.dateInfo} • {workshop.timeInfo} • Limited to {workshop.maxAttendees} participants</p>
                        </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-5 text-js">Become an Astro Expert in Just One Evening! 🚀</h2>
                    <p className="text-base sm:text-lg md:text-xl mb-5 sm:mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Join this intensive workshop to learn how Astro helps you build lightning-fast websites with less JavaScript. 
                        Master the framework that&apos;s transforming modern web development!
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
                            Get Your Ticket ({workshop.price})
                        </a>
                        <button
                            onClick={shareWorkshop}
                            className="bg-gray-800 text-white px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-gray-700 transition-colors w-full sm:w-auto mt-3 sm:mt-0"
                        >
                            <Share2 size={18} className="inline mr-2"/> 
                            Share with Your Team
                        </button>
                        <a
                            href="https://join.slack.com/t/zurichjs/shared_invite/zt-33h65a5nr-ReVlKRBWJ0SDRIZsveuoMQ"
                            target="_blank"
                            rel="noopener noreferrer" 
                            className="bg-purple-700 text-white px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-purple-800 transition-colors w-full sm:w-auto mt-3 sm:mt-0"
                        >
                            <svg className="w-5 h-5 inline mr-2" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                            </svg>
                            Join Slack Community
                        </a>
                    </div>

                    <div className="mt-6 sm:mt-8 bg-gray-800 rounded-lg p-3 sm:p-4 max-w-xl mx-auto">
                        <p className="text-white text-base">
                            Learn everything you need to start building blazing-fast websites with Astro&apos;s innovative architecture and advanced features.
                        </p>
                        <p className="text-js font-bold mt-2 text-base">Join us on {workshop.dateInfo}</p>
                    </div>
                </motion.div>
            </Section>
        </PageLayout>
    );
}

export async function getStaticProps() {
    // Fetch the speaker data using the getSpeakerById function
    const speaker = await getSpeakerById('elian-van-cutsem');

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