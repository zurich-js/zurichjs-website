import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, Rocket, Code, Database, Cloud } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import PageLayout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { aiEdgeWorkshopTickets } from '@/components/workshop/aiEdgeWorkshopTickets';
import CancelledCheckout from '@/components/workshop/CancelledCheckout';
import TicketSelection from '@/components/workshop/TicketSelection';
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
    phases: {
        title: string;
        duration: string;
        description: string;
        activities: string[];
        concepts: string[];
    }[];
}

interface WorkshopPageProps {
    speaker: Speaker;
}

// --- Accordion Component ---
function Accordion({ phases }: { phases: WorkshopDetails['phases'] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="divide-y divide-gray-200 rounded-lg shadow-sm bg-white">
      {phases.map((phase, idx) => (
        <div key={idx}>
          <button
            className={`w-full flex justify-between items-center px-5 py-4 text-left focus:outline-none transition-colors ${openIndex === idx ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'}`}
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            aria-expanded={openIndex === idx}
          >
            <span className="font-bold text-lg text-amber-700 flex-1">{`Phase ${idx + 1}: ${phase.title}`}</span>
            <span className="text-xs text-gray-500 ml-4">{phase.duration}</span>
            <span className={`ml-4 transition-transform ${openIndex === idx ? 'rotate-90' : ''}`}>▶</span>
          </button>
          {openIndex === idx && (
            <div className="px-5 pb-5 pt-1 animate-fadeIn">
              <p className="mb-3 text-gray-700">{phase.description}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Activities:</h4>
                  <ul className="space-y-1">
                    {phase.activities.map((activity, actIndex) => (
                      <li key={actIndex} className="flex items-start text-sm">
                        <span className="text-purple-500 mr-2 text-lg">•</span>
                        <span className="text-gray-600">{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Key Concepts:</h4>
                  <ul className="space-y-1">
                    {phase.concepts.map((concept, conIndex) => (
                      <li key={conIndex} className="flex items-start text-sm">
                        <span className="text-amber-500 mr-2 text-lg">•</span>
                        <span className="text-gray-600">{concept}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AIEdgeWorkshopPage({ speaker }: WorkshopPageProps) {
    const [isClient, setIsClient] = useState(false);
    const { track } = useEvents();
    const router = useRouter();
    const { canceled } = router.query;

    // Workshop data
    const workshop: WorkshopDetails = {
        id: "ai-edge-application-workshop-2024",
        title: "Building a Full-Stack AI Application on the Edge",
        subtitle: "Master Cloudflare Workers & AI Integration",
        dateInfo: "September 9, 2025",
        timeInfo: "18:00 - 20:30",
        locationInfo: "Smallpdf AG, Steinstrasse 21, 8003 Zürich",
        price: "80 CHF",
        description: "Ready to build lightning-fast AI applications that scale globally? In this hands-on workshop, you'll master the Cloudflare Developer Platform by building a complete full-stack AI application from scratch. You'll start with the fundamentals of Cloudflare Workers and progressively add AI capabilities, databases, object storage, and a modern React frontend. By the end, you'll have deployed a production-ready AI application running on Cloudflare's global edge network.",
        maxAttendees: 20,
        speaker: speaker,
        topics: [
            {
                title: "Cloudflare Workers & Edge Computing",
                description: "Master serverless functions at the edge with global deployment and V8 runtime environment.",
                icon: <Cloud className="text-blue-500" size={24} />
            },
            {
                title: "AI Integration & Workers AI",
                description: "Integrate AI capabilities using Workers AI with model selection and prompt engineering.",
                icon: <Rocket className="text-purple-500" size={24} />
            },
            {
                title: "Data & Storage Solutions",
                description: "Implement D1 databases and R2 object storage for complete data persistence.",
                icon: <Database className="text-green-500" size={24} />
            },
            {
                title: "Modern Frontend with React",
                description: "Build interactive UIs with React and Cloudflare Vite plugin for seamless deployment.",
                icon: <Code className="text-orange-500" size={24} />
            }
        ],
        takeaways: [
            "Deep understanding of Cloudflare Workers and the Cloudflare Developer Platform",
            "Ability to build and deploy Cloudflare Workers from scratch",
            "Skills to integrate AI capabilities using Workers AI with various models",
            "Knowledge of implementing data persistence with D1 database operations",
            "Experience handling file storage with R2 object storage",
            "Competence in creating modern frontends with React and Cloudflare Vite plugin",
            "Complete full-stack application deployed on Cloudflare's global network"
        ],
        targetAudience: [
            "Full-stack Developers interested in edge computing",
            "Frontend Developers exploring AI integration",
            "Backend Developers learning modern serverless platforms",
            "DevOps Engineers working with global deployment"
        ],
        prerequisites: [
            "Basic JavaScript/TypeScript knowledge",
            "Familiarity with REST APIs and HTTP concepts",
            "Node.js 18+ installed on local machine",
            "Cloudflare account (free tier sufficient)",
            "Code editor and terminal access"
        ],
        phases: [
            {
                title: "Foundation - Understanding Cloudflare Workers",
                duration: "20 minutes",
                description: "Learn the fundamentals of Cloudflare Workers and edge computing",
                activities: [
                    "Overview of Cloudflare Developer Platform",
                    "Create a simple \"Hello World\" Worker",
                    "Understand request/response handling",
                    "Deploy using Wrangler CLI"
                ],
                concepts: [
                    "Serverless at the edge",
                    "V8 runtime environment",
                    "Global deployment model"
                ]
            },
            {
                title: "Adding Intelligence - AI Capabilities",
                duration: "25 minutes",
                description: "Integrate AI capabilities with Workers AI",
                activities: [
                    "Add Workers AI binding to configuration",
                    "Create AI-powered API endpoint",
                    "Process user input with AI models",
                    "Handle AI responses and errors"
                ],
                concepts: [
                    "AI model selection",
                    "Prompt engineering basics",
                    "Binding configuration",
                    "Asynchronous AI processing"
                ]
            },
            {
                title: "Framework Enhancement - Building Better APIs",
                duration: "20 minutes",
                description: "Improve code organization with Hono framework",
                activities: [
                    "Install and configure Hono framework",
                    "Refactor existing endpoints to Hono",
                    "Add middleware for logging and validation",
                    "Create additional API routes"
                ],
                concepts: [
                    "Framework benefits vs vanilla Workers",
                    "Middleware patterns",
                    "Route organization",
                    "Type safety improvements"
                ]
            },
            {
                title: "Data Persistence - D1 Database",
                duration: "30 minutes",
                description: "Store and manage data with SQL databases at the edge",
                activities: [
                    "Create and configure D1 database",
                    "Design application data schema",
                    "Implement CRUD operations",
                    "Add data validation and error handling"
                ],
                concepts: [
                    "Edge-compatible SQL databases",
                    "Prepared statements",
                    "Database migrations",
                    "Data modeling"
                ]
            },
            {
                title: "File Storage - R2 Object Storage",
                duration: "25 minutes",
                description: "Handle file uploads and storage with R2",
                activities: [
                    "Create and configure R2 bucket",
                    "Implement file upload endpoints",
                    "Implement file fetching endpoints",
                    "Secure file handling patterns"
                ],
                concepts: [
                    "Object storage vs traditional file systems",
                    "Upload security patterns",
                    "File metadata handling"
                ]
            },
            {
                title: "Basic Frontend - Serving Static Assets",
                duration: "20 minutes",
                description: "Create a basic user interface for the application",
                activities: [
                    "Configure static assets directory",
                    "Create HTML interface for the application",
                    "Add basic styling and interactivity",
                    "Test full application flow"
                ],
                concepts: [
                    "Static asset routing",
                    "Client-server communication",
                    "Basic UI patterns"
                ]
            },
            {
                title: "Modern Frontend - React and Vite",
                duration: "30 minutes",
                description: "Build a complete React application with modern tooling",
                activities: [
                    "Install and configure Cloudflare Vite plugin",
                    "Create React components for the application",
                    "Implement state management",
                    "Build and deploy the complete application"
                ],
                concepts: [
                    "Modern build tools",
                    "Component-based architecture",
                    "State management patterns",
                    "Development vs production builds"
                ]
            }
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

        // Add custom CSS for highlight effect
        if (typeof window !== 'undefined') {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse-highlight {
                  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
                  70% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
                }
                .highlight-pulse {
                  animation: pulse-highlight 1.5s ease-in-out;
                }
                /* Fix for mobile overflow */
                body, html {
                  overflow-x: hidden;
                  max-width: 100%;
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
            const registrationContainer = document.getElementById('registrationContainer');
            if (registrationContainer) {
                registrationContainer.classList.add('highlight-pulse');
                setTimeout(() => {
                    registrationContainer.classList.remove('highlight-pulse');
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="order-2 md:order-1">
                    <div className="bg-black text-js inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-bold mb-4">
                      🤖 AI & Edge Computing
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-3 text-black leading-tight drop-shadow-sm">
                      {workshop.title}
                    </h1>
                    <h2 className="text-xl md:text-2xl mb-5 text-gray-800 font-medium">
                      {workshop.subtitle}
                    </h2>
                    <div className="flex flex-wrap gap-3 mb-6">
                      <div className="flex items-center bg-white shadow px-3 py-2 rounded-lg text-sm">
                        <Calendar size={18} className="mr-2 text-amber-600"/>
                        <span>{workshop.dateInfo}</span>
                      </div>
                      <div className="flex items-center bg-white shadow px-3 py-2 rounded-lg text-sm">
                        <Clock size={18} className="mr-2 text-amber-600"/>
                        <span>{workshop.timeInfo}</span>
                      </div>
                      <div className="flex items-center bg-white shadow px-3 py-2 rounded-lg text-sm">
                        <MapPin size={18} className="mr-2 text-amber-600"/>
                        <span>{workshop.locationInfo}</span>
                      </div>
                      <div className="flex items-center bg-white shadow px-3 py-2 rounded-lg text-sm">
                        <Users size={18} className="mr-2 text-amber-600"/>
                        <span>Max {workshop.maxAttendees}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mb-6">
                      {isClient && (
                        <Button
                          onClick={shareWorkshop}
                          variant="outline"
                          className="border-black text-black hover:bg-black hover:text-js text-sm py-2"
                        >
                          <Share2 size={16} className="mr-1.5"/>
                          Share workshop
                        </Button>
                      )}
                      <Button
                        onClick={scrollToRegistration}
                        className="bg-black text-js hover:bg-gray-800 text-sm py-2"
                      >
                        Get Your Ticket
                      </Button>
                    </div>
                    {/* Mini Speaker Card for mobile - now below hero content */}
                    <div className="block sm:hidden mt-8">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-1">Meet your instructor</h3>
                      <Link
                        href={`/speakers/${workshop.speaker.id}`}
                        className="flex items-center gap-3 bg-white/80 rounded-xl shadow p-2 border border-amber-100 w-full max-w-xs mx-auto"
                      >
                        <div className="flex-shrink-0">
                          <div className="bg-gradient-to-tr from-amber-400 via-orange-300 to-blue-300 rounded-full w-14 h-14 flex items-center justify-center shadow">
                            <Image
                              src={`${workshop.speaker.image}?h=120`}
                              alt={workshop.speaker.name}
                              width={56}
                              height={56}
                              className="rounded-full border-2 border-white shadow object-cover object-center w-12 h-12"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-base text-black leading-tight truncate">{workshop.speaker.name}</div>
                          <div className="text-xs text-blue-900 truncate">{workshop.speaker.title}</div>
                          <div className="mt-1">
                            <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-semibold mr-1">Cloudflare</span>
                            <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-semibold">AI</span>
                          </div>
                          <span className="inline-block mt-2 text-xs text-blue-700 underline font-semibold">View Profile</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                  {/* Full Speaker Card for desktop */}
                  <div className="hidden sm:flex justify-center w-full">
                    <div className="relative bg-gradient-to-br from-amber-50 via-white to-blue-50 rounded-2xl shadow-2xl px-4 py-6 w-full max-w-2xl flex flex-row items-center border-0 gap-4 sm:gap-8">
                      <div className="flex-shrink-0 flex items-center justify-center h-36 w-36 mb-4 sm:mb-0">
                        <div className="bg-gradient-to-tr from-amber-400 via-orange-300 to-blue-300 rounded-full w-32 h-32 flex items-center justify-center shadow-xl">
                          <Image
                            src={`${workshop.speaker.image}?h=400`}
                            alt={workshop.speaker.name}
                            width={128}
                            height={128}
                            className="rounded-full border-4 border-white shadow-2xl object-cover object-center w-28 h-28"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pl-0 sm:pl-2 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
                        <h3 className="font-extrabold text-xl sm:text-2xl md:text-3xl text-black mb-1 leading-tight truncate w-full">{workshop.speaker.name}</h3>
                        <p className="text-base sm:text-lg md:text-xl text-blue-900 mb-2 font-medium leading-snug truncate w-full">{workshop.speaker.title}</p>
                        <div className="flex flex-wrap gap-2 mb-3 justify-center sm:justify-start">
                          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">Cloudflare Expert</span>
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">AI Integration</span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">Edge Computing</span>
                        </div>
                        <div className="bg-white/80 p-3 rounded-xl border border-amber-100 mb-2 w-full">
                          <h4 className="font-bold text-xs mb-1 text-amber-800 tracking-wide">EXPERTISE</h4>
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <span className="bg-amber-50 text-gray-700 px-2 py-1 rounded text-xs font-medium">Cloudflare Workers</span>
                            <span className="bg-blue-50 text-gray-700 px-2 py-1 rounded text-xs font-medium">AI/ML</span>
                            <span className="bg-purple-50 text-gray-700 px-2 py-1 rounded text-xs font-medium">Edge Computing</span>
                            <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded text-xs font-medium">Full-Stack Development</span>
                          </div>
                        </div>
                        {workshop.speaker.bio && (
                          <blockquote className="mt-2 text-gray-700 text-sm sm:text-base md:text-lg italic border-l-4 border-amber-300 pl-4 pr-2 py-1 bg-amber-50/60 rounded-xl w-full">
                            “{workshop.speaker.bio}”
                          </blockquote>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            </Section>

            {/* Workshop Details */}
            <Section>
                {/* Workshop Overview */}
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
                    <p className="text-gray-800 leading-relaxed text-base sm:text-lg mb-4">
                        {workshop.description}
                    </p>
                    <div className="bg-amber-50 border-l-4 border-js p-4 rounded-lg">
                        <p className="text-gray-800 mb-3">
                            <strong className="text-amber-700">What you&apos;ll build:</strong> A complete AI-powered application with data persistence, file storage, and an interactive frontend running on Cloudflare&apos;s global edge network.
                        </p>
                        <p className="text-gray-700 text-sm">
                            <strong className="text-amber-700">Workshop includes:</strong> 2.5 hours of hands-on learning with a 20-minute break, refreshments and snacks provided throughout the session.
                        </p>
                    </div>
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
                                <div className="h-1 w-6 sm:w-10 bg-amber-600 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Key Technologies</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                                {workshop.topics.map((topic, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{opacity: 0, y: 20}}
                                        whileInView={{opacity: 1, y: 0}}
                                        viewport={{once: true}}
                                        transition={{duration: 0.5, delay: 0.1 * (index + 1)}}
                                        className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center mb-3">
                                            <div className="bg-amber-100 p-2 rounded-full">
                                                {topic.icon}
                                            </div>
                                            <h3 className="text-lg font-bold ml-3 text-gray-800">
                                                {topic.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed text-base">
                                            {topic.description}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Workshop Structure (Accordion) */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true}}
                            transition={{duration: 0.5}}
                            className="mb-8 sm:mb-12"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-purple-600 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">Workshop Structure</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            <Accordion phases={workshop.phases} />
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
                                    <span className="text-blue-600 font-bold">Perfect for:</span> Developers ready to dive deep into edge computing and AI integration with hands-on experience.
                                </p>
                            </div>
                        </motion.div>

                        {/* Prerequisites & Requirements */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="mb-8 sm:mb-12 bg-white p-4 sm:p-8 rounded-lg shadow-md border-t-4 border-purple-500"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-purple-500 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Prerequisites & Requirements</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-3">Software Prerequisites:</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {workshop.prerequisites.map((prerequisite, index) => (
                                        <div key={index} className="flex items-start">
                                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 mr-3">
                                                <span className="text-purple-700 font-bold text-sm">{index + 1}</span>
                                            </div>
                                            <p className="text-gray-700">{prerequisite}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-3">Hardware Requirements:</h3>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <ul className="space-y-2">
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700">Laptop with reliable internet connection</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700">At least 8GB RAM recommended</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="text-purple-500 mr-2 text-lg">•</span>
                                            <span className="text-gray-700">Admin access to install software</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="mt-6 bg-purple-50 border-l-4 border-purple-400 p-4 rounded-lg">
                                <p className="text-sm sm:text-base font-medium text-gray-800">
                                    <span className="text-purple-600 font-bold">Note:</span> We&apos;ll provide step-by-step guidance for all Cloudflare setup during the workshop. Free tier accounts are sufficient for all exercises.
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
                                    <span className="font-semibold text-gray-800 text-base">Duration:</span>
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
                                        Includes complete codebase, deployment guides, refreshments & snacks, and community access
                                    </p>
                                </div>
                            </div>

                            {canceled === 'true' ? (
                                <CancelledCheckout 
                                    workshopId="ai-edge-application"
                                    workshopTitle={workshop.title}
                                />
                            ) : (
                                <>
                                    <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-lg mb-4">
                                        <p className="font-medium text-gray-800">
                                            This focused workshop is limited to {workshop.maxAttendees} participants for optimal hands-on learning.
                                        </p>
                                        <p className="text-xs text-gray-700 mt-1">
                                            <strong>Pro tip:</strong> Sign up for a ZurichJS account to get a 20% community discount, or use a coupon code by adding <code>?coupon=YOUR_CODE</code> to the URL.
                                        </p>
                                    </div>

                                    <p className="mb-4 font-medium text-base">
                                        Build a complete AI-powered application from scratch using Cloudflare&apos;s cutting-edge developer platform and AI capabilities.
                                    </p>

                                    {/* Stripe Checkout */}
                                    {isClient && <TicketSelection
                                        options={aiEdgeWorkshopTickets}
                                        className="max-w-2xl mx-auto"
                                        workshopId="ai-edge-application"
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
                    <div className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 p-1 rounded-lg sm:rounded-xl mb-5 sm:mb-8">
                        <div className="bg-black rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
                            <p className="text-white text-sm sm:text-base font-bold">🤖 AI + Edge Computing • {workshop.timeInfo} • Limited to {workshop.maxAttendees} participants</p>
                        </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-5 text-js">Build Production-Ready AI Apps on the Edge! 🚀</h2>
                    <p className="text-base sm:text-lg md:text-xl mb-5 sm:mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Master Cloudflare Workers, AI integration, databases, and React to build lightning-fast AI applications 
                        that scale globally. From zero to production in 2.5 focused hours!
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-5">
                        <button
                            onClick={scrollToRegistration}
                            className="bg-js text-black px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-yellow-300 transition-colors w-full sm:w-auto"
                        >
                            Get Your Ticket (80 CHF)
                        </button>
                        <button
                            onClick={shareWorkshop}
                            className="bg-gray-800 text-white px-4 sm:px-8 py-2.5 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-gray-700 transition-colors w-full sm:w-auto mt-3 sm:mt-0"
                        >
                            <Share2 size={18} className="inline mr-2"/> 
                            Share with Your Team
                        </button>
                        <a
                            href="https://join.slack.com/t/zurichjs/shared_invite/zt-35xc7fswg-NswAFDUErn1XoUF8ixH6fg"
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
                            Learn to build and deploy complete AI applications on Cloudflare&apos;s global edge network with modern tools and best practices.
                        </p>
                        <p className="text-js font-bold mt-2 text-base">Register now for September 9th!</p>
                    </div>
                </motion.div>
            </Section>
        </PageLayout>
    );
}

export async function getStaticProps() {
    // Fetch the speaker data using the getSpeakerById function
    const speaker = await getSpeakerById('speaker-c6fff8ee-97c5-4db1-8d6c-fb90ad1376e9');

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