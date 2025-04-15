import { motion } from 'framer-motion';
import { Clock, Twitter, Github, Linkedin } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/router';

import Layout from '@/components/layout/Layout';
import Section from "@/components/Section";
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { getSpeakers } from '@/sanity/queries';
import { Speaker, Talk } from '@/types';


export default function SpeakerDetail({ speaker }: { speaker: Speaker }) {
    const router = useRouter();
    // Show loading state while fetching data
    if (router.isFallback) {
        return (
            <Layout>
                <div className="pt-32 pb-20 text-center">
                    <div className="animate-pulse">
                        <div className="h-10 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    // SEO metadata
    const title = `${speaker.name} | Speaker at ZurichJS`;
    const description = speaker.bio
        ? `${speaker.bio.substring(0, 150)}${speaker.bio.length > 150 ? '...' : ''}`
        : `${speaker.name} is a speaker at ZurichJS events, sharing expertise on ${speaker.talks.map(talk => talk.tags?.join(', ')).join(', ')}.`;

    return (
        <Layout>
            <SEO
                title={title}
                description={description}
                canonical={`https://zurichjs.com/speakers/${speaker.id}`}
                openGraph={{
                    title,
                    description,
                    type: 'profile',
                    url: `https://zurichjs.org/speakers/${speaker.id}`,
                    image: speaker.image ? `${speaker.image}?h=300` : '',
                    profile: {
                        firstName: speaker.name.split(' ')[0],
                        lastName: speaker.name.split(' ').slice(1).join(' '),
                        username: speaker.twitter || undefined,
                    }
                }}
                twitter={{
                    cardType: 'summary_large_image',
                    handle: speaker.twitter ? `@${speaker.twitter}` : '',
                }}
                additionalMetaTags={[
                    { name: 'keywords', content: `${speaker.name}, JavaScript, ZurichJS, tech talks, ${speaker.talks.flatMap(talk => talk.tags || []).join(', ')}` }
                ]}
            />


            {/* Speaker Hero Section */}
            <Section variant="gradient" padding="lg" className="mt-20">
                    <div className="flex flex-col md:flex-row items-center bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="md:w-1/3 w-full h-64 md:h-96 relative">
                            <motion.div
                                initial={{opacity: 0}}
                                animate={{opacity: 1}}
                                transition={{duration: 0.5}}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={speaker.image ? `${speaker.image}?h=600` : '/images/placeholder-speaker.jpg'}
                                    alt={speaker.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    priority
                                />
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{opacity: 0, x: 20}}
                            animate={{opacity: 1, x: 0}}
                            transition={{duration: 0.5, delay: 0.2}}
                            className="md:w-2/3 p-8"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold">{speaker.name}</h1>
                                    <p className="text-gray-600 mt-1">{speaker.title}</p>
                                </div>
                                <div className="flex space-x-4 mt-4 md:mt-0">
                                    {speaker.twitter && (
                                        <a
                                            href={speaker.twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-600 hover:text-blue-400 transition-colors"
                                            aria-label="Twitter profile"
                                        >
                                            <Twitter size={22}/>
                                        </a>
                                    )}
                                    {speaker.github && (
                                        <a
                                            href={speaker.github}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-600 hover:text-black transition-colors"
                                            aria-label="GitHub profile"
                                        >
                                            <Github size={22}/>
                                        </a>
                                    )}
                                    {speaker.linkedin && (
                                        <a
                                            href={speaker.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-600 hover:text-blue-700 transition-colors"
                                            aria-label="LinkedIn profile"
                                        >
                                            <Linkedin size={22}/>
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="text-gray-700 mb-8">
                                <p className="md:text-md whitespace-pre-line">{speaker.bio}</p>
                            </div>
                        </motion.div>
                    </div>
            </Section>

            {/* Talks Section */}
            <Section variant="white">
                    <motion.div
                        initial={{opacity: 0, y: 20}}
                        whileInView={{opacity: 1, y: 0}}
                        viewport={{once: true}}
                        transition={{duration: 0.5}}
                    >
                        <h2 className="text-3xl font-bold mb-8">Talks by {speaker.name} 🎤</h2>
                    </motion.div>

                    <div className="space-y-8">
                        {speaker.talks && speaker.talks?.toSorted((a, b) => {
                                // Get the latest event date for each talk
                                const getLatestDate = (talk: Talk) => {
                                    if (!talk.events || talk.events.length === 0) return new Date(0); // Talks with no events go last
                                    return new Date(Math.max(...talk.events.map(event => new Date(event.datetime).getTime())));
                                };
                                return getLatestDate(b).getTime() - getLatestDate(a).getTime();
                            })
                            .map((talk, index) => {
                                // Check if the talk has any events
                                const hasEvents = talk.events && talk.events.length > 0;
                                // A talk is upcoming if it has at least one event in the future
                                const upcoming = hasEvents && talk.events?.some(event => new Date(event.datetime) > new Date());
                                // A talk without events should be shown as "Coming Soon"
                                const comingSoon = !hasEvents;

                                return (
                                    <motion.div
                                        key={talk.id}
                                        initial={{opacity: 0, y: 20}}
                                        whileInView={{opacity: 1, y: 0}}
                                        viewport={{once: true}}
                                        transition={{duration: 0.5, delay: index * 0.1}}
                                        className="bg-gray-50 rounded-lg shadow-md overflow-hidden"
                                    >
                                        <div className="md:flex">
                                            <div className="p-6 w-full">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
                                                    <h3 className="text-xl font-bold md:max-w-[60%]">{talk.title}</h3>
                                                    <div className="mt-2 md:mt-0 flex flex-wrap items-center gap-3">
                                                        {talk.durationMinutes && (
                                                            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5 shadow-sm">
                                                                <Clock size={16} className="text-yellow-500 mr-2"/>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-gray-800">
                                                                        {talk.durationMinutes} minutes
                                                                    </span>
                                                                    <span className="text-xs text-gray-600">
                                                                        {talk.durationMinutes < 15 ? 'Lightning Talk' : 'Regular Talk'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                                            comingSoon
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : upcoming
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {comingSoon ? 'Coming Soon' : upcoming ? 'Upcoming' : 'Past Talk'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center text-gray-500 gap-x-4 gap-y-2 mb-4">
                                                    {/* Removed duration from here as it's now in the header */}
                                                </div>

                                                {talk.description && (
                                                    <p className="text-gray-700 mb-4 whitespace-pre-line">{talk.description}</p>
                                                )}

                                                {/* Display events where this talk was/will be presented */}
                                                {hasEvents && (
                                                    <div className="mb-4">
                                                        <h4 className="text-sm font-semibold text-gray-600 mb-2">Presented at:</h4>
                                                        <div className="space-y-2">
                                                            {talk.events?.map(event => (
                                                                <a
                                                                    key={event.id}
                                                                    href={`/events/${event.id}`}
                                                                    className="block bg-white p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <div className="font-medium">{event.title}</div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {new Date(event.datetime).toLocaleDateString('en-GB', {
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {talk.tags && talk.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {talk.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium"
                                                            >
                                                {tag}
                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                    </div>
            </Section>


            {/* CTA Section */}
            <Section variant="gray">
                    <motion.div
                        initial={{opacity: 0, y: 20}}
                        whileInView={{opacity: 1, y: 0}}
                        viewport={{once: true}}
                        transition={{duration: 0.5}}
                        className="bg-js rounded-xl shadow-lg overflow-hidden"
                    >
                        <div className="md:flex">
                            <div className="md:w-2/3 p-8">
                                <h2 className="text-2xl md:text-3xl font-bold mb-4">Want to be our next speaker? 🎤</h2>
                                <p className="text-lg mb-6">
                                    If you&apos;re passionate about JavaScript and have knowledge to share, we&apos;d love to have you speak at
                                    one of our upcoming meetups!
                                </p>
                                <Button href="/cfp" variant="primary" size="lg" className="bg-black text-js hover:bg-gray-800">
                                    Submit Your Talk Proposal
                                </Button>
                            </div>
                            <div className="md:w-1/3 relative hidden md:block">
                                <div className="absolute inset-0 bg-black opacity-10"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-7xl font-black text-white">JS</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
            </Section>
        </Layout>
    );
}

export async function getStaticPaths() {
    const speakers = await getSpeakers({shouldFilterVisible: true});
    const speakerIds = speakers.map((speaker: Speaker) => speaker.id);

    const paths = speakerIds.map((id: string) => ({
        params: {id},
    }));

    return {
        paths,
        fallback: true, // Show a loading state for speakers not generated at build time
    };
}

export async function getStaticProps({params}: { params: { id: string } }) {
    const speakers = await getSpeakers({shouldFilterVisible: true});

    // Get the speaker data
    const speaker = speakers.find((speaker: Speaker) => speaker.id === params.id);

    // Handle case where speaker is not found
    if (!speaker) {
        return {
            notFound: true,
        };
    }

    return {
        props: {
            speaker,
        },
        // Re-generate the page at most once per day
        revalidate: 86400,
    };
}
