import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, Code, MessageSquare, BookOpen, LayoutTemplate } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
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
        id: "react-performance",
        title: "Unleashing NextJS/React Performance & Resiliency",
        subtitle: "A Practical & Pragmatic Workshop for Developers",
        dateInfo: "TBD",
        timeInfo: "Duration: 3 hours",
        locationInfo: "TBD",
        description: "Getting pragmatic with building performant and resilient React applications. This workshop will delve into React and NextJs to create scalable, high-performance web applications made for the real world, exploring architectural patterns, rendering techniques, and optimization strategies. We'll tackle data fetching management, performance measurement, and state management, offering tools and insights for efficient coding and stakeholder communication. Practical exercises and real-world examples will equip developers with the skills to build and maintain solid web solutions, additionally, emphasizing the importance of observability and monitoring post-deployment.",
        priceInfo: "CHF 150 per person",
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
        track('workshop_waitlist_button_clicked', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });

        const registrationElement = document.getElementById('getWaitlistContainer');
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
                    image: `/api/og/workshop?title=${encodeURIComponent(workshop.title)}&subtitle=${encodeURIComponent(workshop.subtitle)}&speakerName=${encodeURIComponent(workshop.speaker.name)}&speakerImage=${encodeURIComponent(workshop.speaker.image)}&workshopId=${encodeURIComponent(workshop.id)}`,
                    url: `/workshops/${workshop.id}`
                }}
            />

            {/* Hero Section */}
            <Section variant="gradient" padding="lg" className="mt-2 sm:mt-3">
                <div className="mb-4">
                    <Link href="/workshops" className="inline-flex items-center text-black hover:underline">
                        <ChevronLeft size={16} className="mr-1"/>
                        Back to all workshops
                    </Link>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <motion.div
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.5}}
                        className="lg:w-1/2"
                    >
                        <div className="bg-black text-js inline-block px-3 py-1 rounded-full text-sm font-bold mb-4">
                            🚀 Premium Workshop
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold mb-3 text-black leading-tight">
                            {workshop.title}
                        </h1>
                        <h2 className="text-xl md:text-2xl mb-5 text-gray-800 font-medium">
                            {workshop.subtitle}
                        </h2>

                        <div className="flex flex-wrap gap-4 mb-6">
                            <div className="flex items-center bg-white shadow-sm px-4 py-2 rounded-lg text-sm">
                                <Calendar size={18} className="mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Date</p>
                                    <p>{workshop.dateInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-4 py-2 rounded-lg text-sm">
                                <Clock size={18} className="mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Duration</p>
                                    <p>{workshop.timeInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-4 py-2 rounded-lg text-sm">
                                <MapPin size={18} className="mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Location</p>
                                    <p>{workshop.locationInfo}</p>
                                </div>
                            </div>
                            <div className="flex items-center bg-white shadow-sm px-4 py-2 rounded-lg text-sm">
                                <Users size={18} className="mr-2 text-purple-600"/>
                                <div>
                                    <p className="font-semibold">Capacity</p>
                                    <p>Limited to {workshop.maxAttendees} attendees</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white bg-opacity-80 p-5 rounded-lg shadow-sm mb-6">
                            <h3 className="text-lg font-bold mb-2 text-black">Workshop Overview</h3>
                            <p className="text-gray-800 leading-relaxed">
                                {workshop.description}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {isClient && (
                                <Button
                                    onClick={shareWorkshop}
                                    variant="outline"
                                    className="border-black text-black hover:bg-black hover:text-js"
                                >
                                    <Share2 size={16} className="mr-1.5"/>
                                    {copySuccess ? 'Link copied! 👍' : 'Share workshop'}
                                </Button>
                            )}
                            <Button
                                onClick={scrollToRegistration}
                                className="bg-black text-js hover:bg-gray-800"
                            >
                                Register Now
                            </Button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{opacity: 0, scale: 0.95}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{duration: 0.5, delay: 0.2}}
                        className="lg:w-1/3 lg:ml-auto"
                    >
                        <div className="sticky top-24 rounded-xl overflow-hidden shadow-xl bg-white p-6 border-l-4 border-purple-600">
                            <div className="absolute -right-8 -top-8 bg-js rounded-full w-24 h-24 opacity-30"></div>
                            <h3 className="text-xl font-bold mb-4 text-black relative">Workshop at a Glance</h3>

                            <div className="space-y-5">
                                <div className="flex items-start relative z-10">
                                    <div className="bg-js p-2 rounded-full mr-3 shadow-md">
                                        <Clock size={20} className="text-black"/>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg">2-Hour Intensive Session</h4>
                                        <p className="text-gray-600">Concentrated learning with maximum value</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="bg-js p-2 rounded-full mr-3 shadow-md">
                                        <Code size={20} className="text-black"/>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg">Hands-on Coding Labs</h4>
                                        <p className="text-gray-600">Practical exercises with real-world examples</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="bg-js p-2 rounded-full mr-3 shadow-md">
                                        <BookOpen size={20} className="text-black"/>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg">Take-Home Resources</h4>
                                        <p className="text-gray-600">Comprehensive materials for continued learning</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-gray-200">
                                <div className="flex items-center mb-3">
                                    <Image
                                        src={`${workshop.speaker.image}?h=300`}
                                        alt={workshop.speaker.name}
                                        width={48}
                                        height={48}
                                        className="rounded-full mr-3 border-2 border-purple-100"
                                    />
                                    <div>
                                        <p className="font-bold text-lg">{workshop.speaker.name}</p>
                                        <p className="text-sm text-gray-600">Staff Frontend Engineer & Engineering Manager</p>
                                    </div>
                                </div>
                                <p className="text-sm italic text-gray-600 bg-purple-50 p-3 rounded-lg">&quot;Join me to explore practical strategies for building performant and
                                    resilient React applications that stand up to real-world challenges.&quot;</p>

                                <div className="mt-5 bg-gray-50 p-4 rounded-lg">
                                    <p className="font-bold text-purple-600">{workshop.priceInfo}</p>
                                    <p className="text-sm text-gray-500">Limited spots available</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </Section>

            {/* Workshop Details */}
            <Section>
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Main Content */}
                    <div className="lg:w-2/3">
                        {/* Workshop Topics */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true}}
                            transition={{duration: 0.5}}
                            className="mb-12"
                        >
                            <div className="flex items-center mb-6">
                                <div className="h-1 w-10 bg-purple-600 mr-3"></div>
                                <h2 className="text-3xl font-bold text-black">Topics We&apos;ll Cover</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.1}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-yellow-100 p-2 rounded-full">
                                            <Code className="text-yellow-700" size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Web Performance Pitfalls
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        Identify common performance issues and learn when to optimize and when it might be over-engineering. We&apos;ll explore practical examples of:
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2">•</span>
                                            <span className="text-gray-700">Detecting and fixing render bottlenecks</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2">•</span>
                                            <span className="text-gray-700">Real-world tradeoffs between performance and DX</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-yellow-500 mr-2">•</span>
                                            <span className="text-gray-700">Balancing optimizations with development time</span>
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
                                            <LayoutTemplate className="text-blue-700" size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Software Resilience Patterns
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        Explore strategies to build applications that can handle unexpected issues gracefully. Learn about:
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            <span className="text-gray-700">Error boundaries and fallback UIs</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            <span className="text-gray-700">Strategic loading states and skeletons</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            <span className="text-gray-700">Circuit breakers for API dependencies</span>
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
                                            <MessageSquare className="text-green-700" size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            React Reconciliation Deep Dive
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        Understand how React updates the DOM and optimize your components for better rendering performance:
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700">How the React diffing algorithm works</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700">Memoization strategies (useMemo, useCallback)</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-green-500 mr-2">•</span>
                                            <span className="text-gray-700">Server Components vs. Client Components</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.4}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-red-100 p-2 rounded-full">
                                            <Code className="text-red-700" size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Component Architecture
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        Learn best practices for structuring your components for maintainability and performance:
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-red-500 mr-2">•</span>
                                            <span className="text-gray-700">Atomic design principles for React applications</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-red-500 mr-2">•</span>
                                            <span className="text-gray-700">Composable and reusable component patterns</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-red-500 mr-2">•</span>
                                            <span className="text-gray-700">Optimizing component tree structure</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.5}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-purple-100 p-2 rounded-full">
                                            <BookOpen className="text-purple-700" size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Data Fetching at Scale
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        Explore efficient data fetching strategies using React Query for large-scale applications:
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2">•</span>
                                            <span className="text-gray-700">Caching strategies and invalidation</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2">•</span>
                                            <span className="text-gray-700">Optimistic updates and mutations</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2">•</span>
                                            <span className="text-gray-700">Prefetching and parallel queries</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                <motion.div
                                    initial={{opacity: 0, y: 20}}
                                    whileInView={{opacity: 1, y: 0}}
                                    viewport={{once: true}}
                                    transition={{duration: 0.5, delay: 0.6}}
                                    className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-indigo-500 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center mb-3">
                                        <div className="bg-indigo-100 p-2 rounded-full">
                                            <Code className="text-indigo-700" size={20} />
                                        </div>
                                        <h3 className="text-xl font-bold ml-3 text-gray-800">
                                            Observability & Feature Flags
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">
                                        Learn how to monitor your application&apos;s health and implement feature flags for safer deployments:
                                    </p>
                                    <ul className="mt-2 space-y-1">
                                        <li className="flex items-start">
                                            <span className="text-indigo-500 mr-2">•</span>
                                            <span className="text-gray-700">Setting up client-side monitoring</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-indigo-500 mr-2">•</span>
                                            <span className="text-gray-700">Implementing feature flags in React/Next.js</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-indigo-500 mr-2">•</span>
                                            <span className="text-gray-700">Analyzing performance metrics post-deployment</span>
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
                            className="mb-12 bg-white p-8 rounded-lg shadow-md border-t-4 border-js"
                        >
                            <div className="flex items-center mb-6">
                                <div className="h-1 w-10 bg-js mr-3"></div>
                                <h2 className="text-2xl font-bold text-black">What You&apos;ll Take Away</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                {workshop.takeaways.map((takeaway, index) => (
                                    <div key={index} className="flex items-start bg-gray-50 p-4 rounded-lg">
                                        <div className="bg-js h-6 w-6 rounded-full flex items-center justify-center text-black font-bold mr-3 flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-800">{takeaway}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 bg-yellow-50 border-l-4 border-js p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-800">
                                    <span className="text-yellow-600 font-bold">Note:</span> All participants will receive the full workshop materials including code samples, slides, and cheatsheets to review at their own pace after the session.
                                </p>
                            </div>
                        </motion.div>

                        {/* Who Should Attend */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mb-12 bg-white p-8 rounded-lg shadow-md border-t-4 border-purple-500"
                        >
                            <div className="flex items-center mb-6">
                                <div className="h-1 w-10 bg-purple-500 mr-3"></div>
                                <h2 className="text-2xl font-bold text-black">Who Should Attend</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                {workshop.targetAudience.map((audience, index) => (
                                    <div key={index} className="bg-purple-50 rounded-lg p-5 text-center">
                                        <Users className="mx-auto mb-3 text-purple-600" size={24} />
                                        <p className="font-medium text-gray-800">{audience}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-800">
                                    <span className="text-purple-600 font-bold">Perfect for:</span> Teams looking to implement real-world performance optimization strategies without over-engineering their solutions.
                                </p>
                            </div>
                        </motion.div>

                        {/* Prerequisites */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="mb-12 bg-white p-8 rounded-lg shadow-md border-t-4 border-blue-500"
                        >
                            <div className="flex items-center mb-6">
                                <div className="h-1 w-10 bg-blue-500 mr-3"></div>
                                <h2 className="text-2xl font-bold text-black">Workshop Requirements</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                            </div>

                            <div className="space-y-4">
                                {workshop.prerequisites.map((prerequisite, index) => (
                                    <div key={index} className="flex items-center bg-blue-50 p-4 rounded-lg">
                                        {index === 0 && <Code className="text-blue-600 mr-3 flex-shrink-0" size={20} />}
                                        {index === 1 && <MessageSquare className="text-blue-600 mr-3 flex-shrink-0" size={20} />}
                                        {index === 2 && <LayoutTemplate className="text-blue-600 mr-3 flex-shrink-0" size={20} />}
                                        {index === 3 && <BookOpen className="text-blue-600 mr-3 flex-shrink-0" size={20} />}
                                        <p className="text-gray-800">{prerequisite}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                                <p className="text-sm font-medium text-gray-800">
                                    <span className="text-blue-600 font-bold">Pro tip:</span> For the best experience, we recommend reviewing the React docs on hooks and performance optimization before the workshop.
                                </p>
                            </div>
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
                            className="bg-white p-6 rounded-lg shadow-lg mb-8 border-t-4 border-js"
                        >
                            <div className="absolute -right-3 -top-3 bg-js text-black text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                Limited Spots!
                            </div>

                            <h3 className="text-xl font-bold mb-4 flex items-center text-black">
                                <Users className="mr-2 text-js" size={22} />
                                Secure Your Spot
                            </h3>

                            <div className="bg-gray-50 p-4 rounded-lg mb-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800">Workshop Price:</span>
                                    <span className="text-black font-bold text-lg">{workshop.priceInfo}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800">Date:</span>
                                    <span className="text-black">{workshop.dateInfo}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800">Duration:</span>
                                    <span className="text-black">{workshop.timeInfo}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-800">Availability:</span>
                                    <span className="text-black">Only {workshop.maxAttendees} spots</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm text-gray-600">
                                        Includes workshop materials, code samples, and certificate of completion
                                    </p>
                                </div>
                            </div>

                            <p className="mb-4 font-medium">
                                Join our exclusive workshop for practical React performance techniques you can apply immediately to your projects.
                            </p>

                            {/* GetWaitlist KitComponent */}
                            <div
                                id="getWaitlistContainer"
                                data-waitlist_id="26499"
                                data-widget_type="WIDGET_1"
                                className="transition-all duration-300"
                            ></div>

                            <p className="text-sm text-gray-500 mt-3 text-center">
                                Workshop ticket is sold separately from conference tickets
                            </p>
                        </motion.div>

                        {/* Workshop Format */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-purple-500"
                        >
                            <h3 className="text-xl font-bold mb-4 flex items-center text-black">
                                <LayoutTemplate className="mr-2 text-purple-600" size={20} />
                                Workshop Structure
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                        <span className="font-bold text-purple-700">1</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Introduction & Concepts (30 min)</h4>
                                        <p className="text-gray-600 text-sm">Core performance principles and React&apos;s rendering mechanisms</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                        <span className="font-bold text-purple-700">2</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Hands-on Coding Labs (60 min)</h4>
                                        <p className="text-gray-600 text-sm">Interactive exercises on real-world performance scenarios</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                        <span className="font-bold text-purple-700">3</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Advanced Techniques (20 min)</h4>
                                        <p className="text-gray-600 text-sm">Exploring resilience patterns and monitoring strategies</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                        <span className="font-bold text-purple-700">4</span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Q&A and Resources (10 min)</h4>
                                        <p className="text-gray-600 text-sm">Address specific questions and provide additional resources</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 bg-purple-50 p-3 rounded-md">
                                <p className="text-sm text-gray-700 font-medium">
                                    This focused 2-hour format ensures maximum learning with minimal time investment.
                                </p>
                            </div>
                        </motion.div>

                        {/* Speaker Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-white p-6 rounded-lg shadow-md mb-8 border-l-4 border-indigo-500"
                        >
                            <h3 className="text-xl font-bold mb-4 text-black">Your Instructor</h3>

                            <div className="flex items-start">
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden mr-4 border-2 border-indigo-100">
                                    <Image
                                        src={workshop.speaker.image}
                                        alt={workshop.speaker.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-indigo-900">{workshop.speaker.name}</h4>
                                    <p className="text-gray-600 mb-2">Staff Frontend Engineer & Engineering Manager</p>

                                    <div className="flex space-x-2">
                                        {workshop.speaker.twitter && (
                                            <a
                                                href={workshop.speaker.twitter}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                                aria-label="Twitter profile"
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
                                                className="text-gray-800 hover:text-black transition-colors"
                                                aria-label="GitHub profile"
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
                                                className="text-blue-700 hover:text-blue-900 transition-colors"
                                                aria-label="LinkedIn profile"
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
                                            className="text-gray-700 hover:text-black transition-colors"
                                            aria-label="Personal website"
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
                                <div className="bg-indigo-50 p-4 rounded-lg mb-3">
                                    <p className="text-sm text-gray-800">
                                        <span className="font-bold text-indigo-700">Areas of Expertise:</span> React Performance, Frontend Architecture, Engineering Management, Scale & Resilience
                                    </p>
                                </div>
                                <p className="text-sm text-gray-700">
                                    Faris comes from a boot camp and self-taught background, having contributed to open-source projects in his spare time. His passion for technology extends beyond coding; he loves consulting on web projects and aiding start-ups with technical strategy.
                                </p>
                                <p className="text-sm text-gray-700 mt-2">
                                    Having worked in many industries, including Connected TV, Fintech, Digital Asset Management, SaaS, and Fitness, Faris has found his niche in start-ups. Some of his previous work has revolved around building large-scale full-stack solutions for notable companies like Fiit, Discovery, GCN, Eurosport, Navro (formerly Paytrix) and SmallPDF, serving millions of users globally.
                                </p>
                            </div>
                        </motion.div>

                        {/* FAQ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500"
                        >
                            <h3 className="text-xl font-bold mb-4 text-black">Frequently Asked Questions</h3>

                            <div className="space-y-5">
                                <div className="border-b border-gray-100 pb-3">
                                    <p className="font-bold text-gray-800 mb-2">Is this workshop suitable for beginners?</p>
                                    <p className="text-gray-700">This workshop is designed for developers with intermediate JavaScript knowledge and some experience with React. If you&apos;re a complete beginner, we recommend gaining some basic React experience first.</p>
                                </div>

                                <div className="border-b border-gray-100 pb-3">
                                    <p className="font-bold text-gray-800 mb-2">What should I bring?</p>
                                    <p className="text-gray-700">Please bring a laptop with the latest LTS version of Node.js installed. Before the workshop, we&apos;ll email you setup instructions for the coding exercises.</p>
                                </div>

                                <div className="border-b border-gray-100 pb-3">
                                    <p className="font-bold text-gray-800 mb-2">Will refreshments be provided?</p>
                                    <p className="text-gray-700">Yes, water and light refreshments will be available during the workshop.</p>
                                </div>

                                <div className="border-b border-gray-100 pb-3">
                                    <p className="font-bold text-gray-800 mb-2">Will there be recordings available?</p>
                                    <p className="text-gray-700">This is a hands-on workshop, so we recommend attending in person for the best experience. Workshop materials will be provided to all participants, but the session itself won&apos;t be recorded.</p>
                                </div>

                                <div>
                                    <p className="font-bold text-gray-800 mb-2">Is this workshop related to the conference?</p>
                                    <p className="text-gray-700">This is a foundations workshop organized by ZurichJS. While it complements the conference content, the workshop ticket is sold separately from conference tickets.</p>
                                </div>
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
                    className="text-center py-4"
                >
                    <div className="inline-block bg-gradient-to-r from-purple-500 to-yellow-500 p-1 rounded-xl mb-8">
                        <div className="bg-black rounded-xl px-4 py-2">
                            <p className="text-white text-sm font-bold">June 15, 2024 • 2-hour intensive workshop • Limited to 15 participants</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold mb-5 text-js">Ready to Build Performant React Apps That Scale? 🚀</h2>
                    <p className="text-xl mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Join this exclusive 2-hour workshop to learn pragmatic performance techniques directly
                        applicable to your real-world React and NextJS applications. Limited spots available!
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
                        <a
                            href="#registrationContainer"
                            className="bg-js text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors w-full sm:w-auto"
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToRegistration();
                            }}
                        >
                            Reserve Your Spot Now
                        </a>
                        <button
                            onClick={shareWorkshop}
                            className="bg-gray-800 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-700 transition-colors w-full sm:w-auto"
                        >
                            <Share2 size={18} className="inline mr-2"/>
                            Share with Your Team
                        </button>
                    </div>

                    <div className="mt-8 bg-gray-800 rounded-lg p-4 max-w-xl mx-auto">
                        <p className="text-white text-sm">
                            &quot;This workshop focuses on actionable techniques you can implement immediately in your projects.
                            No fluff, just practical performance strategies that work in production.&quot;
                        </p>
                        <p className="text-js font-bold mt-2">— {workshop.speaker.name}, Workshop Instructor</p>
                    </div>
                </motion.div>
            </Section>
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
