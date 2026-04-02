import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Share2, ChevronLeft, Brain, Cpu, Zap, GitBranch, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

import PageLayout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import CancelledCheckout from '@/components/workshop/CancelledCheckout';
import { reliableAiAgentsTickets } from '@/components/workshop/reliableAiAgentsTickets';
import TicketSelection from '@/components/workshop/TicketSelection';
import { useAuthenticatedCheckout } from '@/hooks/useAuthenticatedCheckout';
import { useCoupon } from '@/hooks/useCoupon';
import useEvents from '@/hooks/useEvents';
import { getSpeakersByIds } from '@/sanity/queries';
import { Speaker } from '@/types';

interface WorkshopPageProps {
    speakers: Speaker[];
}

export default function ReliableAiAgentsWorkshopPage({ speakers }: WorkshopPageProps) {
    const { track } = useEvents();
    const router = useRouter();
    const { canceled } = router.query;

    const { startCheckout } = useAuthenticatedCheckout({
        onError: (error) => {
            console.error('Checkout error:', error);
        },
    });
    const { couponCode } = useCoupon();

    const [openFaq, setOpenFaq] = useState<string | null>(null);

    const workshopId = 'reliable-ai-agents';
    const workshopTitle = 'How to Build Reliable AI Agents';
    const workshopSubtitle = 'From Simple LLM Interactions to Production-Ready AI Workflows';
    const workshopDate = 'April 21, 2026';
    const workshopTime = '17:00 - 18:30 (1.5 hours)';
    const workshopLocation = 'Smallpdf AG, Zürich';
    const totalSeats = 20;
    const seatsRemaining = 15;
    const isSoldOut = seatsRemaining <= 0;

    const topics = [
        {
            title: 'What AI Agents Are',
            description: 'Understand what distinguishes AI agents from simple LLM applications and why that distinction matters.',
            icon: <Brain className="text-violet-600" size={24} />,
        },
        {
            title: 'Tool Calling',
            description: 'Learn how to connect agents to external systems and APIs through tool calling patterns.',
            icon: <Zap className="text-amber-600" size={24} />,
        },
        {
            title: 'Agent Loops',
            description: 'Understand how agent loops and task execution flows drive autonomous behaviour.',
            icon: <GitBranch className="text-blue-600" size={24} />,
        },
        {
            title: 'Context Management',
            description: 'Explore context and memory management strategies that keep agents on track across long tasks.',
            icon: <Cpu className="text-green-600" size={24} />,
        },
        {
            title: 'Human-in-the-Loop',
            description: 'Design safer systems using human-in-the-loop approval patterns at the right decision points.',
            icon: <Shield className="text-red-600" size={24} />,
        },
        {
            title: 'Reliability Challenges',
            description: 'Identify and address the common reliability pitfalls when moving agents from demo to production.',
            icon: <AlertCircle className="text-orange-600" size={24} />,
        },
        {
            title: 'Evaluation & Improvement',
            description: 'Learn how to evaluate agent behaviour and iterate toward more predictable, robust systems.',
            icon: <CheckCircle className="text-teal-600" size={24} />,
        },
        {
            title: 'Production Design Patterns',
            description: 'Practical patterns for designing production-minded AI agents that do more than just look impressive in a demo.',
            icon: <Brain className="text-purple-600" size={24} />,
        },
    ];

    const takeaways = [
        'Understand the key building blocks of AI agents',
        'Know how tool calling, loops, and context handling fit together',
        'Recognise the main challenges involved in building reliable agents',
        'Learn practical patterns for designing safer, more robust AI workflows',
        'Leave with a clearer mental model for building production-ready AI agents',
    ];

    const targetAudience = [
        'Software developers experimenting with LLMs',
        'Technical leads looking to move toward agentic workflows',
        'Builders who want to understand how modern AI agents work',
        'Developers seeking practical, production-minded AI design patterns',
    ];

    const prerequisites = [
        'Comfortable with general software development concepts',
        'Some familiarity with APIs and modern application development',
        'Prior experience with LLMs or AI tooling is helpful but not required',
    ];

    const phases = [
        {
            title: 'Introduction to AI Agents',
            duration: '15 minutes',
            description: 'Establish a shared understanding of what AI agents are and how they differ from simple LLM applications.',
            activities: [
                'The spectrum from prompt to agent',
                'Why reliability is hard',
                'Overview of the session',
            ],
            concepts: [
                'LLM applications vs agents',
                'Autonomy and decision-making',
                'Agentic workflows',
            ],
        },
        {
            title: 'Tool Calling & External Systems',
            duration: '20 minutes',
            description: 'Hands-on look at how agents call tools and connect to external APIs and data sources.',
            activities: [
                'Defining and registering tools',
                'Handling tool outputs and errors',
                'Composing multiple tools',
            ],
            concepts: [
                'Function calling',
                'Tool schemas',
                'Error propagation',
            ],
        },
        {
            title: 'Agent Loops & Context Management',
            duration: '20 minutes',
            description: 'Explore how agent loops drive task execution and how to manage context effectively across turns.',
            activities: [
                'Implementing a basic agent loop',
                'Context window strategies',
                'Memory and state patterns',
            ],
            concepts: [
                'ReAct pattern',
                'Context pruning',
                'Short vs long-term memory',
            ],
        },
        {
            title: 'Human-in-the-Loop & Reliability',
            duration: '20 minutes',
            description: 'Design patterns for safer agents and practical strategies for improving reliability in production.',
            activities: [
                'Adding approval checkpoints',
                'Handling agent failures gracefully',
                'Common reliability pitfalls',
            ],
            concepts: [
                'Human oversight patterns',
                'Fallback strategies',
                'Idempotency and retries',
            ],
        },
        {
            title: 'Evaluation & Production Patterns',
            duration: '15 minutes',
            description: 'Round up with evaluation techniques and design patterns for taking agents to production.',
            activities: [
                'Evaluating agent behaviour',
                'Logging and observability for agents',
                'Q&A with Davy',
            ],
            concepts: [
                'Agent evals',
                'Tracing agentic systems',
                'Production readiness checklist',
            ],
        },
    ];

    const faqs = [
        {
            id: 'level',
            question: 'Is this workshop beginner-friendly?',
            answer: 'The workshop is designed for developers who are comfortable with general software development. Prior experience with LLMs is helpful but not strictly required — Davy will cover the core concepts from the ground up.',
        },
        {
            id: 'hands-on',
            question: 'How hands-on is the workshop?',
            answer: 'The session is practical and example-driven. You will follow along with code examples and real-world design patterns rather than purely theory.',
        },
        {
            id: 'refund',
            question: 'What is the refund policy?',
            answer: 'Tickets are non-refundable but can be transferred to another attendee. Please contact us at hello@zurichjs.com if you need to make changes.',
        },
        {
            id: 'recording',
            question: 'Will the workshop be recorded?',
            answer: 'The workshop is in-person only and will not be recorded. This ensures a more interactive and focused experience for all participants.',
        },
    ];

    const handleCheckout = async (priceId: string) => {
        try {
            await startCheckout({
                priceId,
                workshopId,
                ticketType: 'workshop',
                couponCode: couponCode,
            });
        } catch (error) {
            console.error('Checkout failed:', error);
        }
    };

    const scrollToRegistration = useCallback(() => {
        track('workshop_registration_button_clicked', {
            workshop_id: workshopId,
            workshop_title: workshopTitle,
        });

        const registrationSection = document.getElementById('registrationContainer');
        registrationSection?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, [track, workshopId, workshopTitle]);

    const scrollToDetails = useCallback(() => {
        track('workshop_details_button_clicked', {
            workshop_id: workshopId,
            workshop_title: workshopTitle,
        });

        const section = document.getElementById('what-youll-learn');
        if (section) {
            const elementPosition = section.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({ top: elementPosition - 100, behavior: 'smooth' });
        }
    }, [track, workshopId, workshopTitle]);

    useEffect(() => {
        track('workshop_page_viewed', {
            workshop_id: workshopId,
            workshop_title: workshopTitle,
        });

        if (typeof window !== 'undefined') {
            const style = document.createElement('style');
            style.textContent = `
                body, html { overflow-x: hidden; max-width: 100%; }
                ::-webkit-scrollbar-horizontal { display: none; }
            `;
            document.head.appendChild(style);
        }
    }, [track]);

    const shareWorkshop = async () => {
        const shareUrl = `${window.location.origin}/workshops/${workshopId}`;
        const shareText = `Join me at ${workshopTitle} with ZurichJS!`;

        track('workshop_share_clicked', { workshop_id: workshopId, workshop_title: workshopTitle });

        if (navigator.share) {
            try {
                await navigator.share({ title: workshopTitle, text: shareText, url: shareUrl });
                track('workshop_share_completed', { workshop_id: workshopId, share_method: 'native' });
            } catch {
                navigator.clipboard.writeText(shareUrl);
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            track('workshop_share_completed', { workshop_id: workshopId, share_method: 'clipboard' });
        }
    };

    const speaker = speakers[0];

    return (
        <PageLayout>
            <SEO
                title={`${workshopTitle} | ZurichJS Workshop`}
                description={`Join us for ${workshopTitle}: ${workshopSubtitle}. A hands-on workshop on building reliable AI agents in production.`}
                openGraph={{
                    title: `${workshopTitle} | ZurichJS Workshop`,
                    description: `A hands-on workshop on building reliable AI agents in production. ${workshopDate}, ${workshopTime}.`,
                    type: 'website',
                    image: `/api/og/workshop?title=${encodeURIComponent(workshopTitle)}&subtitle=${encodeURIComponent(workshopSubtitle)}&speakerName=${encodeURIComponent(speaker?.name ?? 'Davy')}&speakerImage=${encodeURIComponent(speaker?.image ?? '')}&workshopId=${encodeURIComponent(workshopId)}`,
                    url: `/workshops/${workshopId}`,
                }}
            />

            {/* Sticky Info Banner */}
            <div className="sticky top-0 z-30 bg-zurich text-white shadow-lg">
                <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-white" />
                                <span className="font-bold text-xs sm:text-sm">Only {seatsRemaining} seats available!</span>
                            </div>
                            <div className="hidden sm:block h-6 w-px bg-white/30"></div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-white" />
                                <span className="text-xs sm:text-sm">April 21st, 2026</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
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
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points="0,100 30,80 50,90 80,70 100,85 100,100" fill="currentColor"/>
                        <polygon points="0,100 20,85 40,95 70,75 100,90 100,100" fill="currentColor" opacity="0.5"/>
                    </svg>
                </div>

                <div className="relative z-0">
                    <div className="container mx-auto px-4 pt-6 pb-0">
                        <Link href="/workshops" className="inline-flex items-center text-black hover:underline text-sm font-medium">
                            <ChevronLeft size={16} className="mr-1"/>
                            Back to all workshops
                        </Link>
                    </div>

                    <div className="container mx-auto px-4 py-12 lg:py-16">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                            {/* Left Column */}
                            <div className="lg:col-span-7 order-1">
                                <div className="inline-flex items-center bg-black text-js px-4 py-2 rounded-full text-sm font-bold mb-6">
                                    🤖 AI Agents
                                </div>

                                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-4 lg:mb-6 text-black leading-tight">
                                    {workshopTitle}
                                </h1>

                                <p className="text-lg lg:text-xl text-gray-800 mb-8 lg:mb-10 leading-relaxed max-w-2xl">
                                    {workshopSubtitle}
                                </p>

                                {/* Metadata cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 lg:mb-10">
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-2xl lg:text-3xl font-black text-black mb-1">21st</div>
                                        <div className="text-xs text-gray-600 font-medium">April 2026</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <Clock size={20} className="text-zurich mb-1" />
                                        <div className="text-xs font-bold text-black">17:00–18:30</div>
                                        <div className="text-xs text-gray-600">1.5 hours</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <Users size={20} className="text-zurich mb-1" />
                                        <div className="text-xs font-bold text-black">{totalSeats} seats</div>
                                        <div className="text-xs text-gray-600">Limited</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/10 flex flex-col justify-center items-center text-center min-h-[80px]">
                                        <div className="text-2xl font-black text-black mb-1">35</div>
                                        <div className="text-xs text-gray-600 font-medium">CHF</div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                    <Button
                                        onClick={scrollToRegistration}
                                        className="bg-black text-js font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors text-sm sm:text-base"
                                    >
                                        {isSoldOut ? 'Join Waitlist' : 'Reserve Your Seat — CHF 35'}
                                    </Button>
                                    <button
                                        onClick={scrollToDetails}
                                        className="bg-white text-black font-bold px-6 py-3 rounded-xl border-2 border-black hover:bg-gray-50 transition-colors text-sm sm:text-base"
                                    >
                                        Learn More
                                    </button>
                                    <button
                                        onClick={shareWorkshop}
                                        className="flex items-center justify-center gap-2 bg-white/80 text-black px-4 py-3 rounded-xl border-2 border-black/20 hover:bg-white transition-colors"
                                        aria-label="Share this workshop"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Right Column - Speaker card */}
                            <div className="lg:col-span-5 order-2">
                                <div className="bg-white rounded-2xl p-6 shadow-xl border border-black/10">
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Your Instructor</div>
                                    {speaker ? (
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-black/10 flex-shrink-0">
                                                <Image
                                                    src={speaker.image}
                                                    alt={speaker.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div>
                                                <div className="font-black text-xl text-black">{speaker.name}</div>
                                                {speaker.title && (
                                                    <div className="text-sm text-gray-600 mt-1">{speaker.title}</div>
                                                )}
                                                {speaker.company && (
                                                    <div className="text-xs text-gray-500 mt-1">{speaker.company}</div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                                <Brain size={32} className="text-violet-600" />
                                            </div>
                                            <div>
                                                <div className="font-black text-xl text-black">Davy</div>
                                                <div className="text-sm text-gray-600 mt-1">AI Agent Practitioner</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {speaker?.bio ?? 'Davy has hands-on experience building AI agent systems and will walk you through the core building blocks behind modern AI agent systems, explaining how to design them in a more robust, predictable, and production-minded way.'}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="text-xs font-bold text-gray-500 mb-2">LOCATION</div>
                                        <div className="text-sm text-black font-medium">{workshopLocation}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Description Section */}
            <Section className="bg-white">
                <div className="container mx-auto px-4 py-12 lg:py-16">
                    <div className="max-w-3xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl font-black text-black mb-6">About This Workshop</h2>
                            <div className="prose prose-lg text-gray-700 space-y-4">
                                <p>
                                    AI agents are easy to demo, but much harder to make reliable in real-world applications. In this hands-on workshop, Davy will walk participants through the core building blocks behind modern AI agent systems and explain how to design them in a more robust, predictable, and production-minded way.
                                </p>
                                <p>
                                    The session will cover how agents use tools, how agent loops work, how to manage context effectively, and when to introduce human-in-the-loop approvals. Participants will also explore the practical challenges of reliability, evaluation, and system design as they move from simple LLM interactions to more capable AI workflows.
                                </p>
                                <p>
                                    This workshop is designed for developers seeking a practical introduction to building AI agents that do more than just look impressive in a demo.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </Section>

            {/* Topics Section */}
            <Section className="bg-gray-50" id="what-youll-learn">
                <div className="container mx-auto px-4 py-12 lg:py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-black text-black mb-4">What You&apos;ll Cover</h2>
                        <p className="text-gray-600 max-w-xl mx-auto">Eight key topics covering the full spectrum of building reliable AI agents.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {topics.map((topic, index) => (
                            <motion.div
                                key={topic.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                            >
                                <div className="mb-4">{topic.icon}</div>
                                <h3 className="font-bold text-black mb-2 text-sm">{topic.title}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">{topic.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Agenda Section */}
            <Section className="bg-white">
                <div className="container mx-auto px-4 py-12 lg:py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-black text-black mb-4">Session Agenda</h2>
                        <p className="text-gray-600 max-w-xl mx-auto">A focused 1.5-hour session moving from fundamentals to production patterns.</p>
                    </motion.div>

                    <div className="max-w-3xl mx-auto space-y-6">
                        {phases.map((phase, index) => (
                            <motion.div
                                key={phase.title}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.08 }}
                                viewport={{ once: true }}
                                className="flex gap-6"
                            >
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-zurich text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    {index < phases.length - 1 && (
                                        <div className="w-0.5 bg-gray-200 flex-1 mt-2" />
                                    )}
                                </div>
                                <div className="pb-6 flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h3 className="font-bold text-black">{phase.title}</h3>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{phase.duration}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{phase.description}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {phase.activities.map(activity => (
                                            <div key={activity} className="flex items-center gap-2 text-xs text-gray-700">
                                                <CheckCircle size={12} className="text-zurich flex-shrink-0" />
                                                {activity}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Who should attend + Prerequisites + Takeaways */}
            <Section className="bg-gray-50">
                <div className="container mx-auto px-4 py-12 lg:py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Who should attend */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
                        >
                            <h3 className="text-xl font-black text-black mb-4">Who Should Attend</h3>
                            <ul className="space-y-3">
                                {targetAudience.map(item => (
                                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                                        <CheckCircle size={16} className="text-zurich flex-shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Prerequisites */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
                        >
                            <h3 className="text-xl font-black text-black mb-4">Prerequisites</h3>
                            <ul className="space-y-3">
                                {prerequisites.map(item => (
                                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                                        <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* What you'll take away */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
                        >
                            <h3 className="text-xl font-black text-black mb-4">What You&apos;ll Take Away</h3>
                            <ul className="space-y-3">
                                {takeaways.map(item => (
                                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                                        <Zap size={16} className="text-violet-600 flex-shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </Section>

            {/* Ticket / Registration Section */}
            <Section className="bg-black text-white" id="registrationContainer">
                <div className="container mx-auto px-4 py-12 lg:py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="text-center mb-10"
                    >
                        <h2 className="text-3xl font-black text-white mb-4">Reserve Your Seat</h2>
                        <p className="text-black max-w-xl mx-auto">
                            {totalSeats} spots available · April 21, 2026 · 17:00–18:30 · {workshopLocation}
                        </p>
                    </motion.div>

                    {router.isReady && canceled && (
                        <div className="max-w-2xl mx-auto mb-8">
                            <CancelledCheckout workshopId={workshopId} workshopTitle={workshopTitle} />
                        </div>
                    )}

                    {isSoldOut ? (
                        <div className="max-w-md mx-auto text-center">
                            <div className="bg-white/10 rounded-2xl p-8 border border-white/20">
                                <h3 className="text-xl font-bold text-white mb-3">Workshop Sold Out</h3>
                                <p className="text-gray-300 text-sm mb-6">Join the waitlist and we&apos;ll notify you if a spot opens up.</p>
                                <Button
                                    onClick={() => track('waitlist_clicked', { workshop_id: workshopId })}
                                    className="bg-js text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors w-full"
                                >
                                    Join Waitlist
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto">
                            <TicketSelection
                                options={reliableAiAgentsTickets}
                                onCheckout={handleCheckout}
                                workshopId={workshopId}
                                ticketType="workshop"
                            />
                        </div>
                    )}
                </div>
            </Section>

            {/* FAQ Section */}
            <Section className="bg-white">
                <div className="container mx-auto px-4 py-12 lg:py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="text-center mb-10"
                    >
                        <h2 className="text-3xl font-black text-black mb-4">Frequently Asked Questions</h2>
                    </motion.div>

                    <div className="max-w-2xl mx-auto space-y-4">
                        {faqs.map((faq) => (
                            <motion.div
                                key={faq.id}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                viewport={{ once: true }}
                                className="border border-gray-200 rounded-xl overflow-hidden"
                            >
                                <button
                                    className="w-full text-left px-6 py-4 flex items-center justify-between font-bold text-black hover:bg-gray-50 transition-colors"
                                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                                >
                                    <span>{faq.question}</span>
                                    <span className="text-gray-400 ml-4">{openFaq === faq.id ? '−' : '+'}</span>
                                </button>
                                {openFaq === faq.id && (
                                    <div className="px-6 pb-4 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
                                        <p className="pt-4">{faq.answer}</p>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Bottom CTA */}
            <Section className="bg-js">
                <div className="container mx-auto px-4 py-12 text-center">
                    <h2 className="text-2xl sm:text-3xl font-black text-black mb-4">
                        Ready to build agents that actually work in production?
                    </h2>
                    <p className="text-gray-800 mb-6 max-w-lg mx-auto">
                        Join Davy on April 21st and leave with a clear mental model for building reliable, production-ready AI agents.
                    </p>
                    <Button
                        onClick={scrollToRegistration}
                        className="bg-black text-js font-bold px-8 py-3 rounded-xl hover:bg-gray-900 transition-colors"
                    >
                        Reserve Your Seat — CHF 35
                    </Button>
                </div>
            </Section>
        </PageLayout>
    );
}

export async function getStaticProps() {
    const speakerIds = ['speaker-69b5455a-0057-44df-8be5-f7c33b00cf4e'];
    const speakers = await getSpeakersByIds(speakerIds);

    if (!speakers || speakers.length === 0) {
        return {
            props: {
                speakers: [{
                    id: 'speaker-69b5455a-0057-44df-8be5-f7c33b00cf4e',
                    name: 'Davy',
                    title: 'AI Agent Practitioner',
                    image: '/images/speakers/default.png',
                    bio: 'Davy has hands-on experience building AI agent systems and will walk you through the core building blocks behind modern AI agent systems, explaining how to design them in a more robust, predictable, and production-minded way.',
                }],
            },
            revalidate: 60,
        };
    }

    return {
        props: { speakers },
        revalidate: 60,
    };
}
