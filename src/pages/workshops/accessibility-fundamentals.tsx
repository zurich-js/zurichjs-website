// ... existing code ...
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, Code, MessageSquare, BookOpen, LayoutTemplate } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
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
    priceInfo: string;
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
    const [copySuccess, setCopySuccess] = useState(false);
    const { track } = useEvents();

    // Workshop data
    const workshop: WorkshopDetails = {
        id: "accessibility-fundamentals-workshop",
        title: "Getting Ready for the European Accessibility Act",
        subtitle: "Getting Accessibility Right with the Fundamentals",
        dateInfo: "TBD",
        timeInfo: "Duration: 2-3 hours",
        locationInfo: "TBD",
        description: "Prepare your web applications for the European Accessibility Act (EAA) with this comprehensive workshop on web accessibility fundamentals. Learn how to create inclusive digital experiences that comply with accessibility standards and regulations. This workshop covers essential concepts, practical techniques, and best practices to help you build accessible websites and applications. Through hands-on exercises and real-world examples, you'll gain the knowledge and skills to make your digital products accessible to everyone, including people with disabilities.",
        priceInfo: "CHF 150 per person",
        maxAttendees: 15,
        speaker: speaker,
        topics: [
            {
                title: "Accessibility Fundamentals",
                description: "Master the core concepts of web accessibility and inclusive design.",
                icon: <Code className="text-green-500" size={24} />
            },
            {
                title: "EAA Compliance",
                description: "Understand the requirements of the European Accessibility Act.",
                icon: <MessageSquare className="text-green-500" size={24} />
            },
            {
                title: "Practical Implementation",
                description: "Learn techniques for implementing accessibility in your projects.",
                icon: <BookOpen className="text-green-500" size={24} />
            }
        ],
        takeaways: [
            "Understanding of accessibility principles and WCAG guidelines",
            "Knowledge of the European Accessibility Act requirements",
            "Ability to identify and fix common accessibility issues",
            "Techniques for keyboard navigation and screen reader compatibility",
            "Strategies for creating accessible forms and interactive elements",
            "Methods for testing and validating accessibility",
            "Comprehensive learning materials and code samples"
        ],
        targetAudience: [
            "Web developers and designers",
            "UX/UI professionals",
            "Product managers and owners",
            "QA engineers and testers",
            "Anyone responsible for digital accessibility compliance"
        ],
        prerequisites: [
            "Basic understanding of HTML, CSS, and JavaScript",
            "Familiarity with web development concepts",
            "Laptop with a modern browser installed",
            "No prior accessibility experience required"
        ]
    };

    // ... existing code ...

    useEffect(() => {
        setIsClient(true);

        // Track page view
        track('workshop_page_viewed', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });

        // Initialize GetWaitlist when client is ready
        if (typeof window !== 'undefined') {
            // Load the GetWaitlist script dynamically
            const script = document.createElement('script');
            script.src = 'https://prod-waitlist-widget.s3.us-east-2.amazonaws.com/getwaitlist.min.js';
            script.async = true;
            document.body.appendChild(script);

            // Add the stylesheet
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'https://prod-waitlist-widget.s3.us-east-2.amazonaws.com/getwaitlist.min.css';
            document.head.appendChild(link);

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
            /* Ensure waitlist widget is responsive and centered */
            #getWaitlistContainer {
              width: 100% !important;
              margin: 0 auto !important;
              display: flex !important;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            #getWaitlistContainer form {
              margin: 0 auto !important;
              max-width: 100% !important;
            }
            #getWaitlistContainer .waitlist-form {
              margin: 0 auto !important;
              display: flex !important;
              flex-direction: column;
              align-items: center;
            }
            /* Hide horizontal scrollbar */
            ::-webkit-scrollbar-horizontal {
              display: none;
            }
          `;
            document.head.appendChild(style);
        }
    }, []);

    const scrollToWaitlist = () => {
        track('workshop_waitlist_button_clicked', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });

        const waitlistElement = document.getElementById('getWaitlistContainer');
        if (waitlistElement) {
            // Get the element's position
            const elementPosition = waitlistElement.getBoundingClientRect().top + window.pageYOffset;

            // Scroll to a position 100px above the element
            window.scrollTo({
                top: elementPosition - 100,
                behavior: 'smooth'
            });

            // Add a highlight effect
            waitlistElement.classList.add('highlight-pulse');
            setTimeout(() => {
                waitlistElement.classList.remove('highlight-pulse');
            }, 2000);
        }
    };

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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
            track('workshop_share_completed', {
                workshop_id: workshop.id,
                workshop_title: workshop.title,
                share_method: 'clipboard'
            });
        });
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
                            🌐 Accessibility Workshop
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
                                    {copySuccess ? 'Link copied! 👍' : 'Share workshop'}
                                </Button>
                            )}
                            <Button
                                onClick={scrollToWaitlist}
                                className="bg-black text-js hover:bg-gray-800 text-sm sm:text-base py-2 sm:py-2.5"
                            >
                                Join Waitlist
                            </Button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{opacity: 0, scale: 0.95}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{duration: 0.5, delay: 0.2}}
                        className="lg:w-1/2 mt-6 sm:mt-8 lg:mt-0"
                    >
                        <div className="rounded-xl overflow-hidden shadow-lg sm:shadow-xl bg-white p-5 sm:p-8 border-l-4 border-purple-600 lg:sticky lg:top-24 relative">
                            <div className="absolute right-0 top-0 bg-js rounded-full w-16 sm:w-24 h-16 sm:h-24 opacity-20"></div>
                            <div className="absolute -bottom-10 -left-10 bg-gradient-to-tr from-purple-200 to-transparent rounded-full w-32 h-32 opacity-30"></div>
                            
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative mb-5">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-400 to-js rounded-full opacity-30 blur-lg transform scale-110"></div>
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
                                    <p className="text-lg text-gray-600 mb-3">Senior Frontend Engineer & Accessibility Expert</p>
                                    
                                    <div className="flex flex-wrap gap-2 justify-center mb-5">
                                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">Web Accessibility</span>
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">Inclusive Design</span>
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Frontend Engineer</span>
                                    </div>
                                    
                                    <div className="bg-purple-50 p-5 rounded-lg border-l-2 border-purple-400">
                                        <h4 className="font-bold text-sm mb-2 text-purple-800">EXPERTISE</h4>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">WCAG Guidelines</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Accessibility Testing</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">Semantic HTML</span>
                                            <span className="bg-white text-gray-700 px-2 py-1 rounded text-xs font-medium">ARIA</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-5 rounded-lg mt-6 border border-gray-100">
                                <p className="font-medium text-gray-700">Limited to {workshop.maxAttendees} attendees</p>
                                <p className="text-sm text-gray-600 mt-2">Join the waitlist to be notified when registration opens!</p>
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
                                <div className="h-1 w-6 sm:w-10 bg-purple-600 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Topics We&apos;ll Cover</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.1}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-purple-100 p-2 rounded-full">
                                            <BookOpen className="text-purple-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Accessibility Fundamentals
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Understand the principles of web accessibility, WCAG guidelines, and why accessibility matters:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Core accessibility principles and benefits</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">WCAG 2.1 guidelines and success criteria</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Different types of disabilities and assistive technologies</span>
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
                                            European Accessibility Act
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Learn about the EAA requirements and how they impact digital products:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Overview of EAA requirements and timelines</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Compliance strategies and documentation</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Legal implications and business benefits</span>
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
                                            Semantic HTML
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Master the art of writing semantic HTML for accessibility:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Proper document structure and landmarks</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Semantic elements and their accessibility benefits</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Common anti-patterns and how to avoid them</span>
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
                                            <LayoutTemplate className="text-yellow-700" size={22} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Testing and Validation
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-base">
                                        Learn how to test and validate accessibility in your projects:
                                    </p>
                                    <ul className="mt-2 space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Automated testing tools and their limitations</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Manual testing techniques and checklists</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700 text-base">Testing with assistive technologies</span>
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
                                    <span className="text-yellow-600 font-bold">Note:</span> All participants will receive comprehensive learning materials, code examples, and accessibility checklists to help implement accessibility in their own projects.
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
                            className="mb-8 sm:mb-12 bg-white p-4 sm:p-8 rounded-lg shadow-md border-t-4 border-purple-500"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-purple-500 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Who Should Attend</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            
                            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                                {workshop.targetAudience.map((audience, index) => (
                                    <div key={index} className="bg-purple-50 rounded-lg p-3 sm:p-5">
                                        <Users className="mb-2 sm:mb-3 text-purple-600" size={22} />
                                        <p className="font-medium text-gray-800 text-base">{audience}</p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 sm:mt-6 bg-purple-50 border-l-4 border-purple-500 p-3 sm:p-4 rounded-lg">
                                <p className="text-sm sm:text-base font-medium text-gray-800">
                                    <span className="text-purple-600 font-bold">Perfect for:</span> Professionals looking to ensure their digital products comply with accessibility standards and the European Accessibility Act.
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
                                Join the Waitlist
                            </h3>

                            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-base">Date:</span>
                                    <span className="text-black text-base">{workshop.dateInfo}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-base">Duration:</span>
                                    <span className="text-black text-base">{workshop.timeInfo}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800 text-base">Expected Price:</span>
                                    <span className="text-black text-base">{workshop.priceInfo}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-800 text-base">Availability:</span>
                                    <span className="text-black text-base">Only {workshop.maxAttendees} spots</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm sm:text-base text-gray-600">
                                        Includes workshop materials, code examples, and accessibility checklists
                                    </p>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg mb-4">
                                <p className="font-medium text-gray-800">
                                    This workshop has limited seats to ensure a quality learning experience.
                                </p>
                            </div>

                            <p className="mb-4 font-medium text-base">
                                Sign up for the waitlist to be notified when registration opens for this comprehensive accessibility workshop!
                            </p>

                            {/* GetWaitlist Component */}
                            <div
                                id="getWaitlistContainer"
                                data-waitlist_id="26498"
                                data-widget_type="WIDGET_1"
                                className="transition-all duration-300 flex justify-center items-center w-full"
                            ></div>
                        </motion.div>
                        
                        {/* Workshop Format */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8 border-t-4 border-green-500"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-green-500 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Workshop Format</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>

                            <p className="text-gray-700 mb-4">
                                This workshop is designed to provide a comprehensive introduction to web accessibility through a mix of theory and hands-on practice. You&apos;ll learn how to identify and fix common accessibility issues in real-world scenarios.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                <div className="bg-green-50 p-3 rounded-lg">
                                    <h4 className="font-medium text-green-800 mb-2">Learning Approach</h4>
                                    <ul className="space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700 text-sm">Interactive demonstrations</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700 text-sm">Hands-on exercises</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700 text-sm">Real-world use cases</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg">
                                    <h4 className="font-medium text-green-800 mb-2">Workshop Structure</h4>
                                    <ul className="space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700 text-sm">Small group for personalized attention</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700 text-sm">Q&A throughout the session</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700 text-sm">Comprehensive resources</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
                                <p className="text-sm text-gray-800">
                                    <span className="font-bold">Language:</span> English | <span className="font-bold">Experience level:</span> Beginner to Intermediate
                                </p>
                            </div>
                        </motion.div>

                        {/* Speaker Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-white p-4 sm:p-6 rounded-lg shadow-md border-t-4 border-blue-500"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-blue-500 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Your Instructor</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 relative rounded-lg overflow-hidden shrink-0">
                                    <Image
                                        src={workshop.speaker.image}
                                        alt={workshop.speaker.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-1 text-center sm:text-left">{workshop.speaker.name}</h3>
                                    <p className="text-gray-600 mb-2 text-center sm:text-left">Senior Frontend Engineer & Accessibility Expert</p>
                                    
                                    <div className="flex justify-center sm:justify-start space-x-3 mb-3">
                                        {workshop.speaker.twitter && (
                                            <a
                                                href={workshop.speaker.twitter}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-700"
                                                aria-label={`${workshop.speaker.name} on Twitter`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                                </svg>
                                            </a>
                                        )}
                                        {workshop.speaker.github && (
                                            <a
                                                href={workshop.speaker.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-700 hover:text-black"
                                                aria-label={`${workshop.speaker.name} on GitHub`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                                </svg>
                                            </a>
                                        )}
                                        {workshop.speaker.linkedin && (
                                            <a
                                                href={workshop.speaker.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-700 hover:text-blue-900"
                                                aria-label={`${workshop.speaker.name} on LinkedIn`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                                </svg>
                                            </a>
                                        )}
                                        <a
                                            href="https://aleksej.dev"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-700 hover:text-black"
                                            aria-label={`${workshop.speaker.name}'s website`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 bg-blue-50 p-4 rounded-lg border-l-2 border-blue-400">
                                <p className="text-gray-700 text-sm mb-2">
                                    Aleksej is a passionate frontend developer with extensive experience in web accessibility and inclusive design. He has helped numerous organizations implement accessible solutions that comply with international standards.
                                </p>
                                <p className="text-gray-700 text-sm">
                                    With a background in both development and user experience, Aleksej brings practical insights into creating accessible digital products that work for everyone. He specializes in helping teams meet compliance requirements while improving the overall user experience.
                                </p>
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
                    <div className="inline-block bg-gradient-to-r from-purple-500 to-yellow-500 p-1 rounded-lg sm:rounded-xl mb-5 sm:mb-8">
                        <div className="bg-black rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                            <p className="text-white text-sm sm:text-base font-bold">Coming Soon • {workshop.timeInfo} • Limited to {workshop.maxAttendees} participants</p>
                        </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-5 text-js">Ready to Make Your Digital Products Accessible! 🚀</h2>
                    <p className="text-base sm:text-lg md:text-xl mb-5 sm:mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Join this comprehensive workshop to ensure your digital products comply with the European Accessibility Act 
                        and create inclusive experiences for all users!
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                        <a
                            href="#getWaitlistContainer"
                            className="bg-js text-black px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-300 transition-colors w-full sm:w-auto"
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToWaitlist();
                            }}
                        >
                            Join the Waitlist
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
                            Master the essentials of web accessibility and prepare your applications for
                            compliance with the European Accessibility Act.
                        </p>
                        <p className="text-js font-bold mt-2 text-base">Be the first to know when registration opens!</p>
                    </div>
                </motion.div>
            </Section>
        </Layout>
    );
}

export async function getStaticProps() {
    // Fetch the speaker data using the getSpeakerById function
    const speaker = await getSpeakerById('aleksej-dix');

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
