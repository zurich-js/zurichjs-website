import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, Activity, BarChart, Search, Eye, Timer, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

import PageLayout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import CancelledCheckout from '@/components/workshop/CancelledCheckout';
import { observabilityWorkshopTickets } from '@/components/workshop/observabilityWorkshopTickets';
import TicketSelection from '@/components/workshop/TicketSelection';
import useEvents from '@/hooks/useEvents';
import { getSpeakersByIds } from '@/sanity/queries';
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
    speakers: Speaker[];
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
    speakers: Speaker[];
}

// --- Smart Countdown Component ---
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isClient, setIsClient] = useState(false);
  const [countdownType] = useState<'workshop'>('workshop');

  useEffect(() => {
    setIsClient(true);
    const updateTimer = () => {
      const now = new Date().getTime();
      const workshopStart = new Date('2025-10-28T16:00:00').getTime();
      
      // Workshop countdown only
      const difference = workshopStart - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        // Workshop has started or passed
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isClient) return null;

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isExpired && countdownType === 'workshop') {
    return (
      <div className="text-center">
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm">
          Workshop Started!
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-xs font-medium text-white mb-1">
        Workshop Starts In:
      </div>
      <div className="flex gap-2 sm:gap-4">
        {[{ label: 'Days', value: timeLeft.days }, { label: 'Hours', value: timeLeft.hours }, { label: 'Min', value: timeLeft.minutes }, { label: 'Sec', value: timeLeft.seconds }].map((unit) => (
          <div key={unit.label} className="bg-white/90 backdrop-blur rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-center min-w-[3rem] sm:min-w-[4rem]">
            <div className="font-bold text-lg sm:text-2xl text-gray-900">{unit.value.toString().padStart(2, '0')}</div>
            <div className="text-xs text-gray-600 font-medium">{unit.label}</div>
          </div>
        ))}
      </div>
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

export default function ObservabilityWorkshopPage({ speakers }: WorkshopPageProps) {
    const [isClient, setIsClient] = useState(false);

    const [couponCode, setCouponCode] = useState('');
    const [showCouponInput, setShowCouponInput] = useState(false);
    const { track } = useEvents();
    const router = useRouter();
    const { canceled, coupon } = router.query;

    // Workshop data
    const workshop: WorkshopDetails = {
        id: "observability-dynatrace",
        title: "Observability in Action: Hands-On with Dynatrace",
        subtitle: "Master Modern System Observability & Monitoring",
        dateInfo: "October 28, 2025",
        timeInfo: "16:00 - 18:00",
        locationInfo: "Smallpdf AG, Steinstrasse 21, 8003 Zürich",
        price: "95 CHF (Early Bird) / 125 CHF",
        description: "Learn to master modern observability with hands-on experience using Dynatrace. This workshop will teach you the three pillars of observability - metrics, logs, and traces - through practical exercises with the AstroShop application. You'll discover how to build alerting that reduces noise, implement cost-effective data ingestion strategies, and use distributed tracing as a debugging superpower. By the end, you'll understand how to create a mature observability setup that provides actionable insights for your applications.",
        maxAttendees: 25,
        speakers: speakers,
        topics: [
            {
                title: "Three Pillars of Observability",
                description: "Master metrics, logs, and traces with hands-on exploration using Dynatrace dashboards and correlation techniques.",
                icon: <Activity className="text-zurich" size={24} />
            },
            {
                title: "Smart Alerting & AI-Powered Detection",
                description: "Configure symptom-based alerts and leverage Dynatrace AI to reduce noise and alert fatigue.",
                icon: <AlertCircle className="text-zurich" size={24} />
            },
            {
                title: "Cost-Effective Data Ingestion",
                description: "Build efficient observability pipelines with strategic sampling, retention, and cardinality management.",
                icon: <BarChart className="text-zurich" size={24} />
            },
            {
                title: "Distributed Tracing for Debugging",
                description: "Use OpenTelemetry and Dynatrace tracing to debug latency issues and service dependencies effectively.",
                icon: <Search className="text-zurich" size={24} />
            }
        ],
        takeaways: [
            "Deep understanding of the three pillars of observability and their correlation",
            "Ability to configure smart alerting that reduces alert fatigue using AI-powered anomaly detection",
            "Skills to build cost-effective observability pipelines with proper sampling and retention strategies",
            "Hands-on experience debugging complex issues using distributed tracing",
            "Knowledge of OpenTelemetry integration for vendor-neutral observability",
            "Understanding of how to foster observability culture within development teams",
            "Practical experience with Dynatrace for real-world observability scenarios"
        ],
        targetAudience: [
            "DevOps Engineers managing complex distributed systems",
            "Site Reliability Engineers focused on system reliability",
            "Full-stack Developers interested in production monitoring",
            "Platform Engineers building observability infrastructure"
        ],
        prerequisites: [
            "Basic understanding of web applications and APIs",
            "Familiarity with system monitoring concepts",
            "Experience with distributed systems (microservices preferred)",
            "Laptop with stable internet connection",
            "Basic knowledge of logging and metrics"
        ],
        phases: [
            {
                title: "Introduction to Modern Observability",
                duration: "15 minutes",
                description: "Understand why observability is critical for modern systems and explore the AstroShop demo application",
                activities: [
                    "Overview of observability vs monitoring",
                    "Introduction to AstroShop application architecture",
                    "Explore mature observability setups and common patterns",
                    "Set up Dynatrace environment access"
                ],
                concepts: [
                    "Full-stack visibility requirements",
                    "SLIs/SLOs alignment principles",
                    "Automation in observability",
                    "Proactive vs reactive monitoring"
                ]
            },
            {
                title: "Three Pillars Deep Dive",
                duration: "30 minutes",
                description: "Master metrics, logs, and traces through theory and hands-on exploration",
                activities: [
                    "Explore metrics dashboards in Dynatrace",
                    "Search and filter logs to identify patterns",
                    "Trace customer transactions across services",
                    "Practice correlating data across all three pillars"
                ],
                concepts: [
                    "RED/USE methods and percentiles",
                    "Structured logging and sampling strategies",
                    "Distributed tracing fundamentals",
                    "Data correlation techniques"
                ]
            },
            {
                title: "Intelligent Alerting Systems",
                duration: "20 minutes",
                description: "Configure smart alerts and leverage AI-powered anomaly detection",
                activities: [
                    "Set up symptom-based alerts for AstroShop",
                    "Configure Dynatrace AI anomaly detection",
                    "Practice alert ownership assignment",
                    "Test dynamic baseline configurations"
                ],
                concepts: [
                    "Symptom vs root cause alerting",
                    "Alert ownership and team collaboration",
                    "Dynamic baselines and anomaly detection",
                    "Alert fatigue prevention strategies"
                ]
            },
            {
                title: "Data Ingestion & Cost Management",
                duration: "20 minutes",
                description: "Build efficient observability pipelines while managing costs effectively",
                activities: [
                    "Analyze current data ingestion patterns",
                    "Configure log retention and sampling policies",
                    "Optimize storage configurations",
                    "Practice cardinality management techniques"
                ],
                concepts: [
                    "Observability pipeline architecture",
                    "Sampling strategies and trade-offs",
                    "Retention policy optimization",
                    "Cost control mechanisms"
                ]
            },
            {
                title: "Distributed Tracing Mastery",
                duration: "20 minutes",
                description: "Use tracing as a debugging superpower with OpenTelemetry integration",
                activities: [
                    "Simulate and debug latency issues in AstroShop",
                    "Trace service dependency problems",
                    "Correlate traces with metrics and logs",
                    "Practice OpenTelemetry integration patterns"
                ],
                concepts: [
                    "OpenTelemetry vendor neutrality",
                    "Trace-driven debugging workflows",
                    "Service dependency visualization",
                    "Cross-pillar correlation techniques"
                ]
            },
            {
                title: "Best Practices & Anti-Patterns",
                duration: "15 minutes",
                description: "Learn from common mistakes and establish observability culture",
                activities: [
                    "Review AstroShop's observability setup",
                    "Identify and fix anti-patterns",
                    "Discuss team ownership models",
                    "Plan shift-left observability integration"
                ],
                concepts: [
                    "Common observability anti-patterns",
                    "Building observability into development",
                    "Team accountability frameworks",
                    "Cultural transformation strategies"
                ]
            }
        ]
    };

    // Single source of truth for seats
    const seatsRemaining = 18; // 25 total seats - 7 taken = 18 remaining

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

    // Scroll to workshop details function
    const scrollToDetails = useCallback(() => {
        track('workshop_details_button_clicked', {
            workshop_id: workshop.id,
            workshop_title: workshop.title
        });

        // Find the "What You'll Learn" section specifically
        const whatYoullLearnSection = document.getElementById('what-youll-learn');
        if (whatYoullLearnSection) {
            // Get the element's position
            const elementPosition = whatYoullLearnSection.getBoundingClientRect().top + window.pageYOffset;

            // Scroll to a position 100px above the element
            window.scrollTo({
                top: elementPosition - 100,
                behavior: 'smooth'
            });
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
                    image: `/api/og/workshop?title=${encodeURIComponent(workshop.title)}&subtitle=${encodeURIComponent(workshop.subtitle)}&speakerName=${encodeURIComponent(workshop.speakers.map(s => s.name).join(' & '))}&speakerImage=${encodeURIComponent(workshop.speakers[0]?.image || '')}`,
                    url: `/workshops/${workshop.id}`
                }}
            />

            {/* Sticky Info Banner */}
            <div className="sticky top-0 z-40 bg-zurich text-white shadow-lg">
                <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} className="text-js-dark" />
                                <span className="font-bold text-xs sm:text-sm">Only {seatsRemaining} seats left!</span>
                            </div>
                            <div className="hidden sm:block h-6 w-px bg-white/30"></div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-js-dark" />
                                <span className="text-xs sm:text-sm">October 28, 2025</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
                            <div className="scale-75 sm:scale-100">
                                <CountdownTimer />
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
                      📊 Observability & Monitoring
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
                      <Button
                        onClick={scrollToDetails}
                        variant="outline"
                        className="border-zurich text-zurich hover:bg-zurich hover:text-white text-base sm:text-lg py-3 sm:py-4 px-6 sm:px-8 font-bold shadow-lg transform hover:scale-105 transition-all flex-1 sm:flex-initial"
                      >
                        📚 Learn More
                      </Button>
                      {isClient && (
                        <Button
                          onClick={shareWorkshop}
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-600 hover:text-white text-sm py-2 font-medium"
                        >
                          <Share2 size={16} className="mr-1.5"/>
                          Share
                        </Button>
                      )}
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={20} className="text-red-600" />
                          <span className="font-bold text-red-700">Limited availability</span>
                        </div>
                        <div className="text-sm text-zurich">
                          Only {seatsRemaining} of {workshop.maxAttendees} seats remaining
                        </div>
                      </div>
                    </div>
                    {/* Mini Speaker Cards for mobile - now below hero content */}
                    <div className="block sm:hidden mt-8">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pl-1">Meet your instructors</h3>
                      <div className="space-y-3">
                        {workshop.speakers.map((speaker) => (
                          <Link
                            key={speaker.id}
                            href={`/speakers/${speaker.id}`}
                            className="flex items-center gap-3 bg-white/80 rounded-xl shadow p-2 border border-amber-100 w-full max-w-xs mx-auto"
                          >
                            <div className="flex-shrink-0">
                              <div className="bg-amber-400 rounded-full w-14 h-14 flex items-center justify-center shadow">
                                <Image
                                  src={`${speaker.image}?h=120`}
                                  alt={speaker.name}
                                  width={56}
                                  height={56}
                                  className="rounded-full border-2 border-white shadow object-cover object-center w-12 h-12"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-base text-black leading-tight truncate">{speaker.name}</div>
                              <div className="text-xs text-blue-900 truncate">{speaker.title}</div>
                              <div className="mt-1">
                                <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-semibold mr-1">Dynatrace</span>
                                <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-semibold">Observability</span>
                              </div>
                              <span className="inline-block mt-2 text-xs text-blue-700 underline font-semibold">View Profile</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Full Speaker Cards for desktop */}
                  <div className="hidden sm:flex justify-center w-full">
                    <div className="space-y-4 w-full max-w-2xl">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center mb-4">Meet your instructors</h3>
                      {workshop.speakers.map((speaker) => (
                        <div key={speaker.id} className="relative bg-white rounded-2xl shadow-xl px-4 py-4 w-full flex flex-row items-center border-2 border-amber-200 gap-4 sm:gap-6">
                          <div className="flex-shrink-0 flex items-center justify-center h-28 w-28">
                            <div className="bg-amber-400 rounded-full w-24 h-24 flex items-center justify-center shadow-xl">
                              <Image
                                src={`${speaker.image}?h=300`}
                                alt={speaker.name}
                                width={96}
                                height={96}
                                className="rounded-full border-4 border-white shadow-2xl object-cover object-center w-20 h-20"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 w-full flex flex-col items-start text-left">
                            <h4 className="font-extrabold text-lg sm:text-xl text-black mb-1 leading-tight truncate w-full">{speaker.name}</h4>
                            <p className="text-sm sm:text-base text-blue-900 mb-2 font-medium leading-snug truncate w-full">{speaker.title}</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-semibold">Dynatrace Expert</span>
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">Observability</span>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">System Monitoring</span>
                            </div>
                            <Link
                              href={`/speakers/${speaker.id}`}
                              className="inline-block text-blue-600 hover:text-blue-800 underline font-medium text-sm"
                            >
                              View Full Speaker Profile →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            </Section>

            {/* Quick Info Cards */}
            <Section className="bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                  <div className="bg-blue-50 p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Calendar className="text-blue-600" size={20} />
                      <div className="font-semibold text-blue-800 text-sm sm:text-base">Date & Time</div>
                    </div>
                    <div className="text-xs sm:text-sm text-blue-700">{workshop.dateInfo}</div>
                    <div className="text-xs sm:text-sm text-blue-700">{workshop.timeInfo}</div>
                  </div>
                  <div className="bg-purple-50 p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <MapPin className="text-purple-600" size={20} />
                      <div className="font-semibold text-purple-800 text-sm sm:text-base">Location</div>
                    </div>
                    <div className="text-xs sm:text-sm text-purple-700">Smallpdf AG</div>
                    <div className="text-xs sm:text-sm text-purple-700">Steinstrasse 21, Zürich</div>
                  </div>
                  <div className="bg-red-50 p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Users className="text-red-600" size={20} />
                      <div className="font-semibold text-red-800 text-sm sm:text-base">Availability</div>
                    </div>
                    <div className="text-xs sm:text-sm text-red-600 font-bold">{seatsRemaining} seats left</div>
                    <div className="text-xs sm:text-sm text-red-700">of {workshop.maxAttendees} total</div>
                  </div>
                  <div className="bg-green-50 p-3 sm:p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Calendar className="text-green-600" size={20} />
                      <div className="font-semibold text-green-800 text-sm sm:text-base">Workshop Date</div>
                    </div>
                    <div className="text-xs sm:text-sm text-green-600 font-bold">October 15th</div>
                    <div className="text-xs sm:text-sm text-green-700">18:00 - 20:00</div>
                  </div>
                </div>
            </Section>


            {/* Workshop Content and Registration Side by Side */}
            <Section className="bg-white workshop-details-section">
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
                            id="what-youll-learn"
                        >
                            <div className="mb-6">
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                                    🚀 What You&apos;ll Learn
                                </h2>
                                <p className="text-lg text-gray-700 mb-4">
                                    Master modern observability through hands-on experience with Dynatrace, learning to build systems that provide actionable insights and reduce operational overhead.
                                </p>
                            </div>
                            
                            {/* Key Highlights Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="text-2xl mb-2">📊</div>
                                    <div className="text-sm font-semibold text-gray-800">Three Pillars</div>
                                    <div className="text-xs text-gray-600">Metrics, Logs, Traces</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="text-2xl mb-2">🤖</div>
                                    <div className="text-sm font-semibold text-gray-800">AI-Powered Alerts</div>
                                    <div className="text-xs text-gray-600">Smart Detection</div>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-2xl mb-2">💰</div>
                                    <div className="text-sm font-semibold text-gray-800">Cost Management</div>
                                    <div className="text-xs text-gray-600">Efficient Pipelines</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="text-2xl mb-2">🔍</div>
                                    <div className="text-sm font-semibold text-gray-800">Distributed Tracing</div>
                                    <div className="text-xs text-gray-600">Debug Like a Pro</div>
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
                                    <strong className="text-amber-700">Hands-on application:</strong> You&apos;ll work with the AstroShop demo application, exploring real observability scenarios and debugging actual issues.
                                </p>
                                <p className="text-gray-700 text-sm">
                                    <strong className="text-amber-700">Workshop includes:</strong> 2 hours of intensive hands-on learning with refreshments provided throughout the session.
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
                                <h2 className="text-xl sm:text-2xl font-bold text-black">Key Topics</h2>
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
                                <div className="text-xs text-red-700 font-semibold">
                                    Only {seatsRemaining} seats left - Book now!
                                </div>
                            </div>

                            {canceled === 'true' ? (
                                <CancelledCheckout 
                                    workshopId="observability-dynatrace"
                                    workshopTitle={workshop.title}
                                />
                            ) : (
                                <>
                                    <div className="bg-gradient-to-br from-white to-blue-50/30 border-2 border-zurich rounded-xl p-3 sm:p-5 mb-4 shadow-lg">
                                        {/* Header with pricing emphasis */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                                            <div className="flex items-center gap-2 mb-2 sm:mb-0">
                                                <div className="p-1.5 sm:p-2 bg-zurich rounded-full">
                                                    <AlertCircle className="text-white" size={14} />
                                                </div>
                                                <h3 className="text-base sm:text-lg font-bold text-zurich">Workshop Pricing</h3>
                                            </div>
                                            <div className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold self-start sm:self-auto">
                                                {seatsRemaining} seats left
                                            </div>
                                        </div>
                                        
                                        {/* Main price display */}
                                        <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-zurich/20">
                                            <div className="text-center sm:text-left">
                                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Workshop Price</div>
                                                <div className="flex items-baseline gap-1 sm:gap-2 justify-center sm:justify-start">
                                                    <span className="text-2xl sm:text-3xl font-black text-zurich">95</span>
                                                    <span className="text-base sm:text-lg font-bold text-zurich">CHF</span>
                                                </div>
                                                <div className="text-xs text-gray-600 font-semibold mt-1">
                                                    2 hours of hands-on learning
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Availability banner */}
                                        <div className="bg-gradient-to-r from-red-100 to-orange-100 border border-red-200 rounded-lg px-2 sm:px-3 py-2">
                                            <div className="flex items-center justify-center gap-1 sm:gap-2 text-red-800">
                                                <span className="animate-pulse text-sm">🎯</span>
                                                <span className="text-xs font-bold text-center">Only {seatsRemaining} seats remaining</span>
                                                <span className="animate-pulse text-sm">🎯</span>
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
                                            options={observabilityWorkshopTickets}
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
                                    <Eye className="text-blue-600 flex-shrink-0" size={20} />
                                    <p className="font-medium text-gray-800 text-sm">{audience}</p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-800">
                                <span className="text-blue-600 font-bold">Perfect for:</span> Engineers who want to move beyond basic monitoring to build comprehensive observability systems that provide actionable insights.
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
                            <h3 className="text-base font-bold text-gray-800 mb-3">Knowledge Prerequisites:</h3>
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
                            <h3 className="text-base font-bold text-gray-800 mb-3">What We&apos;ll Provide:</h3>
                            <div className="bg-purple-50 p-3 rounded-lg">
                                <ul className="space-y-1 text-sm">
                                    <li className="flex items-start">
                                        <span className="text-purple-500 mr-2">•</span>
                                        <span className="text-gray-700">Access to Dynatrace environment</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-purple-500 mr-2">•</span>
                                        <span className="text-gray-700">Pre-configured AstroShop demo application</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-purple-500 mr-2">•</span>
                                        <span className="text-gray-700">Workshop materials and follow-up resources</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-800">
                                <span className="text-purple-600 font-bold">Note:</span> All Dynatrace access and demo applications will be provided. Just bring your laptop and curiosity about observability!
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
                            <CountdownTimer />
                        </div>
                        <p className="text-white/90 text-lg mb-4">
                            Master observability with hands-on Dynatrace experience in one evening
                        </p>
                        <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
                            <span className="flex items-center gap-1">
                                <AlertCircle size={16} />
                                Only {seatsRemaining} seats left
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Calendar size={16} />
                                October 15th, 18:00
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
    // Fetch the speaker data using the getSpeakersByIds function
    const speakerIds = ['indermohan-singh', 'speaker-e9fed3d8-151c-422f-9e43-bd20160183a6'];
    const speakers = await getSpeakersByIds(speakerIds);

    if (!speakers || speakers.length === 0) {
        return {
            notFound: true,
        };
    }

    return {
        props: {
            speakers,
        },
        revalidate: 60, // Revalidate the page every 60 seconds
    };
}