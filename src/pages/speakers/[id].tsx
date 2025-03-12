import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, ExternalLink, Twitter, Github, Linkedin, Video, FileText } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import { getSpeakers } from '@/sanity/queries';

// Define types for the speaker and talk data
interface Talk {
    id: string;
    title: string;
    date: string;
    location?: string;
    duration?: number;
    description?: string;
    eventId?: string;
    slidesUrl?: string | null;
    videoUrl?: string | null;
    upcoming: boolean;
    coverImage?: string;
    tags?: string[];
    type?: string;
}

interface Speaker {
    id: string;
    name: string;
    title: string;
    image: string;
    bio: string;
    twitter?: string;
    github?: string;
    linkedin?: string;
    skills?: string[];
    talks: Talk[];
}

export default function SpeakerDetail({ speaker }: { speaker: Speaker }) {
    const router = useRouter();
    console.log('speaker', speaker);
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

    return (
        <Layout>
            <Head>
                <title>{speaker.name} | Speaker | ZurichJS</title>
                <meta name="description" content={`${speaker.name} is a speaker at ZurichJS. Learn more about their talks and expertise in JavaScript.`} />
            </Head>

            <div className="pt-20">
                {/* Speaker Hero Section */}
                <section className="bg-yellow-400 py-16">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col md:flex-row items-center bg-white rounded-xl shadow-xl overflow-hidden">
                            <div className="md:w-1/3 h-80 relative w-full">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full"
                                >
                                    <Image
                                        src={speaker.image}
                                        alt={speaker.name}
                                        fill
                                        className="object-cover"
                                    />
                                </motion.div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
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
                                                href={`https://twitter.com/${speaker.twitter}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-600 hover:text-blue-400 transition-colors"
                                                aria-label="Twitter profile"
                                            >
                                                <Twitter size={22} />
                                            </a>
                                        )}
                                        {speaker.github && (
                                            <a
                                                href={`https://github.com/${speaker.github}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-600 hover:text-black transition-colors"
                                                aria-label="GitHub profile"
                                            >
                                                <Github size={22} />
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
                                                <Linkedin size={22} />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="text-gray-700 mb-8">
                                    <p className="md:text-lg">{speaker.bio}</p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {speaker.skills && speaker.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Talks Section */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-3xl font-bold mb-8">Talks by {speaker.name} 🎤</h2>
                        </motion.div>

                        <div className="space-y-8">
                            {speaker.talks.map((talk, index) => (
                                <motion.div
                                    key={talk.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="bg-gray-50 rounded-lg shadow-md overflow-hidden"
                                >
                                    <div className="md:flex">
                                        {talk.coverImage && (
                                            <div className="md:w-1/4 h-48 md:h-auto relative">
                                                <Image
                                                    src={talk.coverImage}
                                                    alt={talk.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className={`p-6 ${talk.coverImage ? 'md:w-3/4' : 'w-full'}`}>
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
                                                <h3 className="text-xl font-bold">{talk.title}</h3>
                                                <div className="mt-2 md:mt-0">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${talk.upcoming
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {talk.upcoming ? 'Upcoming' : 'Past Talk'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center text-gray-500 gap-x-4 gap-y-2 mb-4">
                                                {talk.date && <div className="flex items-center">
                                                    <Calendar size={16} className="mr-1" />
                                                    <span className="text-sm">{talk.date}</span>
                                                </div>}
                                                {talk.location && (
                                                    <div className="flex items-center">
                                                        <MapPin size={16} className="mr-1" />
                                                        <span className="text-sm">{talk.location}</span>
                                                    </div>
                                                )}
                                                {talk.duration && (
                                                    <div className="flex items-center">
                                                        <Clock size={16} className="mr-1" />
                                                        <span className="text-sm">{talk.duration} min</span>
                                                    </div>
                                                )}
                                                {talk.type && (
                                                    <div className="flex items-center">
                                                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                                            {talk.type}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {talk.description && (
                                                <p className="text-gray-700 mb-4">{talk.description}</p>
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

                                            <div className="flex flex-wrap gap-3">
                                                {talk.eventId && (
                                                    <Link
                                                        href={`/events/${talk.eventId}`}
                                                        className="flex items-center text-yellow-600 hover:text-yellow-700 font-medium"
                                                    >
                                                        Event Details <ExternalLink size={16} className="ml-1" />
                                                    </Link>
                                                )}
                                                {talk.slidesUrl && (
                                                    <a
                                                        href={talk.slidesUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        Slides <FileText size={16} className="ml-1" />
                                                    </a>
                                                )}
                                                {talk.videoUrl && (
                                                    <a
                                                        href={talk.videoUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        Watch Video <Video size={16} className="ml-1" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 bg-gray-50">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="bg-yellow-400 rounded-xl shadow-lg overflow-hidden"
                        >
                            <div className="md:flex">
                                <div className="md:w-2/3 p-8">
                                    <h2 className="text-2xl md:text-3xl font-bold mb-4">Want to be our next speaker? 🎤</h2>
                                    <p className="text-lg mb-6">
                                        If you&apos;re passionate about JavaScript and have knowledge to share, we&apos;d love to have you speak at one of our upcoming meetups!
                                    </p>
                                    <Button href="/cfp" variant="primary" size="lg" className="bg-black text-yellow-400 hover:bg-gray-800">
                                        Submit Your Talk Proposal 🚀
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
                    </div>
                </section>
            </div>
        </Layout>
    );
}

export async function getStaticPaths() {
    const speakers = await getSpeakers();
    const speakerIds = speakers.map((speaker: Speaker) => speaker.id);

    const paths = speakerIds.map((id: string) => ({
        params: { id },
    }));

    return {
        paths,
        fallback: true, // Show a loading state for speakers not generated at build time
    };
}

export async function getStaticProps({ params }: { params: { id: string } }) {
    const speakers = await getSpeakers();

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