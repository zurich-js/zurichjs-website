import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Share2, ChevronLeft, Brain, Lightbulb, Users2, Target, Layers } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

import PageLayout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { aiDesignPatternsTickets } from '@/components/workshop/aiDesignPatternsTickets';
import CancelledCheckout from '@/components/workshop/CancelledCheckout';
import TicketSelection from '@/components/workshop/TicketSelection';
import { useAuthenticatedCheckout } from '@/hooks/useAuthenticatedCheckout';
import { useCoupon } from '@/hooks/useCoupon';
import useEvents from '@/hooks/useEvents';
import { getSpeakersByIds } from '@/sanity/queries';
import { Speaker } from '@/types';

// Horizontal Timeline Component
function HorizontalTimeline({ seatsRemaining }: { seatsRemaining: number }) {
    const now = new Date();
    const earlyBirdEnd = new Date('2025-12-01');
    const lateBirdStart = new Date('2026-03-01');
    const workshopDate = new Date('2026-03-23');
    
    // Calculate early bird seats remaining
    const soldTickets = 30 - seatsRemaining; // Note: This should use totalSeats from parent component
    const earlyBirdSoldOut = soldTickets >= 10;
    
    const milestones = [
        { 
            name: 'Early Bird Pricing', 
            date: 'First 10 seats OR until Dec 1st, 2025',
            price: 'CHF 525',
            endDate: earlyBirdEnd,
            color: 'bg-green-500',
            textColor: 'text-green-700',
            bgColor: 'bg-green-50',
            icon: '🐦',
            extraInfo: !earlyBirdSoldOut && now < earlyBirdEnd ? `${Math.max(0, 10 - soldTickets)} early bird seats left` : null
        },
        { 
            name: 'Standard Pricing', 
            date: 'Dec 1st, 2025 - Mar 1st, 2026',
            price: 'CHF 595',
            endDate: lateBirdStart,
            color: 'bg-zurich',
            textColor: 'text-zurich',
            bgColor: 'bg-blue-50',
            icon: '💼'
        },
        { 
            name: 'Late Bird Pricing', 
            date: 'Mar 1st - Mar 23rd, 2026',
            price: 'CHF 625',
            endDate: workshopDate,
            color: 'bg-orange-500',
            textColor: 'text-orange-700',
            bgColor: 'bg-orange-50',
            icon: '⚡'
        },
        { 
            name: 'Workshop Day', 
            date: 'March 23rd, 2026',
            price: '09:00 - 17:00',
            endDate: workshopDate,
            color: 'bg-red-500',
            textColor: 'text-red-700',
            bgColor: 'bg-red-50',
            icon: '🎯'
        }
    ];
    
    const getCurrentMilestone = () => {
        if (now < earlyBirdEnd && !earlyBirdSoldOut) return 0;
        if (now < lateBirdStart) return 1;
        if (now < workshopDate) return 2;
        return 3;
    };
    
    const currentMilestone = getCurrentMilestone();
    
    return (
        <div className="mb-12">
            <h3 className="text-2xl font-bold text-black mb-6 text-center">Timeline & Pricing</h3>
            <div className="relative">
                {/* Main timeline line */}
                <div className="absolute top-8 left-4 right-4 h-1 bg-gray-200 rounded-full"></div>
                <div 
                    className="absolute top-8 left-4 h-1 bg-zurich rounded-full transition-all duration-1000"
                    style={{ width: `${(currentMilestone / (milestones.length - 1)) * 100}%` }}
                ></div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {milestones.map((milestone, index) => (
                        <div key={milestone.name} className="relative">
                            {/* Timeline dot */}
                            <div className="flex justify-center mb-4">
                                <div className={`w-16 h-16 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl ${
                                    index <= currentMilestone 
                                        ? milestone.color + ' text-white' 
                                        : 'bg-gray-200 text-gray-400'
                                }`}>
                                    {milestone.icon}
                                </div>
                            </div>
                            
                            {/* Milestone card */}
                            <div className={`${milestone.bgColor} rounded-xl p-4 border-2 ${
                                index === currentMilestone 
                                    ? `border-zurich shadow-lg` 
                                    : 'border-gray-200'
                            }`}>
                                <div className="text-center">
                                    <h4 className={`font-bold text-sm mb-2 ${
                                        index === currentMilestone ? milestone.textColor : 'text-gray-600'
                                    }`}>
                                        {milestone.name}
                                    </h4>
                                    <div className={`text-xs mb-2 ${
                                        index === currentMilestone ? 'text-black font-semibold' : 'text-gray-500'
                                    }`}>
                                        {milestone.date}
                                </div>
                                    <div className={`text-sm font-bold ${
                                        index === currentMilestone ? 'text-black' : 'text-gray-600'
                                }`}>
                                        {milestone.price}
                                </div>
                                    {milestone.extraInfo && (
                                        <div className="mt-1 text-xs text-green-600 font-semibold">
                                            {milestone.extraInfo}
                                </div>
                                    )}
                                    {index === currentMilestone && (
                                        <div className="mt-2 text-xs bg-zurich text-white px-2 py-1 rounded-full">
                                            Current
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

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
function CountdownTimer({ seatsRemaining }: { seatsRemaining: number }) {
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
      const earlyBirdEnd = new Date('2025-12-01T23:59:59').getTime();
      const workshopStart = new Date('2026-03-23T09:00:00').getTime();
      
      // Calculate sold tickets and early bird seats left
      const totalSeats = 30;
      const soldTickets = totalSeats - seatsRemaining;
      const earlyBirdSoldOut = soldTickets >= 10;
      
      // Determine which countdown to show
      let targetTime;
      
      if (!earlyBirdSoldOut && now < earlyBirdEnd) {
        // Show early bird countdown
        targetTime = earlyBirdEnd;
      } else {
        // Show workshop countdown
        targetTime = workshopStart;
      }
      
      const difference = targetTime - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [seatsRemaining]);

  if (!isClient) return null;

  const now = new Date().getTime();
  const earlyBirdEnd = new Date('2025-12-01T23:59:59').getTime();
  const workshopStart = new Date('2026-03-23T09:00:00').getTime();
  
  const totalSeats = 30;
  const soldTickets = totalSeats - seatsRemaining;
  const earlyBirdSoldOut = soldTickets >= 10;
  
  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  
  // Determine countdown label
  const countdownLabel = !earlyBirdSoldOut && now < earlyBirdEnd 
    ? "Early Bird Ends In:" 
    : "Workshop Starts In:";

  if (isExpired && now >= workshopStart) {
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
        {countdownLabel}
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


export default function AIDesignPatternsWorkshopPage({ speakers }: WorkshopPageProps) {

    const [isClient, setIsClient] = useState(false);

    const { track } = useEvents();
    const router = useRouter();
    const { canceled, coupon } = router.query;
    
    // Authentication and discount system
    const { isSignedIn, startCheckout } = useAuthenticatedCheckout({
        onError: (error) => {
            console.error('Checkout error:', error);
        },
    });
    const { couponCode, couponData } = useCoupon();
    
    // Determine discount status
    const hasCoupon = couponData && couponData.isValid;
    const communityDiscount = isSignedIn && !hasCoupon;
    
    // FAQ accordion state
    const [openFaq, setOpenFaq] = useState<string | null>(null);
    

    // Workshop data
    const workshop: WorkshopDetails = {
        id: "ai-design-patterns-2026",
        title: "Design Patterns For AI Interfaces In 2026",
        subtitle: "Master AI UX Design & Build Better User Experiences",
        dateInfo: "March 23, 2026",
        timeInfo: "09:00 - 17:00 (8 hours, lunch included)",
        locationInfo: "Venue TBA, Zürich",
        price: "525 CHF (Early Bird) / 595 CHF / 625 CHF (Late Bird)",
        description: "As product teams race to include AI in their products, they too often rely on good old-fashioned patterns like an assistant or chatbot. However, this experience is often painfully slow, responses are generic, and users have to meticulously explain to AI what they need — over and over. In this full-day workshop with Vitaly Friedman, senior UX consultant with the European Parliament and creative lead of Smashing Magazine, we'll explore brand new design patterns for better AI experiences, with daemons, clustering, style lenses, structured presets and templates, dynamic editing, temperature knobs and everything in-between!",
        maxAttendees: 30,
        speakers: speakers,
        topics: [
            {
                title: "AI UX State & Challenges",
                description: "Understand how people use AI products today, main slowdowns, context awareness, capabilities awareness, and discoverability challenges.",
                icon: <Brain className="text-zurich" size={24} />
            },
            {
                title: "Intent Articulation Patterns",
                description: "Learn style lenses, daemons, temperature knobs and other patterns to help users navigate AI output faster and more precisely.",
                icon: <Target className="text-zurich" size={24} />
            },
            {
                title: "Dynamic AI Interfaces",
                description: "Transform AI's static output into dynamic and proactive UI with canvases, conversations, clustering, and dynamic views.",
                icon: <Layers className="text-zurich" size={24} />
            },
            {
                title: "Agentic UX Design",
                description: "Design for agentic UX, support users in complex flows, consider accessibility, sustainability, and build trust in AI interfaces.",
                icon: <Users2 className="text-zurich" size={24} />
            }
        ],
        takeaways: [
            "Practical design patterns from various AI products and interfaces with actionable takeaways",
            "Better understanding of how to approach AI projects and prevent risks and technical challenges",
            "Increased comfort and confidence in designing AI features and experiences",
            "Toolbox of techniques for intent articulation with style lenses, daemons, and temperature controls",
            "Methods to transform static AI output into dynamic, proactive user interfaces",
            "Understanding of agentic UX design for complex workflows and task support",
            "Knowledge of accessibility and sustainability considerations in AI interactions",
            "Strategies to build user trust and confidence in AI-powered interfaces"
        ],
        targetAudience: [
            "Product Designers looking to design better AI-powered interfaces",
            "UX Designers working on AI features and experiences",
            "Product Managers overseeing AI product development",
            "Design Leaders building AI strategy for their teams"
        ],
        prerequisites: [
            "Basic understanding of UX/UI design principles",
            "Some experience with digital product design",
            "Interest in AI and machine learning applications",
            "No specific AI technical knowledge required - focus is on design patterns",
            "Laptop with design tools (Figma, Sketch, or similar) for group exercises"
        ],
        phases: [
            {
                title: "State of AI in 2026 & Current Challenges",
                duration: "90 minutes",
                description: "Explore how people actually use AI products today, identify main pain points, and understand frequent challenges in AI UX",
                activities: [
                    "Review current AI product landscape and user behaviors",
                    "Analyze successful and failed AI interface examples",
                    "Identify common UX bottlenecks in AI interactions",
                    "Explore context awareness and capability discovery issues"
                ],
                concepts: [
                    "AI adoption patterns and user expectations",
                    "Chatbot UX limitations and alternatives",
                    "Context awareness challenges",
                    "Discoverability in AI interfaces"
                ]
            },
            {
                title: "Intent Articulation & Navigation Patterns",
                duration: "120 minutes",
                description: "Learn how to help users articulate intent and navigate AI output with advanced design patterns",
                activities: [
                    "Design style lenses for different output types",
                    "Create daemon patterns for proactive assistance",
                    "Implement temperature knobs for output control",
                    "Practice structured preset design"
                ],
                concepts: [
                    "Style lenses and output customization",
                    "Daemon patterns for proactive AI",
                    "Temperature controls and user agency",
                    "Structured presets and templates"
                ]
            },
            {
                title: "Lunch Break & Networking",
                duration: "60 minutes",
                description: "Enjoy lunch with fellow designers and continue discussions about AI UX challenges and solutions",
                activities: [
                    "Networking with other AI designers",
                    "Informal discussions about workshop topics",
                    "Q&A with the instructor",
                    "Sharing experiences from current projects"
                ],
                concepts: [
                    "Peer learning and experience sharing",
                    "Building design community connections",
                    "Real-world application discussions",
                    "Industry trend insights"
                ]
            },
            {
                title: "Dynamic AI Interfaces & Canvases",
                duration: "120 minutes",
                description: "Transform static AI output into dynamic interfaces with canvases, conversations, and navigation patterns",
                activities: [
                    "Design AI canvases for complex data exploration",
                    "Create conversation-to-canvas navigation flows",
                    "Implement clustering and tabbed views",
                    "Practice dynamic view switching patterns"
                ],
                concepts: [
                    "AI canvas design principles",
                    "Conversation-canvas integration",
                    "Clustering and data organization",
                    "Dynamic view management"
                ]
            },
            {
                title: "Agentic UX & Trust Building",
                duration: "90 minutes",
                description: "Design for agentic experiences, complex workflows, accessibility, and building user trust in AI systems",
                activities: [
                    "Design agentic workflows for complex tasks",
                    "Create accessibility patterns for AI interfaces",
                    "Develop trust-building interaction patterns",
                    "Practice sustainable AI design approaches"
                ],
                concepts: [
                    "Agentic UX design principles",
                    "Accessibility in AI interactions",
                    "Trust and confidence building",
                    "Sustainable AI interface design"
                ]
            },
            {
                title: "Group Design Exercise & Review",
                duration: "90 minutes",
                description: "Apply learned patterns in a practical group exercise, designing AI experiences on paper with peer review",
                activities: [
                    "Break into design groups for hands-on exercise",
                    "Apply workshop patterns to real design challenge",
                    "Create paper prototypes of AI interfaces",
                    "Present and review group solutions"
                ],
                concepts: [
                    "Practical pattern application",
                    "Collaborative design process",
                    "Rapid prototyping techniques",
                    "Peer feedback and iteration"
                ]
            },
            {
                title: "Wrap-up & Action Planning",
                duration: "30 minutes",
                description: "Consolidate learnings, plan next steps, and discuss how to apply patterns to current projects",
                activities: [
                    "Review key takeaways and patterns learned",
                    "Plan application to current projects",
                    "Exchange contacts with fellow participants",
                    "Get resources for continued learning"
                ],
                concepts: [
                    "Pattern synthesis and integration",
                    "Implementation planning",
                    "Continued learning resources",
                    "Community building"
                ]
            }
        ]
    };

    // Single source of truth for seats
    const totalSeats = 30;
    const seatsRemaining = totalSeats; // This would come from an API in a real implementation
    const isSoldOut = seatsRemaining <= 0;


    // Handle checkout with proper ticket selection
    const handleCheckout = async (priceId: string) => {
        try {
            await startCheckout({
                priceId,
                workshopId: workshop.id,
                ticketType: 'workshop',
                couponCode: couponCode,
            });
        } catch (error) {
            console.error('Checkout failed:', error);
        }
    };

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
                                <Brain size={18} className="text-white" />
                                <span className="font-bold text-xs sm:text-sm">Only {seatsRemaining} seats left!</span>
                            </div>
                            <div className="hidden sm:block h-6 w-px bg-white/30"></div>
                            
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-white" />
                                <span className="text-xs sm:text-sm">March 23rd, 2026</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
                            <div className="scale-75 sm:scale-100">
                                <CountdownTimer seatsRemaining={seatsRemaining} />
                            </div>
                            <button
                                onClick={scrollToRegistration}
                                className="bg-white text-zurich px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm hover:bg-gray-100 transition-colors whitespace-nowrap shadow-md"
                            >
                                Book Your Spot
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section - Redesigned */}
            <Section className="bg-js text-black relative overflow-hidden">{/* Custom padding handled inline */}
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points="0,100 30,80 50,90 80,70 100,85 100,100" fill="currentColor"/>
                        <polygon points="0,100 20,85 40,95 70,75 100,90 100,100" fill="currentColor" opacity="0.5"/>
                    </svg>
                </div>
                
                <div className="relative z-10">
                    {/* Back to workshops link */}
                    <div className="container mx-auto px-4 pt-6 pb-0">
                        <Link href="/workshops" className="inline-flex items-center text-black hover:underline text-sm font-medium">
                            <ChevronLeft size={16} className="mr-1"/>
                            Back to all workshops
                        </Link>
                    </div>

                    {/* Main hero content */}
                    <div className="container mx-auto px-4 py-12 lg:py-16">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                            {/* Left Column - Workshop Details */}
                            <div className="lg:col-span-7 order-1">
                                {/* Category pill */}
                                <div className="inline-flex items-center bg-black text-js px-4 py-2 rounded-full text-sm font-bold mb-6">
                                    🧠 AI Interface Design
                                </div>

                                {/* Workshop title */}
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-4 lg:mb-6 text-black leading-tight">
                                    Design Patterns For AI Interfaces In 2026
                                </h1>

                                {/* Subtitle */}
                                <p className="text-lg lg:text-xl text-gray-800 mb-8 lg:mb-10 leading-relaxed max-w-2xl">
                                    Master AI UX Design & Build Better User Experiences that go beyond chatbots
                                </p>

                                {/* Metadata cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 lg:mb-10">
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-2xl lg:text-3xl font-black text-black mb-1">23rd</div>
                                        <div className="text-xs lg:text-sm text-gray-600 font-medium">Mar 2026</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-sm lg:text-base font-bold text-black mb-1">09:00-17:00</div>
                                        <div className="text-xs lg:text-sm text-gray-600 font-medium">8 hours</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-sm lg:text-base font-bold text-blue-600 mb-1">Venue TBA</div>
                                        <div className="text-xs lg:text-sm text-gray-600 font-medium">Zürich</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-sm lg:text-base font-bold text-red-600 mb-1">{seatsRemaining} seats left</div>
                                        <div className="text-xs lg:text-sm text-gray-600 font-medium">of {workshop.maxAttendees}</div>
                                    </div>
                                </div>

                                {/* CTA Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 mb-8 lg:mb-12">
                                    <Button
                                        onClick={scrollToRegistration}
                                        className="bg-zurich text-white hover:bg-zurich/90 text-base lg:text-lg py-4 px-8 font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                                    >
                                        Book Your Spot
                                    </Button>
                                    <Button
                                        onClick={scrollToDetails}
                                        variant="outline"
                                        className="border-2 border-zurich text-zurich hover:bg-zurich hover:text-white text-base lg:text-lg py-4 px-8 font-bold transition-all duration-200"
                                    >
                                        Learn More
                                    </Button>
                                    {isClient && (
                                        <Button
                                            onClick={shareWorkshop}
                                            variant="outline"
                                        className="border-zurich text-zurich hover:bg-zurich hover:text-white p-4 transition-all duration-200 sm:w-auto"
                                        >
                                            <Share2 size={20} />
                                        </Button>
                                    )}
                                </div>

                                {/* What you'll learn - Mobile/Tablet */}
                                <div className="lg:hidden">
                                    <h3 className="text-lg font-bold text-black mb-4">What you&apos;ll learn:</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-3 bg-white/50 rounded-lg p-3">
                                            <div className="text-2xl">🎯</div>
                                            <span className="text-sm font-medium text-gray-800">Intent Articulation Patterns</span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/50 rounded-lg p-3">
                                            <div className="text-2xl">⚡</div>
                                            <span className="text-sm font-medium text-gray-800">Dynamic AI Interfaces</span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/50 rounded-lg p-3">
                                            <div className="text-2xl">🧠</div>
                                            <span className="text-sm font-medium text-gray-800">AI UX State & Challenges</span>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/50 rounded-lg p-3">
                                            <div className="text-2xl">🤝</div>
                                            <span className="text-sm font-medium text-gray-800">Agentic UX Design</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Speaker Card */}
                            <div className="lg:col-span-5 order-2 lg:order-2">
                                <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border-2 border-black/10 relative">
                                    {/* Speaker card header */}
                                    <div className="text-center mb-6">
                                        <div className="text-sm font-bold text-gray-600 mb-2">Workshop Instructor</div>
                                        
                                        {workshop.speakers.map((speaker) => (
                                            <div key={speaker.id}>
                                                {/* Speaker image */}
                                                <div className="relative mx-auto mb-6 w-32 h-32 lg:w-40 lg:h-40">
                                                    {/* Background glow effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-js/30 to-amber-300/30 rounded-full scale-110 blur-xl opacity-50"></div>
                                                    {/* Main image container */}
                                                    <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border-4 border-white bg-gradient-to-br from-gray-50 to-gray-100">
                                                        <Image
                                                            src={`${speaker.image}`}
                                                            alt={speaker.name}
                                                            width={160}
                                                            height={160}
                                                            className="w-full h-full object-cover object-center"
                                                        />
                                                    </div>
                                                    {/* Floating accent badge */}
                                                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-js to-amber-400 rounded-full w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center shadow-lg border-2 border-white">
                                                        <span className="text-lg lg:text-xl">🧠</span>
                                                    </div>
                                                </div>

                                                {/* Speaker info */}
                                                <div className="text-center mb-6">
                                                    <h4 className="text-2xl lg:text-3xl font-black text-black mb-3 leading-tight">
                                                        {speaker.name}
                                                    </h4>
                                                    <p className="text-sm lg:text-base text-gray-700 leading-relaxed px-2">
                                                        {speaker.title}
                                                    </p>
                                                </div>

                                                {/* Expertise tags */}
                                                <div className="flex flex-wrap gap-2 justify-center mb-6">
                                                    <span className="bg-js/10 text-black px-3 py-1 rounded-full text-xs font-semibold border border-js/20">UX Expert</span>
                                                    <span className="bg-js/10 text-black px-3 py-1 rounded-full text-xs font-semibold border border-js/20">AI Design</span>
                                                    <span className="bg-js/10 text-black px-3 py-1 rounded-full text-xs font-semibold border border-js/20">Design Patterns</span>
                                                </div>

                                                {/* Smashing Magazine branding */}
                                                <div className="text-center">
                                                    <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                                        <div className="w-6 h-6 bg-orange-500 rounded"></div>
                                                        <span className="text-xs font-semibold text-gray-700">Smashing Magazine</span>
                                                    </div>
                                                </div>

                                                {/* Speaker CTA */}
                                                <div className="mt-6">
                                                    <Link
                                                        href={`/speakers/${speaker.id}`}
                                                        className="block w-full text-center bg-black text-js px-6 py-3 rounded-lg font-semibold text-sm hover:bg-gray-900 transition-colors duration-200 shadow-md hover:shadow-lg"
                                                    >
                                                        View Full Speaker Profile →
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* What you'll learn - Desktop only */}
                        <div className="hidden lg:block mt-12 lg:mt-16">
                            <h3 className="text-2xl font-bold text-black mb-8 text-center">What you&apos;ll learn:</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                                <div className="text-center">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-black/10 hover:shadow-md transition-shadow duration-200">
                                        <div className="text-4xl mb-4">🎯</div>
                                        <h4 className="font-bold text-black mb-2">Intent Articulation</h4>
                                        <p className="text-sm text-gray-600">Style lenses, daemons, and temperature controls</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-black/10 hover:shadow-md transition-shadow duration-200">
                                        <div className="text-4xl mb-4">⚡</div>
                                        <h4 className="font-bold text-black mb-2">Dynamic Interfaces</h4>
                                        <p className="text-sm text-gray-600">Transform static AI output into dynamic UI</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-black/10 hover:shadow-md transition-shadow duration-200">
                                        <div className="text-4xl mb-4">🧠</div>
                                        <h4 className="font-bold text-black mb-2">AI UX Challenges</h4>
                                        <p className="text-sm text-gray-600">Understand current AI product limitations</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="bg-white rounded-xl p-6 shadow-sm border border-black/10 hover:shadow-md transition-shadow duration-200">
                                        <div className="text-4xl mb-4">🤝</div>
                                        <h4 className="font-bold text-black mb-2">Agentic UX Design</h4>
                                        <p className="text-sm text-gray-600">Build trust and confidence in AI systems</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Workshop Content Section - Redesigned */}
            <Section className="bg-white" padding="lg">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* Main Content - Left Column */}
                        <div className="lg:col-span-8">
                            {/* Timeline Component */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5}}
                                className="mb-12"
                            >
                                <HorizontalTimeline seatsRemaining={seatsRemaining} />
                            </motion.div>

                            {/* Workshop Overview */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5}}
                                className="mb-12"
                                id="what-youll-learn"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-6">
                                    Workshop Overview
                                </h2>
                                <div className="prose prose-lg max-w-none">
                                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                                        As product teams race to include AI in their products, they too often rely on good old-fashioned patterns like an assistant or chatbot. However, this experience is often painfully slow, responses are generic, and users have to meticulously explain to AI what they need — over and over.
                                    </p>
                                    <p className="text-gray-700 text-lg leading-relaxed">
                                        In this full-day workshop with <strong>Vitaly Friedman</strong>, senior UX consultant with the European Parliament and creative lead of Smashing Magazine, we&apos;ll explore brand new design patterns for better AI experiences, with daemons, clustering, style lenses, structured presets and templates, dynamic editing, temperature knobs and everything in-between!
                                    </p>
                                </div>
                            </motion.div>

                            {/* What You'll Learn Grid */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.2}}
                                className="mb-12"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-8">
                                    What You&apos;ll Learn
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-blue-100 p-3 rounded-xl shrink-0">
                                                <Brain className="text-blue-600" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-black mb-2">AI UX State & Challenges</h3>
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    Understand how people use AI products today, main slowdowns, context awareness, capabilities awareness, and discoverability challenges.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-amber-100 p-3 rounded-xl shrink-0">
                                                <Target className="text-amber-600" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-black mb-2">Intent Articulation Patterns</h3>
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    Learn style lenses, daemons, temperature knobs and other patterns to help users navigate AI output faster and more precisely.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-green-100 p-3 rounded-xl shrink-0">
                                                <Layers className="text-green-600" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-black mb-2">Dynamic AI Interfaces</h3>
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    Transform AI&apos;s static output into dynamic and proactive UI with canvases, conversations, clustering, and dynamic views.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-purple-100 p-3 rounded-xl shrink-0">
                                                <Users2 className="text-purple-600" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-black mb-2">Agentic UX Design</h3>
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    Design for agentic UX, support users in complex flows, consider accessibility, sustainability, and build trust in AI interfaces.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Workshop Structure */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.4}}
                                className="mb-12"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-8">
                                    Workshop Structure
                                </h2>
                                <div className="space-y-4">
                                    {workshop.phases.map((phase, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 mt-1">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                                                        <h3 className="text-lg font-bold text-black">{phase.title}</h3>
                                                        <span className="text-sm text-gray-500 font-medium">{phase.duration}</span>
                                                    </div>
                                                    <p className="text-gray-600 text-sm leading-relaxed">
                                                        {phase.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Key Takeaways */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.6}}
                                className="mb-12"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-8">
                                    Key Takeaways
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {workshop.takeaways.map((takeaway, index) => (
                                        <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <div className="bg-js text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                {index + 1}
                                            </div>
                                            <p className="text-gray-700 text-sm leading-relaxed">{takeaway}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Registration Sidebar - Right Column */}
                        <div className="lg:col-span-4">
                            <div className="lg:sticky lg:top-24">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5 }}
                                    id="registrationContainer"
                                    className="space-y-6"
                                >
                                    {/* Login Incentive for Non-Members */}
                                    {!isSignedIn && (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <Users className="w-5 h-5 text-white" />
                                            </div>
                                                    <div className="flex-1">
                                                    <h4 className="font-bold text-green-900">🎉 Community Member Discount!</h4>
                                                    <p className="text-sm text-green-700 mt-1">
                                                        Sign in to unlock your <strong>20% community discount</strong> on workshop tickets
                                                    </p>
                                                            </div>
                                                <a
                                                    href={`/sign-in?redirect=${encodeURIComponent(router.asPath)}`}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                                                >
                                                    Sign In
                                                </a>
                                                </div>
                                            </div>
                                        )}

                                    {/* Community Discount Applied Banner */}
                                    {communityDiscount && (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white font-bold">✓</span>
                                                    </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-green-900">Community Discount Applied!</h4>
                                                    <p className="text-sm text-green-700 mt-1">
                                                        You&apos;re saving <strong>20%</strong> as a ZurichJS community member
                                                    </p>
                                                    </div>
                                                </div>
                                                    </div>
                                                )}

                                    {/* Cancelled Checkout Feedback */}
                                    {canceled === 'true' && (
                                        <CancelledCheckout 
                                            workshopId={workshop.id}
                                            workshopTitle={workshop.title}
                                        />
                                    )}

                                    {/* Ticket Selection Component */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className={`${isSoldOut ? 'bg-red-500' : 'bg-zurich'} text-white px-4 py-2`}>
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                {isSoldOut && <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">SOLD OUT</span>}
                                                {!isSoldOut && <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">{seatsRemaining} SEATS LEFT</span>}
                                                <span>Workshop Registration</span>
                                                    </div>
                                                </div>
                                                
                                        <div className="p-4">
                                            <TicketSelection
                                                options={aiDesignPatternsTickets}
                                                onCheckout={handleCheckout}
                                                workshopId={workshop.id}
                                                ticketType="workshop"
                                                className="space-y-4"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* FAQ Section */}
            <Section className="bg-gray-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-4xl mx-auto"
                >
                    <h2 className="text-3xl lg:text-4xl font-black text-black mb-8 text-center">
                        Frequently Asked Questions
                    </h2>
                    
                    <div className="space-y-4">
                        {/* Who Should Attend */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'audience' ? null : 'audience')}
                                aria-expanded={openFaq === 'audience'}
                            >
                                <span className="font-bold text-lg text-gray-900">Who should attend this workshop?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'audience' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'audience' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <div className="space-y-3 mb-4">
                                        {workshop.targetAudience.map((audience, index) => (
                                            <div key={index} className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                                                <Lightbulb className="text-blue-600 flex-shrink-0" size={20} />
                                                <p className="font-medium text-gray-800 text-sm">{audience}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-gray-800">
                                            <span className="text-blue-600 font-bold">Perfect for:</span> Anyone designing AI-powered products who wants to move beyond basic chatbot patterns to create truly helpful and efficient AI experiences.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prerequisites */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'prerequisites' ? null : 'prerequisites')}
                                aria-expanded={openFaq === 'prerequisites'}
                            >
                                <span className="font-bold text-lg text-gray-900">What are the prerequisites and requirements?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'prerequisites' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'prerequisites' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <div className="mb-4">
                                        <h4 className="text-base font-bold text-gray-800 mb-3">Knowledge Prerequisites:</h4>
                                        <div className="space-y-2">
                                            {workshop.prerequisites.map((prerequisite, index) => (
                                                <div key={index} className="flex items-start">
                                                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 mr-2">
                                                        <span className="text-blue-700 font-bold text-xs">{index + 1}</span>
                                                    </div>
                                                    <p className="text-gray-700 text-sm">{prerequisite}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-gray-800">
                                            <span className="text-blue-600 font-bold">Note:</span> This is a full-day intensive workshop. Bring your laptop with design tools and come ready for hands-on learning and collaboration!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* What's Included */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'included' ? null : 'included')}
                                aria-expanded={openFaq === 'included'}
                            >
                                <span className="font-bold text-lg text-gray-900">What&apos;s included in the workshop?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'included' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'included' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2">✓</span>
                                                <span className="text-gray-700">8 hours of hands-on training with Vitaly Friedman</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2">✓</span>
                                                <span className="text-gray-700">Workshop materials and comprehensive handouts</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2">✓</span>
                                                <span className="text-gray-700">Lunch and refreshments throughout the day</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2">✓</span>
                                                <span className="text-gray-700">Follow-up resources and continued learning materials</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2">✓</span>
                                                <span className="text-gray-700">Access to exclusive AI design pattern library</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2">✓</span>
                                                <span className="text-gray-700">Group exercises and practical design challenges</span>
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-500 mr-2">✓</span>
                                                <span className="text-gray-700">Networking opportunities with fellow designers</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Group Discounts */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'discounts' ? null : 'discounts')}
                                aria-expanded={openFaq === 'discounts'}
                            >
                                <span className="font-bold text-lg text-gray-900">Are there team discounts and invoicing available?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'discounts' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'discounts' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <p className="text-gray-700 mb-4">Yes! We offer team discounts and can provide invoicing for corporate bookings:</p>
                                    <div className="space-y-3">
                                        <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">15% off</span>
                                                <span className="text-gray-700">for teams of 3-4 people</span>
                                            </div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">25% off</span>
                                                <span className="text-gray-700">for teams of 5+ people</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold">Need invoicing or have questions about team bookings?</span> Please reach out to us at <a href="mailto:hello@zurichjs.com" className="text-zurich underline">hello@zurichjs.com</a> and we&apos;ll be happy to help!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Student/Unemployed Discount */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'student' ? null : 'student')}
                                aria-expanded={openFaq === 'student'}
                            >
                                <span className="font-bold text-lg text-gray-900">Do you offer student or unemployed discounts?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'student' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'student' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <p className="text-gray-700 mb-4">
                                        Yes! We offer special pricing for students and unemployed individuals to make our workshops more accessible.
                                    </p>
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold text-yellow-800">How to apply:</span> Send proof of your student status (student ID, enrollment certificate) or unemployment status (official documentation) to <a href="mailto:hello@zurichjs.com" className="text-zurich underline">hello@zurichjs.com</a> and we&apos;ll provide you with specialized pricing information.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Workshop Duration */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'duration' ? null : 'duration')}
                                aria-expanded={openFaq === 'duration'}
                            >
                                <span className="font-bold text-lg text-gray-900">How long is the workshop?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'duration' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'duration' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <p className="text-gray-700 mb-3">
                                        The workshop is a full-day intensive experience running from <strong>09:00 to 17:00</strong> (8 hours total) on March 23rd, 2026.
                                    </p>
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold text-yellow-800">Schedule includes:</span> Regular breaks, a 60-minute lunch break, and networking time. If you require any special accommodations, please reach out to us at <a href="mailto:hello@zurichjs.com" className="text-zurich underline">hello@zurichjs.com</a>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Venue */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'venue' ? null : 'venue')}
                                aria-expanded={openFaq === 'venue'}
                            >
                                <span className="font-bold text-lg text-gray-900">Where will the workshop take place?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'venue' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'venue' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <p className="text-gray-700 mb-3">
                                        The workshop will be held in Zürich, Switzerland. The exact venue will be announced closer to the event date.
                                    </p>
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold">Venue features:</span> Wheelchair accessible, modern presentation facilities, comfortable seating, and reliable WiFi. All registered participants will receive detailed venue information and directions 1 week before the workshop.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Refund Policy */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'refund' ? null : 'refund')}
                                aria-expanded={openFaq === 'refund'}
                            >
                                <span className="font-bold text-lg text-gray-900">What&apos;s the refund policy?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'refund' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'refund' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <p className="text-gray-700 mb-4">
                                        Please review our complete refund policy for all terms and conditions regarding workshop cancellations and refunds.
                                    </p>
                                    <div className="bg-blue-50 border-l-4 border-zurich p-4 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold text-zurich">Full details:</span> <Link href="/policies/refund-policy" className="text-zurich underline hover:text-zurich/80 transition-colors">View our refund policy</Link>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </Section>

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
                    <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6 max-w-2xl mx-auto border border-white/20">
                        <div className="flex justify-center mb-4">
                            <CountdownTimer seatsRemaining={seatsRemaining} />
                        </div>
                        <p className="text-white/90 text-lg mb-4">
                            Master AI interface design with hands-on patterns and expert guidance
                        </p>
                        <div className="flex items-center justify-center gap-4 text-white/70 text-sm">
                            <span className="flex items-center gap-1">
                                <Brain size={16} />
                                Only {seatsRemaining} seats left
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Calendar size={16} />
                                March 23rd, 2026
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock size={16} />
                                Full Day
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={scrollToRegistration}
                        className="bg-yellow-500 text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg hover:-translate-y-1"
                    >
                        Secure Your Spot Now
                    </button>
                </motion.div>
            </Section>
        </PageLayout>
    );
}

export async function getStaticProps() {
    // For now, we'll use a placeholder speaker ID until the actual speaker data is available
    const speakerIds = ['vitaly-friedman']; // This should be replaced with the actual speaker ID when available
    const speakers = await getSpeakersByIds(speakerIds);

    // For now, return mock speaker data if no speakers are found
    if (!speakers || speakers.length === 0) {
        return {
            props: {
                speakers: [{
                    id: 'vitaly-friedman',
                    name: 'Vitaly Friedman',
                    title: 'Creative Lead at Smashing Magazine & Senior UX Consultant',
                    image: '/images/speakers/vitaly-friedman.jpg', // Placeholder image
                    bio: 'Vitaly Friedman is a creative lead and co-founder of Smashing Magazine, as well as a senior UX consultant with the European Parliament. He has been working on AI interface design patterns and has extensive experience in creating better user experiences for AI-powered products.',
                }]
            },
            revalidate: 60,
        };
    }

    return {
        props: {
            speakers,
        },
        revalidate: 60, // Revalidate the page every 60 seconds
    };
}