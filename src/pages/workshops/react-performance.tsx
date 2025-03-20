import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, Code, MessageSquare, BookOpen, LayoutTemplate } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import SEO from '@/components/SEO';
import { getSpeakerById } from '@/sanity/queries';
import useEvents from '@/hooks/useEvents';
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
        id: "nextjs-react-performance-workshop-2024",
        title: "Unleashing NextJS/React Performance & Resiliency",
        subtitle: "A Practical & Pragmatic Workshop for Developers",
        dateInfo: "TBD",
        timeInfo: "Duration: 1.5-2.5 hours",
        locationInfo: "TBD",
        description: "Getting pragmatic with building performant and resilient React applications. This workshop will delve into React and NextJs to create scalable, high-performance web applications made for the real world, exploring architectural patterns, rendering techniques, and optimization strategies. We'll tackle data fetching management, performance measurement, and state management, offering tools and insights for efficient coding and stakeholder communication. Practical exercises and real-world examples will equip developers with the skills to build and maintain solid web solutions, additionally, emphasizing the importance of observability and monitoring post-deployment.",
        priceInfo: "CHF 100 per person",
        maxAttendees: 30,
        speaker: speaker,
        topics: [
            {
                title: "Web Performance Pitfalls",
                description: "Learn to identify and avoid common performance issues in React applications.",
                icon: <Code className="text-yellow-500" size={24} />
            },
            {
                title: "React Reconciliation",
                description: "Dive deep into how React updates the DOM and optimize rendering.",
                icon: <MessageSquare className="text-yellow-500" size={24} />
            },
            {
                title: "Data Fetching at Scale",
                description: "Master efficient data fetching strategies with React Query.",
                icon: <BookOpen className="text-yellow-500" size={24} />
            }
        ],
        takeaways: [
            "Deeper understanding of React reconciliation and rendering",
            "Hands-on experience through practical coding labs",
            "Pragmatic performance optimization techniques",
            "Strategies for building resilient applications",
            "Insights into monitoring and observability post-deployment",
            "Comprehensive learning materials and code samples"
        ],
        targetAudience: [
            "Front-End Engineers (beginners to experienced)",
            "Technical Leads and Engineering Managers",
            "Developers working with React and NextJS in production environments"
        ],
        prerequisites: [
            "Intermediate understanding of JavaScript (ES6+)",
            "Working knowledge of React (hooks, component lifecycle)",
            "Experience with production applications",
            "Laptop with Node.js installed (latest LTS version)"
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
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);

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
            registrationElement.classList.add('highlight-pulse');
            setTimeout(() => {
                registrationElement.classList.remove('highlight-pulse');
            }, 2000);
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
                                    🚀 Foundations Workshop
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-black">
                                    {workshop.title}
                                </h1>
                                <h2 className="text-xl md:text-2xl mb-4 text-gray-800">
                                    {workshop.subtitle}
                                </h2>

                                <div className="flex flex-wrap gap-3 mb-6">
                                    <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                                        <Calendar size={16} className="mr-1.5" />
                                        <span>{workshop.dateInfo}</span>
                                    </div>
                                    <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                                        <Clock size={16} className="mr-1.5" />
                                        <span>{workshop.timeInfo}</span>
                                    </div>
                                    <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                                        <MapPin size={16} className="mr-1.5" />
                                        <span>{workshop.locationInfo}</span>
                                    </div>
                                    <div className="flex items-center bg-white bg-opacity-70 px-3 py-1.5 rounded-full text-sm">
                                        <Users size={16} className="mr-1.5" />
                                        <span>Limited to {workshop.maxAttendees} attendees</span>
                                    </div>
                                </div>

                                <p className="text-lg mb-6 text-gray-800">
                                    {workshop.description}
                                </p>

                                <div className="flex flex-wrap gap-3">
                                    {isClient && (
                                        <Button
                                            onClick={shareWorkshop}
                                            variant="outline"
                                            className="border-black text-black hover:bg-black hover:text-yellow-400"
                                        >
                                            <Share2 size={16} className="mr-1.5" />
                                            {copySuccess ? 'Link copied! 👍' : 'Share workshop'}
                                        </Button>
                                    )}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="lg:w-1/3 lg:ml-auto"
                            >
                                <div className="relative rounded-lg overflow-hidden shadow-lg bg-white p-6">
                                    <h3 className="text-xl font-bold mb-4 text-black">Workshop Highlights</h3>

                                    <div className="space-y-4">
                                        <div className="flex items-start">
                                            <div className="bg-yellow-400 p-2 rounded-full mr-3">
                                                <Code size={18} className="text-black" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Hands-on Coding Labs</h4>
                                                <p className="text-gray-600 text-sm">Practical exercises with real-world examples</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start">
                                            <div className="bg-yellow-400 p-2 rounded-full mr-3">
                                                <Users size={18} className="text-black" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Focused Workshop</h4>
                                                <p className="text-gray-600 text-sm">Compact 1.5-2.5 hour session with maximum learning value</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start">
                                            <div className="bg-yellow-400 p-2 rounded-full mr-3">
                                                <BookOpen size={18} className="text-black" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Take-Home Resources</h4>
                                                <p className="text-gray-600 text-sm">Workshop slides, detailed notes, and code samples</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-200">
                                        <div className="flex items-center mb-2">
                                            <Image
                                                src={workshop.speaker.image}
                                                alt={workshop.speaker.name}
                                                width={40}
                                                height={40}
                                                className="rounded-full mr-3"
                                            />
                                            <div>
                                                <p className="font-semibold">{workshop.speaker.name}</p>
                                                <p className="text-sm text-gray-600">Staff Frontend Engineer & Engineering Manager</p>
                                            </div>
                                        </div>
                                        <p className="text-sm italic text-gray-600">&quot;Join me to explore practical strategies for building performant and resilient React applications that stand up to real-world challenges.&quot;</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Workshop Details */}
                <section className="py-16">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col lg:flex-row gap-10">
                            {/* Main Content */}
                            <div className="lg:w-2/3">
                                {/* Workshop Topics */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                    className="mb-12"
                                >
                                    <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-yellow-400 text-black">
                                        Topics We&apos;ll Cover 🧠
                                    </h2>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.1 }}
                                            className="bg-white p-6 rounded-lg shadow-md"
                                        >
                                            <h3 className="text-lg font-bold mb-2">
                                                Web Performance Pitfalls & Balancing Pragmatism
                                            </h3>
                                            <p className="text-gray-600">
                                                Identify common performance issues and learn when to optimize and when it might be over-engineering.
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                            className="bg-white p-6 rounded-lg shadow-md"
                                        >
                                            <h3 className="text-lg font-bold mb-2">
                                                Software Resilience Patterns
                                            </h3>
                                            <p className="text-gray-600">
                                                Explore strategies to build applications that can handle unexpected issues gracefully.
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.3 }}
                                            className="bg-white p-6 rounded-lg shadow-md"
                                        >
                                            <h3 className="text-lg font-bold mb-2">
                                                Diving Deep into React Reconciliation
                                            </h3>
                                            <p className="text-gray-600">
                                                Understand how React updates the DOM and optimize your components for better rendering performance.
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.4 }}
                                            className="bg-white p-6 rounded-lg shadow-md"
                                        >
                                            <h3 className="text-lg font-bold mb-2">
                                                Managing Component Architecture
                                            </h3>
                                            <p className="text-gray-600">
                                                Learn best practices for structuring your components for maintainability and performance.
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.5 }}
                                            className="bg-white p-6 rounded-lg shadow-md"
                                        >
                                            <h3 className="text-lg font-bold mb-2">
                                                Case Study - Data Fetching at Scale (feat. React Query)
                                            </h3>
                                            <p className="text-gray-600">
                                                Explore efficient data fetching strategies using React Query for large-scale applications.
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.5, delay: 0.6 }}
                                            className="bg-white p-6 rounded-lg shadow-md"
                                        >
                                            <h3 className="text-lg font-bold mb-2">
                                                Post deployment - Observability/Monitoring & Feature Flags
                                            </h3>
                                            <p className="text-gray-600">
                                                Learn how to monitor your application&apos;s health and implement feature flags for safer deployments.
                                            </p>
                                        </motion.div>
                                    </div>
                                </motion.div>

                                {/* Takeaways */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                    className="mb-12 bg-white p-6 rounded-lg shadow-md"
                                >
                                    <h2 className="text-2xl font-bold mb-4">
                                        What You&apos;ll Get 🔑
                                    </h2>
                                    <ul className="space-y-2">
                                        {workshop.takeaways.map((takeaway, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="text-purple-500 font-bold mr-2">•</span>
                                                <span>{takeaway}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>

                                {/* Who Should Attend */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="mb-12 bg-white p-6 rounded-lg shadow-md"
                                >
                                    <h2 className="text-2xl font-bold mb-4">
                                        Who It&apos;s For 👩‍💻
                                    </h2>
                                    <ul className="space-y-2">
                                        {workshop.targetAudience.map((audience, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="text-purple-500 font-bold mr-2">•</span>
                                                <span>{audience}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>

                                {/* Prerequisites */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="mb-12 bg-white p-6 rounded-lg shadow-md"
                                >
                                    <h2 className="text-2xl font-bold mb-4">
                                        Participation Requirements 📋
                                    </h2>
                                    <ul className="space-y-2">
                                        {workshop.prerequisites.map((prerequisite, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="text-purple-500 font-bold mr-2">•</span>
                                                <span>{prerequisite}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            </div>

                            {/* Sidebar */}
                            <div className="lg:w-1/3">
                                {/* Workshop Registration */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                    id="registrationContainer"
                                    className="bg-white p-6 rounded-lg shadow-md mb-6"
                                >
                                    <h3 className="text-xl font-bold mb-3 flex items-center">
                                        <Users className="mr-2 text-yellow-500" size={20} />
                                        Register for the Workshop
                                    </h3>

                                    <p className="mb-4">
                                        This workshop has limited seats to ensure a quality learning experience. Register now to secure your spot!
                                    </p>

                                    <div className="mb-6">
                                        <p className="font-semibold">Price:</p>
                                        <p className="text-gray-700">{workshop.priceInfo}</p>
                                        <p className="text-sm text-gray-500 mt-1">Includes workshop materials and code samples</p>
                                    </div>

                                    <a
                                        href="https://ti.to/zurichjs/nextjs-react-performance-workshop"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full bg-yellow-400 text-black py-3 px-4 rounded-lg font-bold text-center hover:bg-yellow-300 transition-colors"
                                        onClick={() => {
                                            track('workshop_registration_clicked', {
                                                workshop_id: workshop.id,
                                                workshop_title: workshop.title
                                            });
                                        }}
                                    >
                                        Register Now
                                    </a>

                                    <p className="text-sm text-gray-500 mt-2 text-center">
                                        Workshop ticket is sold separately from conference tickets
                                    </p>
                                </motion.div>

                                {/* Workshop Format */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                    className="bg-white p-6 rounded-lg shadow-md mb-6"
                                >
                                    <h3 className="text-xl font-bold mb-3 flex items-center">
                                        <LayoutTemplate className="mr-2 text-yellow-500" size={20} />
                                        Workshop Format
                                    </h3>
                                    
                                    <p className="mb-4">
                                        This compact, focused workshop is designed to deliver maximum value in a condensed timeframe. The session is structured to be intensive and hands-on, allowing you to immediately apply what you learn.
                                    </p>
                                    
                                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                        <li>Concentrated learning experience without unnecessary breaks</li>
                                        <li>Practical exercises that mirror real-world scenarios</li>
                                        <li>Take-home resources for continued learning</li>
                                        <li>Small group size for personalized attention</li>
                                    </ul>
                                </motion.div>

                                {/* Speaker Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                    className="bg-white p-6 rounded-lg shadow-md mb-6"
                                >
                                    <h3 className="text-xl font-bold mb-3">Workshop Instructor</h3>

                                    <div className="flex items-start">
                                        <div className="relative w-24 h-24 rounded-lg overflow-hidden mr-4">
                                            <Image
                                                src={workshop.speaker.image}
                                                alt={workshop.speaker.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">{workshop.speaker.name}</h4>
                                            <p className="text-gray-600 mb-2">Staff Frontend Engineer & Engineering Manager</p>

                                            <div className="flex space-x-2">
                                                {workshop.speaker.twitter && (
                                                    <a
                                                        href={workshop.speaker.twitter}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:text-blue-600"
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
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                                        </svg>
                                                    </a>
                                                )}
                                                <a
                                                    href="https://faziz-dev.com"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-700 hover:text-black"
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

                                    <div className="mt-4">
                                        <p className="text-sm text-gray-700">
                                            Faris comes from a boot camp and self-taught background, having contributed to open-source projects in his spare time. His passion for technology extends beyond coding; he loves consulting on web projects and aiding start-ups with technical strategy. He has grown his expertise in web architectures and frontend codebases.
                                        </p>
                                        <p className="text-sm text-gray-700 mt-2">
                                            Having worked in many industries, including Connected TV, Fintech, Digital Asset Management, SaaS, and Fitness, Faris has found his niche in start-ups. Some of his previous work has revolved around building large-scale full-stack solutions for notable companies like Fiit, Discovery, GCN, Eurosport, Navro (formerly Paytrix) and SmallPDF, serving millions of users globally.
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Workshop Details */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="bg-white p-6 rounded-lg shadow-md mb-6"
                                >
                                    <h3 className="text-xl font-bold mb-3">Workshop Details</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="font-semibold text-gray-700">Format:</p>
                                            <p>Foundations workshop (1.5-2.5 hours)</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold text-gray-700">Language:</p>
                                            <p>English</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold text-gray-700">What to bring:</p>
                                            <p>Laptop with Node.js installed (latest LTS version)</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold text-gray-700">Experience level:</p>
                                            <p>Intermediate</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold text-gray-700">Materials:</p>
                                            <p>Workshop slides, detailed notes, and code samples will be provided</p>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* FAQ */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="bg-white p-6 rounded-lg shadow-md"
                                >
                                    <h3 className="text-xl font-bold mb-3">FAQs</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="font-semibold">Is this workshop suitable for beginners?</p>
                                            <p className="text-gray-700">This workshop is designed for developers with intermediate JavaScript knowledge and some experience with React. If you&apos;re a complete beginner, we recommend gaining some basic React experience first.</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold">Do I need to bring my own laptop?</p>
                                            <p className="text-gray-700">Yes, please bring a laptop with the latest LTS version of Node.js installed to participate in the hands-on coding labs.</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold">Is lunch provided?</p>
                                            <p className="text-gray-700">No, this is a compact 1.5-2.5 hour workshop. Light refreshments may be available depending on the venue.</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold">Will there be recordings available?</p>
                                            <p className="text-gray-700">This is a hands-on workshop, so we recommend attending in person for the best experience. Workshop materials will be provided to all participants.</p>
                                        </div>

                                        <div>
                                            <p className="font-semibold">Is this workshop related to the conference?</p>
                                            <p className="text-gray-700">This is a foundations workshop organized by ZurichJS. The workshop ticket is sold separately from conference tickets.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="py-16 bg-black">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            <h2 className="text-3xl font-bold mb-4 text-yellow-400">Ready to Level Up Your NextJS & React Skills? 🚀</h2>
                            <p className="text-xl mb-8 text-gray-300 max-w-3xl mx-auto">
                                Join us for this workshop and learn practical strategies for building performant and resilient React applications!
                            </p>

                            <div className="flex justify-center">
                                <a
                                    href="#registrationContainer"
                                    className="bg-yellow-400 text-black px-8 py-3 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToRegistration();
                                    }}
                                >
                                    Register Now
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}

export async function getStaticProps() {
    // Fetch the speaker data using the getSpeakerById function
    const speaker = await getSpeakerById('faris-aziz');

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