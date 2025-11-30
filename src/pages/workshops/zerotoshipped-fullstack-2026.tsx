import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Share2, ChevronLeft, Zap, Code, Rocket, CheckCircle, Server, TestTube, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

import PageLayout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import CancelledCheckout from '@/components/workshop/CancelledCheckout';
import TicketSelection from '@/components/workshop/TicketSelection';
import { zeroToShippedTickets } from '@/components/workshop/zeroToShippedTickets';
import { useAuthenticatedCheckout } from '@/hooks/useAuthenticatedCheckout';
import { useCoupon } from '@/hooks/useCoupon';
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
    includedMaterials: string[];
    afterWorkshop: string[];
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

// --- Countdown Component ---
function CountdownTimer() {
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
      const workshopStart = new Date('2026-02-26T14:00:00').getTime();

      const difference = workshopStart - now;

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
  }, []);

  if (!isClient) return null;

  const now = new Date().getTime();
  const workshopStart = new Date('2026-02-26T14:00:00').getTime();

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

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


export default function ZeroToShippedWorkshopPage({ speakers }: WorkshopPageProps) {

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
        id: "zerotoshipped-fullstack-2026",
        title: "ZeroToShipped Fullstack",
        subtitle: "Ship a Vertical Slice from Idea to Deployment",
        dateInfo: "February 26, 2026",
        timeInfo: "14:00 - 18:00 (4 hours)",
        locationInfo: "Venue TBA, Zurich",
        price: "CHF 495",
        description: "Cut through the noise and ship a vertical slice from idea to deployment with ruthless prioritisation. Ship a production-ready app as a team. We focus on ruthless prioritisation, developer experience, and reliable deployments.",
        maxAttendees: 10,
        speakers: speakers,
        topics: [
            {
                title: "Prioritise the Slice",
                description: "Define the smallest valuable release, map dependencies, and agree on success signals with stakeholders.",
                icon: <CheckCircle className="text-zurich" size={24} />
            },
            {
                title: "Build the Vertical",
                description: "Hands-on implementation pairing through frontend, backend, and deployment layers.",
                icon: <Code className="text-zurich" size={24} />
            },
            {
                title: "Ship and Learn",
                description: "Close the loop with playbooks that turn demos, QA, and retros into rituals.",
                icon: <Rocket className="text-zurich" size={24} />
            }
        ],
        takeaways: [
            "Translate product goals into a scoped release plan that is honest about constraints",
            "Stand up a DX-first stack with linting, formatting, type-safety, and useful CI from day one",
            "Ship an MVP slice with auth, database, and background jobs without over-stretching the team"
        ],
        targetAudience: [
            "Cross-functional squads kicking off a new product",
            "Teams rebuilding a core flow"
        ],
        prerequisites: [
            "Comfortable with TypeScript and modern frontend tooling"
        ],
        includedMaterials: [
            "Project starter repo with batteries included for linting, testing, and deployment",
            "Scope planning worksheet with prioritisation rubric",
            "Retro and demo templates to reuse with the wider team"
        ],
        afterWorkshop: [
            "One follow-up pairing session to review progress on the next release",
            "Async backlog review with annotations on future bets versus experiments"
        ],
        phases: [
            {
                title: "Prioritise the slice",
                duration: "45 min",
                description: "Define the smallest valuable release, map dependencies, and agree on success signals with stakeholders.",
                activities: [
                    "Narrating the product story in customer language",
                    "Feature slicing and ruthless backlog pruning",
                    "Risk register for technical debt you intentionally accept"
                ],
                concepts: [
                    "Create a living checklist for releases, demos, and handover so momentum keeps building after the workshop"
                ]
            },
            {
                title: "Build the vertical",
                duration: "105 min",
                description: "Hands-on implementation pairing through frontend, backend, and deployment layers.",
                activities: [
                    "Setting up shared tooling (lint, tests, formatting, preview environments)",
                    "Implementing auth and permissions fast but safely",
                    "Deploying via platform of choice with observability toggled on"
                ],
                concepts: [
                    "DX-first development",
                    "Auth and permissions patterns",
                    "Observability from day one"
                ]
            },
            {
                title: "Ship and learn",
                duration: "60 min",
                description: "Close the loop with playbooks that turn demos, QA, and retros into rituals.",
                activities: [
                    "Release checklist automation",
                    "Product demo storytelling and stakeholder syncs",
                    "Retro templates that drive the next sprint"
                ],
                concepts: [
                    "Continuous delivery mindset",
                    "Stakeholder communication",
                    "Iterative improvement"
                ]
            }
        ]
    };

    // Single source of truth for seats
    const totalSeats = 10;
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
                    image: `/api/og/workshop?title=${encodeURIComponent(workshop.title)}&subtitle=${encodeURIComponent(workshop.subtitle)}&speakerName=${encodeURIComponent(workshop.speakers.map(s => s.name).join(' & '))}&speakerImage=${encodeURIComponent(workshop.speakers[0]?.image || '')}&workshopId=${encodeURIComponent(workshop.id)}`,
                    url: `/workshops/${workshop.id}`
                }}
            />

            {/* Sticky Info Banner */}
            <div className="sticky top-0 z-30 bg-zurich text-white shadow-lg">
                <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <Zap size={18} className="text-white" />
                                <span className="font-bold text-xs sm:text-sm">Only {seatsRemaining} seats left!</span>
                            </div>
                            <div className="hidden sm:block h-6 w-px bg-white/30"></div>

                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-white" />
                                <span className="text-xs sm:text-sm">February 26th, 2026</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
                            <div className="scale-75 sm:scale-100">
                                <CountdownTimer />
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

            {/* Hero Section */}
            <Section className="bg-js text-black relative overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points="0,100 30,80 50,90 80,70 100,85 100,100" fill="currentColor"/>
                        <polygon points="0,100 20,85 40,95 70,75 100,90 100,100" fill="currentColor" opacity="0.5"/>
                    </svg>
                </div>

                <div className="relative z-0">
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
                                    <Zap size={16} className="mr-2" /> Fullstack Development
                                </div>

                                {/* Duration badge */}
                                <div className="inline-flex items-center bg-white text-black px-4 py-2 rounded-full text-sm font-bold mb-6 ml-2">
                                    4 HOURS
                                </div>

                                {/* Workshop title */}
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-4 lg:mb-6 text-black leading-tight">
                                    {workshop.title}
                                </h1>

                                {/* Subtitle */}
                                <p className="text-lg lg:text-xl text-gray-800 mb-8 lg:mb-10 leading-relaxed max-w-2xl">
                                    Cut through the noise and ship a vertical slice from idea to deployment with ruthless prioritisation.
                                </p>

                                {/* Metadata cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 lg:mb-10">
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-2xl lg:text-3xl font-black text-black mb-1">26th</div>
                                        <div className="text-xs lg:text-sm text-gray-600 font-medium">Feb 2026</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-sm lg:text-base font-bold text-black mb-1">14:00-18:00</div>
                                        <div className="text-xs lg:text-sm text-gray-600 font-medium">4 hours</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-sm lg:text-base font-bold text-blue-600 mb-1">Venue TBA</div>
                                        <div className="text-xs lg:text-sm text-gray-600 font-medium">Zurich</div>
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
                                    <h3 className="text-lg font-bold text-black mb-4">What you&apos;ll walk away with:</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {workshop.takeaways.map((takeaway, index) => (
                                            <div key={index} className="flex items-center gap-3 bg-white/50 rounded-lg p-3">
                                                <div className="text-2xl">
                                                    {index === 0 ? '🎯' : index === 1 ? '⚡' : '🚀'}
                                                </div>
                                                <span className="text-sm font-medium text-gray-800">{takeaway.split(' ').slice(0, 6).join(' ')}...</span>
                                            </div>
                                        ))}
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
                                                        <span className="text-lg lg:text-xl"><Zap size={20} /></span>
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
                                                    <span className="bg-js/10 text-black px-3 py-1 rounded-full text-xs font-semibold border border-js/20">Fullstack</span>
                                                    <span className="bg-js/10 text-black px-3 py-1 rounded-full text-xs font-semibold border border-js/20">TypeScript</span>
                                                    <span className="bg-js/10 text-black px-3 py-1 rounded-full text-xs font-semibold border border-js/20">DevOps</span>
                                                </div>

                                                {/* Speaker CTA */}
                                                <div className="mt-6">
                                                    <Link
                                                        href={`/speakers/${speaker.id}`}
                                                        className="block w-full text-center bg-black text-js px-6 py-3 rounded-lg font-semibold text-sm hover:bg-gray-900 transition-colors duration-200 shadow-md hover:shadow-lg"
                                                    >
                                                        View Full Speaker Profile
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
                            <h3 className="text-2xl font-bold text-black mb-8 text-center">What your team walks away with:</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                                {workshop.takeaways.map((takeaway, index) => (
                                    <div key={index} className="text-center">
                                        <div className="bg-white rounded-xl p-6 shadow-sm border border-black/10 hover:shadow-md transition-shadow duration-200">
                                            <div className="text-4xl mb-4">
                                                {index === 0 ? '🎯' : index === 1 ? '⚡' : '🚀'}
                                            </div>
                                            <p className="text-sm text-gray-700">{takeaway}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Workshop Content Section */}
            <Section className="bg-white" padding="lg">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                        {/* Main Content - Left Column */}
                        <div className="lg:col-span-8">
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
                                        Teams often drown in choices when starting new products. This workshop compresses my zero-to-one playbook into a guided sprint so your team can replicate it with confidence.
                                    </p>
                                    <p className="text-gray-700 text-lg leading-relaxed">
                                        We build a vertical slice together, wire up CI/CD, and implement pragmatic QA so stakeholders trust the release.
                                    </p>
                                </div>
                            </motion.div>

                            {/* Quick Facts */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.1}}
                                className="mb-12"
                            >
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <h3 className="text-xl font-bold text-black mb-4">Quick Facts</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-start gap-3">
                                            <Clock className="text-zurich mt-1" size={20} />
                                            <div>
                                                <div className="font-semibold text-black">Duration</div>
                                                <div className="text-gray-600 text-sm">4 hours (ideal as an intense half-day sprint)</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Users className="text-zurich mt-1" size={20} />
                                            <div>
                                                <div className="font-semibold text-black">Group Size</div>
                                                <div className="text-gray-600 text-sm">Up to 10 participants including designer or PM</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Server className="text-zurich mt-1" size={20} />
                                            <div>
                                                <div className="font-semibold text-black">Format</div>
                                                <div className="text-gray-600 text-sm">Pair programming + product coaching with rotating driver/navigator roles</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Shield className="text-zurich mt-1" size={20} />
                                            <div>
                                                <div className="font-semibold text-black">Prerequisites</div>
                                                <div className="text-gray-600 text-sm">Comfortable with TypeScript and modern frontend tooling</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Ideal For */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.15}}
                                className="mb-12"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-6">
                                    Ideal For
                                </h2>
                                <div className="space-y-3">
                                    {workshop.targetAudience.map((audience, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-blue-50 rounded-lg p-4">
                                            <CheckCircle className="text-blue-600 flex-shrink-0" size={20} />
                                            <p className="font-medium text-gray-800">{audience}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Workshop Flow */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.2}}
                                className="mb-12"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-8">
                                    Workshop Flow
                                </h2>
                                <div className="space-y-6">
                                    {workshop.phases.map((phase, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-js text-black rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shrink-0 mt-1">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                                                        <h3 className="text-xl font-bold text-black">{phase.title}</h3>
                                                        <span className="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium mt-2 sm:mt-0">
                                                            {phase.duration}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 mb-4">
                                                        {phase.description}
                                                    </p>
                                                    <ul className="space-y-2">
                                                        {phase.activities.map((activity, actIndex) => (
                                                            <li key={actIndex} className="flex items-start gap-2 text-sm text-gray-700">
                                                                <span className="text-js mt-1">•</span>
                                                                {activity}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Included Materials */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.3}}
                                className="mb-12"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-6">
                                    Included Materials
                                </h2>
                                <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                                    <ul className="space-y-3">
                                        {workshop.includedMaterials.map((material, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <span className="text-green-500 mt-1">
                                                    <CheckCircle size={18} />
                                                </span>
                                                <span className="text-gray-700">{material}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>

                            {/* After the Workshop */}
                            <motion.div
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: 0.4}}
                                className="mb-12"
                            >
                                <h2 className="text-3xl lg:text-4xl font-black text-black mb-6">
                                    After the Workshop
                                </h2>
                                <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                                    <ul className="space-y-3">
                                        {workshop.afterWorkshop.map((item, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <span className="text-purple-500 mt-1">
                                                    <Rocket size={18} />
                                                </span>
                                                <span className="text-gray-700">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
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
                                                    <h4 className="font-bold text-green-900">Community Member Discount!</h4>
                                                    <p className="text-sm text-green-700 mt-1">
                                                        Sign in to unlock your <strong>20% community discount</strong> on workshop tickets
                                                    </p>
                                                            </div>
                                                <Link
                                                    href="/workshops/zerotoshipped-fullstack-2026?signup=true"
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                                                >
                                                    Sign In
                                                </Link>
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
                                                options={zeroToShippedTickets}
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
                                                <TestTube className="text-blue-600 flex-shrink-0" size={20} />
                                                <p className="font-medium text-gray-800 text-sm">{audience}</p>
                                            </div>
                                        ))}
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
                                <span className="font-bold text-lg text-gray-900">What are the prerequisites?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'prerequisites' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'prerequisites' && (
                                <div className="px-6 pb-6 animate-fadeIn">
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
                                        The workshop is an intensive half-day experience running from <strong>14:00 to 18:00</strong> (4 hours) on February 26th, 2026.
                                    </p>
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold text-yellow-800">Ideal as:</span> An intense half-day sprint for teams ready to ship.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Team Discounts */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenFaq(openFaq === 'discounts' ? null : 'discounts')}
                                aria-expanded={openFaq === 'discounts'}
                            >
                                <span className="font-bold text-lg text-gray-900">Are there team discounts available?</span>
                                <span className={`ml-4 transition-transform ${openFaq === 'discounts' ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>
                            {openFaq === 'discounts' && (
                                <div className="px-6 pb-6 animate-fadeIn">
                                    <p className="text-gray-700 mb-4">Yes! We offer team discounts:</p>
                                    <div className="space-y-3">
                                        <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">10% off</span>
                                                <span className="text-gray-700">for teams of 3 or more</span>
                                            </div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">20% off</span>
                                                <span className="text-gray-700">for teams of 5 or more</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 bg-blue-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            Contact us at <a href="mailto:hello@zurichjs.com" className="text-zurich underline">hello@zurichjs.com</a> for team bookings and invoicing.
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
                                        Please review our complete refund policy for all terms and conditions.
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
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ready to Ship?</h2>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6 max-w-2xl mx-auto border border-white/20">
                        <div className="flex justify-center mb-4">
                            <CountdownTimer />
                        </div>
                        <p className="text-white/90 text-lg mb-4">
                            Build and deploy a production-ready vertical slice in just 4 hours
                        </p>
                        <div className="flex items-center justify-center gap-4 text-white/70 text-sm">
                            <span className="flex items-center gap-1">
                                <Zap size={16} />
                                Only {seatsRemaining} seats
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Calendar size={16} />
                                Feb 26th, 2026
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock size={16} />
                                4 Hours
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={scrollToRegistration}
                        className="bg-yellow-500 text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-lg hover:-translate-y-1"
                    >
                        Book Your Spot
                    </button>
                </motion.div>
            </Section>
        </PageLayout>
    );
}

export async function getStaticProps() {
    const speakerIds = ['kitze'];
    const speakers = await getSpeakersByIds(speakerIds);

    // Return mock speaker data if no speakers are found
    if (!speakers || speakers.length === 0) {
        return {
            props: {
                speakers: [{
                    id: 'kitze',
                    name: 'Kitze',
                    title: 'Fullstack Developer & Product Coach',
                    image: '/images/speakers/kitze.jpg',
                    bio: 'Expert in building and shipping production-ready applications with modern fullstack technologies.',
                }]
            },
            revalidate: 60,
        };
    }

    return {
        props: {
            speakers,
        },
        revalidate: 60,
    };
}
