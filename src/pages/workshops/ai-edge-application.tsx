import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, Rocket, Code, Database, Cloud, Timer, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

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

// --- Countdown Component ---
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!isClient) return null;

  return (
    <div className="flex gap-2 sm:gap-4">
      {[{ label: 'Days', value: timeLeft.days }, { label: 'Hours', value: timeLeft.hours }, { label: 'Min', value: timeLeft.minutes }, { label: 'Sec', value: timeLeft.seconds }].map((unit) => (
        <div key={unit.label} className="bg-white/90 backdrop-blur rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-center min-w-[3rem] sm:min-w-[4rem]">
          <div className="font-bold text-lg sm:text-2xl text-gray-900">{unit.value.toString().padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 font-medium">{unit.label}</div>
        </div>
      ))}
    </div>
  );
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

    const [couponCode, setCouponCode] = useState('');
    const [showCouponInput, setShowCouponInput] = useState(false);
    const { track } = useEvents();
    const router = useRouter();
    const { canceled, coupon } = router.query;

    // Workshop data
    const workshop: WorkshopDetails = {
        id: "ai-edge-application",
        title: "Building a Full-Stack AI Application on the Edge",
        subtitle: "Master Cloudflare Workers & AI Integration",
        dateInfo: "September 9, 2025",
        timeInfo: "18:00 - 20:30",
        locationInfo: "Smallpdf AG, Steinstrasse 21, 8003 Zürich",
        price: "95 CHF",
        description: "Ready to build lightning-fast AI applications that scale globally? In this hands-on workshop, you'll master the Cloudflare Developer Platform by building a complete full-stack AI application from scratch. You'll start with the fundamentals of Cloudflare Workers and progressively add AI capabilities, databases, object storage, and a modern React frontend. By the end, you'll have deployed a production-ready AI application running on Cloudflare's global edge network.",
        maxAttendees: 20,
        speaker: speaker,
        topics: [
            {
                title: "Cloudflare Workers & Edge Computing",
                description: "Master serverless functions at the edge with global deployment and V8 runtime environment.",
                icon: <Cloud className="text-zurich" size={24} />
            },
            {
                title: "AI Integration & Workers AI",
                description: "Integrate AI capabilities using Workers AI with model selection and prompt engineering.",
                icon: <Rocket className="text-zurich" size={24} />
            },
            {
                title: "Data & Storage Solutions",
                description: "Implement D1 databases and R2 object storage for complete data persistence.",
                icon: <Database className="text-zurich" size={24} />
            },
            {
                title: "Modern Frontend with React",
                description: "Build interactive UIs with React and Cloudflare Vite plugin for seamless deployment.",
                icon: <Code className="text-zurich" size={24} />
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

    // Single source of truth for seats
    const seatsRemaining = 9; // Update in one place to keep the UI consistent

    // Scroll to registration function
    const scrollToRegistration = useCallback(() => {
        track('workshop_registration_button_clicked', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });

        // First try to find the payment buttons specifically
        const paymentButtons = document.querySelector('.payment-buttons') || document.getElementById('registrationContainer');
        if (paymentButtons) {
            // Get the element's position
            const elementPosition = paymentButtons.getBoundingClientRect().top + window.pageYOffset;

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
    }, [track, workshop.id, workshop.title]);

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

        // If coupon is applied via URL, scroll to purchase buttons after a short delay
        if (coupon && router.isReady) {
            setTimeout(() => {
                scrollToRegistration();
            }, 500); // Small delay to ensure page is fully loaded
        }
    }, [track, workshop.id, workshop.title, coupon, router.isReady, scrollToRegistration]);

    // Handle coupon application
    const applyCoupon = () => {
        if (couponCode.trim()) {
            const currentQuery = { ...router.query };
            currentQuery.coupon = couponCode.trim();
            router.replace(
                {
                    pathname: router.pathname,
                    query: currentQuery
                },
                undefined,
                { shallow: false } // Changed to false to ensure Stripe prices refresh
            );
            setShowCouponInput(false);
            setCouponCode('');
            
            // Track coupon application
            track('coupon_applied', {
                workshop_id: workshop.id,
                coupon_code: couponCode.trim()
            });
        }
    };

    // Remove coupon
    const removeCoupon = () => {
        const currentQuery = { ...router.query };
        delete currentQuery.coupon;
        router.replace(
            {
                pathname: router.pathname,
                query: currentQuery
            },
            undefined,
            { shallow: false } // Changed to false to ensure Stripe prices refresh
        );
        
        // Track coupon removal
        track('coupon_removed', {
            workshop_id: workshop.id,
            coupon_code: coupon as string
        });
    };

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

            {/* Sticky Info Banner */}
            <div className="sticky top-0 z-50 bg-zurich text-white shadow-lg">
                <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-js-dark" />
                                <span className="font-bold text-xs sm:text-sm">Only {seatsRemaining} seats left!</span>
                            </div>
                            <div className="hidden sm:block h-6 w-px bg-white/30"></div>
                            <div className="flex items-center gap-2">
                                <Timer size={16} className="text-js-dark" />
                                <span className="text-xs sm:text-sm">Early bird ends Aug 22nd</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
                            <div className="scale-75 sm:scale-100">
                                <CountdownTimer targetDate="2025-09-09T18:00:00" />
                            </div>
                            <button
                                onClick={scrollToRegistration}
                                className="bg-white text-zurich px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
                            >
                                Book Now - 95 CHF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <Section className="bg-gray-50 mt-2 sm:mt-3" padding="lg">
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
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-3 text-black leading-tight drop-shadow-sm">
                      {workshop.title}
                    </h1>
                    <h2 className="text-lg sm:text-xl md:text-2xl mb-5 text-gray-800 font-medium">
                      {workshop.subtitle}
                    </h2>
                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
                      <div className="flex items-center bg-blue-50 border border-blue-200 shadow px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm">
                        <Calendar size={16} className="mr-1.5 sm:mr-2 text-blue-600"/>
                        <span className="text-blue-800">{workshop.dateInfo}</span>
                      </div>
                      <div className="flex items-center bg-green-50 border border-green-200 shadow px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm">
                        <Clock size={16} className="mr-1.5 sm:mr-2 text-green-600"/>
                        <span className="text-green-800">{workshop.timeInfo}</span>
                      </div>
                      <div className="flex items-center bg-purple-50 border border-purple-200 shadow px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm">
                        <MapPin size={16} className="mr-1.5 sm:mr-2 text-purple-600"/>
                        <span className="text-purple-800 truncate">Smallpdf AG, Zürich</span>
                      </div>
                      <div className="flex items-center bg-orange-50 border border-orange-200 shadow px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm">
                        <Users size={16} className="mr-1.5 sm:mr-2 text-orange-600"/>
                        <span className="text-orange-800">Max {workshop.maxAttendees}</span>
                      </div>
                    </div>
                    {/* Workshop Navigation Cards */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <Button
                        onClick={scrollToRegistration}
                        className="bg-zurich text-white hover:bg-zurich/90 text-base sm:text-lg py-3 sm:py-4 px-6 sm:px-8 font-bold shadow-lg transform hover:scale-105 transition-all flex-1 sm:flex-initial"
                      >
                        🎫 Book Your Spot - 95 CHF
                      </Button>
                      {isClient && (
                        <Button
                          onClick={shareWorkshop}
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-800 text-sm py-2 font-medium"
                        >
                          <Share2 size={16} className="mr-1.5"/>
                          Share
                        </Button>
                      )}
                    </div>
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg mb-6">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={20} className="text-js-dark" />
                          <span className="font-bold text-amber-700">Early bird pricing</span>
                        </div>
                        <div className="text-sm text-zurich">
                          Save 30 CHF • {seatsRemaining} of {workshop.maxAttendees} seats remaining • Ends August 22nd
                        </div>
                      </div>
                      {/* Removed extra savings prompt for a cleaner hero */}
                    </div>
                    {/* Mini Speaker Card for mobile - now below hero content */}
                    <div className="block sm:hidden mt-8">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-1">Meet your instructor</h3>
                      <Link
                        href={`/speakers/${workshop.speaker.id}`}
                        className="flex items-center gap-3 bg-white/80 rounded-xl shadow p-2 border border-amber-100 w-full max-w-xs mx-auto"
                      >
                        <div className="flex-shrink-0">
                          <div className="bg-amber-400 rounded-full w-14 h-14 flex items-center justify-center shadow">
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
                    <div className="relative bg-white rounded-2xl shadow-2xl px-4 py-6 w-full max-w-2xl flex flex-row items-center border-2 border-amber-200 gap-4 sm:gap-8">
                      <div className="flex-shrink-0 flex items-center justify-center h-36 w-36 mb-4 sm:mb-0">
                        <div className="bg-amber-400 rounded-full w-32 h-32 flex items-center justify-center shadow-xl">
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
                        <Link
                          href={`/speakers/${workshop.speaker.id}`}
                          className="mt-2 inline-block text-blue-600 hover:text-blue-800 underline font-medium text-sm"
                        >
                          View Full Speaker Profile →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
            </Section>

            {/* Quick Info Cards */}
            <Section className="bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <Calendar className="text-blue-600 mb-3" size={24} />
                    <div className="font-semibold text-blue-800">Date & Time</div>
                    <div className="text-sm text-blue-700">{workshop.dateInfo}</div>
                    <div className="text-sm text-blue-700">{workshop.timeInfo}</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                    <MapPin className="text-purple-600 mb-3" size={24} />
                    <div className="font-semibold text-purple-800">Location</div>
                    <div className="text-sm text-purple-700">Smallpdf AG</div>
                    <div className="text-sm text-purple-700">Steinstrasse 21, Zürich</div>
                  </div>
                  <div className="bg-red-50 p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                    <Users className="text-red-600 mb-3" size={24} />
                    <div className="font-semibold text-red-800">Availability</div>
                    <div className="text-sm text-red-600 font-bold">{seatsRemaining} seats left</div>
                    <div className="text-sm text-red-700">of {workshop.maxAttendees} total</div>
                  </div>
                  <div className="bg-amber-50 p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
                    <Timer className="text-amber-600 mb-3" size={24} />
                    <div className="font-semibold text-amber-800">Early Bird</div>
                    <div className="text-sm text-amber-600 font-bold">Ends Aug 22nd</div>
                    <div className="text-sm text-amber-700">Save 30 CHF</div>
                  </div>
                </div>
            </Section>

            <Section className="bg-white">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
                        <AlertCircle size={16} />
                        Only {seatsRemaining} seats left!
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-gray-900">
                        🎯 Secure Your Spot
                    </h2>
                    <p className="text-lg text-gray-600 mb-6">
                        Build a complete AI application in 2.5 hours with hands-on guidance
                    </p>
                    <div className="flex justify-center mb-4">
                        <CountdownTimer targetDate="2025-09-09T18:00:00" />
                    </div>
                    <div className="text-sm text-amber-700 font-semibold">
                        Early bird pricing ends August 22nd - Save 30 CHF!
                    </div>
                </div>

                {canceled === 'true' ? (
                        <CancelledCheckout 
                            workshopId="ai-edge-application"
                            workshopTitle={workshop.title}
                        />
                    ) : (
                        <>
                            <div className="bg-white border-2 border-zurich/30 rounded-xl p-6 mb-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-zurich/10 rounded-full shadow-sm">
                                        <AlertCircle className="text-zurich" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-zurich">Workshop Pricing</h3>
                                        <p className="text-sm text-gray-600">Seats available</p>
                                    </div>
                                </div>
                                
                                <div className="grid sm:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-white rounded-lg p-4 border border-zurich/20 shadow-sm">
                                        <div className="text-sm font-medium text-gray-600 mb-1">Early Bird Special</div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-3xl font-bold text-zurich">95</span>
                                            <span className="text-lg font-semibold text-gray-600">CHF</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            <span className="line-through">Regular: 125 CHF</span>
                                            <span className="ml-2 text-green-600 font-semibold">Save 24%</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-4 border border-zurich/20 shadow-sm">
                                        <div className="text-sm font-medium text-gray-600 mb-1">Availability</div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-3xl font-bold text-zurich">{seatsRemaining}</span>
                                            <span className="text-lg font-semibold text-gray-600">left</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            of {workshop.maxAttendees} total seats
                                        </div>
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-zurich h-2 rounded-full transition-all duration-300"
                                                    style={{width: `${((workshop.maxAttendees - seatsRemaining) / workshop.maxAttendees) * 100}%`}}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                                    <div className="text-amber-800 font-semibold text-sm mb-1">
                                        ⏰ Early Bird Pricing
                                    </div>
                                    <div className="text-amber-700 text-xs">
                                        Early bird pricing ends August 22nd
                                    </div>
                                </div>
                            </div>


                            <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg mb-6">
                                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                    <span className="text-green-600">📦</span> What&apos;s included:
                                </h4>
                                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200">
                                        <span className="text-green-600 font-bold">✓</span> 2.5 hours hands-on learning
                                    </div>
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200">
                                        <span className="text-green-600 font-bold">✓</span> Complete codebase & guides
                                    </div>
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200">
                                        <span className="text-green-600 font-bold">✓</span> Refreshments & snacks
                                    </div>
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200">
                                        <span className="text-green-600 font-bold">✓</span> Community access
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
            </Section>

            {/* Workshop Content and Registration Side by Side */}
            <Section className="bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Workshop Details - Left Column (2/3 width on desktop) */}
                    <div className="lg:col-span-2 order-2 lg:order-1">
                        {/* Quick Workshop Summary */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true}}
                            transition={{duration: 0.5}}
                            className="mb-8 bg-white border-2 border-amber-200 p-6 rounded-xl shadow-sm"
                        >
                            <div className="mb-6">
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                                    🚀 What You&apos;ll Build
                                </h2>
                                <p className="text-lg text-gray-700 mb-4">
                                    A complete AI-powered application with data persistence, file storage, and an interactive frontend running on Cloudflare&apos;s global edge network.
                                </p>
                            </div>
                            
                            {/* Key Highlights Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="text-2xl mb-2">☁️</div>
                                    <div className="text-sm font-semibold text-gray-800">Cloudflare Workers</div>
                                    <div className="text-xs text-gray-600">Edge Computing</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="text-2xl mb-2">🤖</div>
                                    <div className="text-sm font-semibold text-gray-800">AI Integration</div>
                                    <div className="text-xs text-gray-600">Workers AI</div>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-2xl mb-2">💾</div>
                                    <div className="text-sm font-semibold text-gray-800">D1 Database</div>
                                    <div className="text-xs text-gray-600">Data Storage</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-2xl mb-2">⚛️</div>
                                    <div className="text-sm font-semibold text-gray-800">React Frontend</div>
                                    <div className="text-xs text-gray-600">Modern UI</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Workshop Overview */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true}}
                            transition={{duration: 0.5}}
                            className="mb-8 bg-gray-50 p-5 sm:p-7 rounded-lg border-l-4 border-amber-400"
                        >
                            <div className="flex items-center mb-4 sm:mb-6">
                                <div className="h-1 w-6 sm:w-10 bg-amber-400 mr-2 sm:mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Workshop Overview</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-2 sm:ml-3"></div>
                            </div>
                            <p className="text-gray-800 leading-relaxed text-base mb-4">
                                {workshop.description}
                            </p>
                            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
                                <p className="text-gray-800 mb-3">
                                    <strong className="text-amber-700">What you&apos;ll build:</strong> A complete AI-powered application with data persistence, file storage, and an interactive frontend running on Cloudflare&apos;s global edge network.
                                </p>
                                <p className="text-gray-700 text-sm">
                                    <strong className="text-amber-700">Workshop includes:</strong> 2.5 hours of hands-on learning with a 20-minute break, refreshments and snacks provided throughout the session.
                                </p>
                            </div>
                        </motion.div>

                        {/* Workshop Details */}
                        <div className="space-y-8">
                        {/* Workshop Topics */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true}}
                            transition={{duration: 0.5}}
                            className="mb-8"
                        >
                            <div className="flex items-center mb-6">
                                <div className="h-1 w-6 bg-amber-600 mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Key Technologies</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                            </div>

                            <div className="grid gap-4">
                                {workshop.topics.map((topic, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{opacity: 0, y: 20}}
                                        whileInView={{opacity: 1, y: 0}}
                                        viewport={{once: true}}
                                        transition={{duration: 0.5, delay: 0.1 * (index + 1)}}
                                        className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center mb-2">
                                            <div className="bg-amber-100 p-2 rounded-full mr-3">
                                                {topic.icon}
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800">
                                                {topic.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-600 leading-relaxed text-sm">
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
                            className="mb-8"
                        >
                            <div className="flex items-center mb-6">
                                <div className="h-1 w-6 bg-purple-600 mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Workshop Structure</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                            </div>
                            <Accordion phases={workshop.phases} />
                        </motion.div>

                        {/* Takeaways */}
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="mb-8 bg-white p-6 rounded-lg shadow-sm border-l-4 border-amber-400"
                        >
                            <div className="flex items-center mb-6">
                                <div className="h-1 w-6 bg-amber-400 mr-3"></div>
                                <h2 className="text-xl sm:text-2xl font-bold text-black">What You&apos;ll Take Away</h2>
                                <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                            </div>
                            
                            <div className="space-y-3">
                                {workshop.takeaways.map((takeaway, index) => (
                                    <div key={index} className="flex items-start bg-gray-50 p-3 rounded-lg">
                                        <div className="bg-amber-400 h-6 w-6 rounded-full flex items-center justify-center text-black font-bold mr-3 flex-shrink-0 text-sm">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-800 text-sm leading-relaxed">{takeaway}</p>
                                    </div>
                                ))}
                            </div>
                            
                        </motion.div>
                        </div>
                    </div>
                    
                    {/* Registration Section - Right Column (1/3 width on desktop) */}
                    <div className="lg:col-span-1 order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            id="registrationContainer"
                            className="bg-white p-4 sm:p-6 rounded-xl shadow-xl border-2 border-zurich lg:sticky lg:top-24 h-fit"
                        >
                            <div className="text-center mb-4 sm:mb-6">
                                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
                                    <AlertCircle size={14} />
                                    Only {seatsRemaining} seats left!
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">
                                    🎯 Secure Your Spot
                                </h2>
                                <div className="flex justify-center mb-3 scale-75 sm:scale-75">
                                    <CountdownTimer targetDate="2025-09-09T18:00:00" />
                                </div>
                                <div className="text-xs text-amber-700 font-semibold">
                                    Early bird ends Aug 22nd - Save 30 CHF!
                                </div>
                            </div>

                            {canceled === 'true' ? (
                                <CancelledCheckout 
                                    workshopId="ai-edge-application"
                                    workshopTitle={workshop.title}
                                />
                            ) : (
                                <>
                                    <div className="bg-gradient-to-br from-white to-blue-50/30 border-2 border-zurich rounded-xl p-5 mb-4 shadow-lg">
                                        {/* Header with pricing emphasis */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-zurich rounded-full">
                                                    <AlertCircle className="text-white" size={16} />
                                                </div>
                                                <h3 className="text-lg font-bold text-zurich">Workshop Pricing</h3>
                                            </div>
                                            <div className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                                                {seatsRemaining} seats left
                                            </div>
                                        </div>
                                        
                                        {/* Main price display */}
                                        <div className="bg-white rounded-lg p-4 mb-4 border border-zurich/20">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Early Bird Special</div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-black text-zurich">95</span>
                                                        <span className="text-lg font-bold text-zurich">CHF</span>
                                                        <span className="text-sm text-gray-400 line-through ml-2">125 CHF</span>
                                                    </div>
                                                    <div className="text-xs text-green-600 font-semibold mt-1">
                                                        💰 Save 30 CHF (24% off)
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500 mb-1">Availability</div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all"
                                                                style={{ width: `${(seatsRemaining / workshop.maxAttendees) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-600">{seatsRemaining}/{workshop.maxAttendees}</span>
                                                    </div>
                                                    <div className="text-xs text-red-500 font-medium mt-1">Filling fast!</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Urgency banner */}
                                        <div className="bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-lg px-3 py-2">
                                            <div className="flex items-center justify-center gap-2 text-amber-800">
                                                <span className="animate-pulse">⏰</span>
                                                <span className="text-xs font-bold">Early bird pricing ends August 22nd</span>
                                                <span className="animate-pulse">⏰</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coupon Section */}
                                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 mb-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">🎫</span>
                                                <h4 className="font-semibold text-zurich">Have a coupon code?</h4>
                                            </div>
                                            {!coupon && (
                                                <button
                                                    onClick={() => setShowCouponInput(!showCouponInput)}
                                                    className="text-zurich hover:opacity-80 font-medium text-sm"
                                                >
                                                    {showCouponInput ? 'Hide' : 'Apply Coupon'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {coupon ? (
                                            <div className="flex items-center justify-between bg-green-100 border border-green-300 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-600 font-semibold">✓ Coupon &quot;{coupon}&quot; applied!</span>
                                                </div>
                                                <button
                                                    onClick={removeCoupon}
                                                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : showCouponInput && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Enter coupon code..."
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && applyCoupon()}
                                                    className="flex-1 px-3 py-2 border border-zurich/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-zurich text-sm"
                                                />
                                                <button
                                                    onClick={applyCoupon}
                                                    disabled={!couponCode.trim()}
                                                    className="bg-zurich text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        )}
                                        
                                        {!coupon && (
                                            <div className="mt-3 text-xs text-zurich">
                                                💡 ZurichJS members get 20% off automatically when logged in!
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-green-50 border-2 border-green-200 p-3 rounded-lg mb-4">
                                        <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2 text-sm">
                                            <span className="text-green-600">📦</span> What&apos;s included:
                                        </h4>
                                        <div className="space-y-2 text-xs text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">✓</span> 2.5 hours hands-on learning
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">✓</span> Complete codebase & guides
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">✓</span> Refreshments & snacks
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">✓</span> Community access
                                            </div>
                                        </div>
                                    </div>

                                    {/* T-shirt Link */}
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-2xl">👕</span>
                                            <h4 className="font-semibold text-purple-800 text-sm">
                                                Get Your ZurichJS T-Shirt
                                            </h4>
                                        </div>
                                        <p className="text-xs text-purple-700 mb-3">
                                            Pre-order your official ZurichJS t-shirt and have it ready for pickup at the workshop!
                                        </p>
                                        <Link href="/tshirt" target="_blank">
                                            <button className="w-full bg-purple-600 text-white px-3 py-2 rounded text-xs font-medium hover:bg-purple-700 transition-colors">
                                                Order T-Shirt
                                            </button>
                                        </Link>
                                    </div>


                                    {/* Stripe Checkout */}
                                    {isClient && <div className="payment-buttons">
                                        <TicketSelection
                                            options={aiEdgeWorkshopTickets}
                                            className=""
                                            workshopId={workshop.id}
                                            ticketType="workshop"
                                        />
                                    </div>}
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            </Section>

            {/* Additional Workshop Info */}
            <Section className="bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Who Should Attend */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500"
                    >
                        <div className="flex items-center mb-4">
                            <div className="h-1 w-6 bg-blue-500 mr-3"></div>
                            <h2 className="text-xl font-bold text-black">Who Should Attend</h2>
                            <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                        </div>
                        
                        <div className="space-y-3">
                            {workshop.targetAudience.map((audience, index) => (
                                <div key={index} className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                                    <Users className="text-blue-600 flex-shrink-0" size={20} />
                                    <p className="font-medium text-gray-800 text-sm">{audience}</p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-800">
                                <span className="text-blue-600 font-bold">Perfect for:</span> Developers ready to dive deep into edge computing and AI integration with hands-on experience.
                            </p>
                        </div>
                    </motion.div>

                    {/* Prerequisites & Requirements */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500"
                    >
                        <div className="flex items-center mb-4">
                            <div className="h-1 w-6 bg-purple-500 mr-3"></div>
                            <h2 className="text-xl font-bold text-black">Prerequisites & Requirements</h2>
                            <div className="h-1 flex-grow bg-gray-200 ml-3"></div>
                        </div>
                        
                        <div className="mb-4">
                            <h3 className="text-base font-bold text-gray-800 mb-3">Software Prerequisites:</h3>
                            <div className="space-y-2">
                                {workshop.prerequisites.map((prerequisite, index) => (
                                    <div key={index} className="flex items-start">
                                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 mr-2">
                                            <span className="text-purple-700 font-bold text-xs">{index + 1}</span>
                                        </div>
                                        <p className="text-gray-700 text-sm">{prerequisite}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="text-base font-bold text-gray-800 mb-3">Hardware Requirements:</h3>
                            <div className="bg-purple-50 p-3 rounded-lg">
                                <ul className="space-y-1 text-sm">
                                    <li className="flex items-start">
                                        <span className="text-purple-500 mr-2">•</span>
                                        <span className="text-gray-700">Laptop with reliable internet connection</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-purple-500 mr-2">•</span>
                                        <span className="text-gray-700">At least 8GB RAM recommended</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-purple-500 mr-2">•</span>
                                        <span className="text-gray-700">Admin access to install software</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-800">
                                <span className="text-purple-600 font-bold">Note:</span> We&apos;ll provide step-by-step guidance for all Cloudflare setup during the workshop. Free tier accounts are sufficient for all exercises.
                            </p>
                        </div>
                    </motion.div>

                </div>
            </Section>

            {/* Floating CTA Button */}
            <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 hidden sm:block">
                <div className="flex flex-col gap-2 items-start">
                    <button
                        onClick={scrollToRegistration}
                        className="bg-zurich hover:bg-zurich/90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all font-bold text-xs sm:text-sm flex items-center gap-2"
                    >
                        <Timer size={14} className="sm:w-4 sm:h-4" />
                        <span className="whitespace-nowrap">{`Book Now - ${seatsRemaining} left`}</span>
                    </button>
                </div>
            </div>

            {/* Final CTA */}
            <Section className="bg-zurich">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-8"
                >
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Don&apos;t Miss Out! 🚀</h2>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6 max-w-2xl mx-auto">
                        <div className="flex justify-center mb-4">
                            <CountdownTimer targetDate="2025-09-09T18:00:00" />
                        </div>
                        <p className="text-white/90 text-lg mb-4">
                            Build a complete AI application in one evening with expert guidance
                        </p>
                        <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
                            <span className="flex items-center gap-1">
                                <AlertCircle size={16} />
                                Only {seatsRemaining} seats left
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Timer size={16} />
                                Early bird ends Aug 22nd
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={scrollToRegistration}
                        className="bg-white text-zurich px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                    >
Secure Your Spot Now - 95 CHF
                    </button>
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