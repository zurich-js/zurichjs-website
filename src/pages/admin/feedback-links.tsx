import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/layout/Layout';
import { Copy, Check, Search, RefreshCw, Mail, Calendar } from 'lucide-react';
import SEO from '@/components/SEO';
import { getSpeakers } from '@/sanity/queries';

interface Event {
    id: string;
    title: string;
    datetime: string;
    location: string;
}

interface Talk {
    id: string;
    title: string;
    events: Event[];
    description?: string;
    type?: string;
    tags?: string[];
    durationMinutes?: number;
}

interface Speaker {
    id: string;
    name: string;
    email?: string;
    talks: Talk[];
}

interface AdminFeedbackLinksProps {
    speakers: Speaker[];
}

export default function AdminFeedbackLinks({ speakers }: AdminFeedbackLinksProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const [filteredSpeakers, setFilteredSpeakers] = useState<Speaker[]>(speakers);
    const [generatingLink, setGeneratingLink] = useState<string | null>(null);
    const [speakerLinks, setSpeakerLinks] = useState<Record<string, string>>({});
    const [eventLinks, setEventLinks] = useState<Record<string, string>>({});
    const [isMounted, setIsMounted] = useState(false);

    // For sending emails
    const [emailSubject, setEmailSubject] = useState('Your ZurichJS Talk Feedback');
    const [emailBody, setEmailBody] = useState(
        'Hello,\n\nThank you for speaking at ZurichJS! We\'ve collected feedback from attendees, and you can view it at the following link:\n\n{{FEEDBACK_LINK}}\n\nWe appreciate your contribution to our community!\n\nBest regards,\nThe ZurichJS Team'
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // Reset the copied status after 2 seconds
        if (copiedLink) {
            const timer = setTimeout(() => {
                setCopiedLink(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [copiedLink]);

    useEffect(() => {
        // Filter speakers based on search term
        if (!searchTerm.trim()) {
            setFilteredSpeakers(speakers);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredSpeakers(
                speakers.filter(
                    speaker =>
                        speaker.name.toLowerCase().includes(term) ||
                        speaker.talks.some(talk =>
                            talk.title.toLowerCase().includes(term) ||
                            talk.events.some(event => 
                                event.title.toLowerCase().includes(term)
                            )
                        )
                )
            );
        }
    }, [searchTerm, speakers]);

    // Generate all event feedback links after component mounts
    useEffect(() => {
        if (isMounted) {
            const links: Record<string, string> = {};
            
            // Get all unique events
            allEvents.forEach(event => {
                const baseUrl = window.location.origin;
                links[event.id] = `${baseUrl}/events/${event.id}?feedback=true`;
            });
            
            setEventLinks(links);
        }
    }, [isMounted]);

    const generateLink = async (speakerId: string) => {
        setGeneratingLink(speakerId);

        try {
            const response = await fetch('/api/feedback/speaker/generate-feedback-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ speakerId }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate link');
            }

            const data = await response.json();

            // Save the link
            setSpeakerLinks(prev => ({
                ...prev,
                [speakerId]: data.feedbackUrl
            }));
        } catch (error) {
            console.error('Error generating link:', error);
            alert('Failed to generate link. Please try again.');
        } finally {
            setGeneratingLink(null);
        }
    };

    const copyToClipboard = (text: string, speakerId: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedLink(speakerId);
        });
    };

    const sendEmail = (speaker: Speaker) => {
        if (!speaker.email) {
            alert('No email address available for this speaker.');
            return;
        }

        if (!speakerLinks[speaker.id]) {
            alert('Please generate a feedback link first.');
            return;
        }

        // Replace placeholder with actual link
        const body = emailBody.replace('{{FEEDBACK_LINK}}', speakerLinks[speaker.id]);

        // Create mailto link
        const mailtoLink = `mailto:${speaker.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;

        // Open default email client
        window.open(mailtoLink, '_blank');
    };

    // Get all unique events from all speakers' talks
    const allEvents = speakers.flatMap(speaker => 
        speaker.talks.flatMap(talk => 
            talk.events.map(event => ({
                id: event.id,
                title: event.title,
                date: event.datetime,
                location: event.location
            }))
        )
    ).filter((value, index, self) => 
        self.findIndex(v => v.id === value.id) === index
    );

    return (
        <Layout>
            <SEO title="Speaker Feedback Links Admin | ZurichJS" description={'Generate and copy feedback links for speakers to share with them. These links give speakers access to view all feedback submitted for their talks.'} />

            <div className="container mx-auto px-6 py-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-6">Speaker Feedback Links Admin</h1>
                    <p className="mb-4">
                        Generate and copy feedback links for speakers to share with them.
                        These links give speakers access to view all feedback submitted for their talks.
                    </p>

                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search speakers or talks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                        />
                    </div>
                </div>

                {/* Event Feedback Mode Links */}
                <div className="mb-12 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                    <h2 className="text-xl font-bold mb-4">Event Feedback Collection Links</h2>
                    <p className="mb-4">
                        Share these links with attendees to collect feedback for specific events.
                        The link puts the event page in &quot;feedback mode&quot; where attendees can rate talks.
                    </p>

                    <div className="space-y-4 mt-6">
                        {allEvents
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(event => (
                                <div key={event.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h3 className="font-semibold">{event.title}</h3>
                                        <div className="flex items-center text-sm text-gray-500 mt-1">
                                            <Calendar size={14} className="mr-1" />
                                            {new Date(event.date).toLocaleDateString()}
                                        </div>
                                        {isMounted && (
                                            <div className="text-sm text-blue-600 mt-2 break-all">
                                                {eventLinks[event.id]}
                                            </div>
                                        )}
                                    </div>
                                    {isMounted && (
                                        <button
                                            onClick={() => {
                                                copyToClipboard(eventLinks[event.id], `event-${event.id}`);
                                            }}
                                            className={`px-4 py-2 rounded-md flex items-center ${copiedLink === `event-${event.id}`
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                }`}
                                        >
                                            {copiedLink === `event-${event.id}` ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-2" /> Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4 mr-2" /> Copy Link
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>

                {/* Email Templates Section */}
                <div className="mb-12 bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h2 className="text-xl font-bold mb-4">Email Template for Speakers</h2>
                    <p className="mb-4">
                        Customize the email that will be sent to speakers with their feedback link.
                        Use &quot;&#123;&#123;FEEDBACK_LINK&#125;&#125;&quot; as a placeholder for the actual link.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="emailSubject" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Subject
                            </label>
                            <input
                                id="emailSubject"
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="emailBody" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Body
                            </label>
                            <textarea
                                id="emailBody"
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                rows={8}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Speaker Feedback Links */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Speaker Feedback Links</h2>

                    {filteredSpeakers.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No speakers found matching your search.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {filteredSpeakers.map(speaker => (
                                <div key={speaker.id} className="bg-white p-6 rounded-lg shadow-md">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold">{speaker.name}</h3>
                                            {speaker.email && (
                                                <div className="flex items-center text-gray-600 mt-1">
                                                    <Mail size={14} className="mr-1" />
                                                    {speaker.email}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => generateLink(speaker.id)}
                                                className="px-4 py-2 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center"
                                                disabled={!!generatingLink}
                                            >
                                                {generatingLink === speaker.id ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2" /> Generate Link
                                                    </>
                                                )}
                                            </button>

                                            {speaker.email && speakerLinks[speaker.id] && (
                                                <button
                                                    onClick={() => sendEmail(speaker)}
                                                    className="px-4 py-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center"
                                                >
                                                    <Mail className="h-4 w-4 mr-2" /> Send Email
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {speakerLinks[speaker.id] && (
                                        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="text-sm break-all text-blue-600 font-medium">
                                                {speakerLinks[speaker.id]}
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(speakerLinks[speaker.id], speaker.id)}
                                                className={`px-3 py-1 rounded-md text-sm flex items-center whitespace-nowrap ${copiedLink === speaker.id
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    }`}
                                            >
                                                {copiedLink === speaker.id ? (
                                                    <>
                                                        <Check className="h-3 w-3 mr-1" /> Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3 mr-1" /> Copy
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-4">
                                        <h4 className="font-semibold mb-2 text-gray-700">Talks:</h4>
                                        <ul className="space-y-2">
                                            {speaker.talks.map(talk => (
                                                <li key={talk.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                                                    <div className="font-medium">{talk.title}</div>
                                                    {talk.events.map(event => (
                                                        <div key={event.id} className="text-gray-600 flex items-center mt-1">
                                                            <Calendar size={14} className="mr-1" />
                                                            {event.title} - {new Date(event.datetime).toLocaleDateString()}
                                                        </div>
                                                    ))}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export const getServerSideProps: GetServerSideProps = async () => {
    try {
        // Fetch all speakers who have given talks
        const speakers = await getSpeakers({ shouldFilterVisible: false })

        return {
            props: {
                speakers: speakers.filter(speaker => speaker.talks && speaker.talks.length > 0),
            },
        };
    } catch (error) {
        console.error('Error fetching speakers:', error);
        return {
            props: {
                speakers: [],
                error: 'Failed to load data'
            },
        };
    }
}