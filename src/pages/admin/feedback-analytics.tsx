import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '@/components/layout/Layout';
import { ArrowDown, ArrowUp, Calendar, Download, Star, Filter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import SEO from '@/components/SEO';
import {
    getFeedback,
    getEventFeedbackStats,
    getSpeakerFeedbackStats,
    getTalkFeedbackStats,
} from '@/sanity/queries';

interface FeedbackData {
    _id: string;
    rating: number;
    comment: string;
    submittedAt: string;
    event: {
        _id: string;
        title: string;
        datetime: string;
    };
    talk: {
        _id: string;
        title: string;
    };
    speaker: {
        _id: string;
        name: string;
        image: string;
    };
    [key: string]: unknown;
}

interface SpeakerStats {
    _id: string;
    name: string;
    image: string;
    feedbackCount: number;
    averageRating: number;
    [key: string]: unknown;
}

interface TalkStats {
    _id: string;
    title: string;
    speakerName: string;
    speakerId: string;
    speakerImage: string;
    eventTitle: string;
    eventId: string;
    eventDate: string;
    feedbackCount: number;
    averageRating: number;
    [key: string]: unknown;
}

interface EventStats {
    _id: string;
    title: string;
    date: string;
    feedbackCount: number;
    averageRating: number;
    talkCount: number;
    [key: string]: unknown;
}

interface FeedbackAnalyticsProps {
    feedbackData: FeedbackData[];
    eventStats: EventStats[];
    speakerStats: SpeakerStats[];
    talkStats: TalkStats[];
}

export default function FeedbackAnalytics({
    feedbackData,
    eventStats,
    speakerStats,
    talkStats
}: FeedbackAnalyticsProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'speakers' | 'talks' | 'allFeedback'>('overview');
    const [sortField, setSortField] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [filterValue, setFilterValue] = useState<string>('');

    // Total counts
    const totalFeedback = feedbackData.length;
    const totalEvents = eventStats.length;
    const totalSpeakers = speakerStats.length;

    // Overall average rating
    const overallAverageRating = totalFeedback > 0
        ? feedbackData.reduce((sum, item) => sum + item.rating, 0) / totalFeedback
        : 0;

    // Handle sorting
    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Sort and filter function
    const getSortedAndFilteredItems = <T extends Record<string, unknown>>(
        items: T[],
        field: string,
        direction: 'asc' | 'desc',
        filterValue: string,
        filterFields: string[]
    ) => {
        // First filter
        let filteredItems = items;
        if (filterValue.trim()) {
            const searchTerm = filterValue.toLowerCase();
            filteredItems = items.filter(item => {
                return filterFields.some(fieldPath => {
                    const fieldValue = getNestedProperty(item, fieldPath);
                    return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(searchTerm);
                });
            });
        }

        // Then sort
        return [...filteredItems].sort((a, b) => {
            const aValue = getNestedProperty(a, field);
            const bValue = getNestedProperty(b, field);

            if (aValue === bValue) return 0;

            // Safe comparison handling various types
            if (
                (typeof aValue === 'string' && typeof bValue === 'string') ||
                (typeof aValue === 'number' && typeof bValue === 'number') ||
                (aValue instanceof Date && bValue instanceof Date)
            ) {
                const result = aValue > bValue ? 1 : -1;
                return direction === 'asc' ? result : -result;
            }

            // Default comparison
            return direction === 'asc' ? 1 : -1;
        });
    };

    // Helper to get nested property using dot notation (e.g. "event.title")
    const getNestedProperty = (obj: Record<string, unknown>, path: string): unknown => {
        return path.split('.').reduce<unknown>((acc, part) => {
            if (acc === null || acc === undefined || typeof acc !== 'object') {
                return null;
            }
            return (acc as Record<string, unknown>)[part];
        }, obj);
    };

    // Export feedback data as CSV
    const exportToCSV = () => {
        if (feedbackData.length === 0) return;

        const csvRows = [];

        // CSV Header
        const headers = ['Event', 'Date', 'Talk', 'Speaker', 'Rating', 'Comment', 'Submitted At'];
        csvRows.push(headers.join(','));

        // CSV Data
        for (const feedback of feedbackData) {
            const eventDate = new Date(feedback.event.datetime).toLocaleDateString();
            const submittedDate = new Date(feedback.submittedAt).toLocaleString();

            const row = [
                `"${feedback.event.title.replace(/"/g, '""')}"`,
                `"${eventDate}"`,
                `"${feedback.talk.title.replace(/"/g, '""')}"`,
                `"${feedback.speaker.name.replace(/"/g, '""')}"`,
                feedback.rating,
                `"${feedback.comment?.replace(/"/g, '""') || ''}"`,
                `"${submittedDate}"`
            ];

            csvRows.push(row.join(','));
        }

        // Create and download CSV file
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('href', url);
        link.setAttribute('download', `zurichjs-feedback-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Get sorted and filtered data
    const filteredEvents = getSortedAndFilteredItems(
        eventStats,
        sortField === 'date' ? 'date' : sortField,
        sortDirection,
        filterValue,
        ['title']
    );

    const filteredSpeakers = getSortedAndFilteredItems(
        speakerStats,
        sortField === 'name' ? 'name' : sortField,
        sortDirection,
        filterValue,
        ['name']
    );

    const filteredTalks = getSortedAndFilteredItems(
        talkStats,
        sortField === 'eventDate' ? 'eventDate' : sortField,
        sortDirection,
        filterValue,
        ['title', 'speakerName', 'eventTitle']
    );

    const filteredFeedback = getSortedAndFilteredItems(
        feedbackData,
        sortField === 'submittedAt' ? 'submittedAt' : sortField,
        sortDirection,
        filterValue,
        ['event.title', 'talk.title', 'speaker.name', 'comment']
    );

    return (
        <Layout>
            <SEO title="Feedback Analytics | ZurichJS Admin" description={'Analyze all feedback collected from ZurichJS events'} />

            <div className="container mx-auto px-6 py-20">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Feedback Analytics</h1>
                        <p className="text-gray-600">
                            Analyze all feedback collected from ZurichJS events
                        </p>
                    </div>

                    <button
                        onClick={exportToCSV}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                    >
                        <Download size={18} className="mr-2" />
                        Export All Feedback (CSV)
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <div className="flex flex-wrap -mb-px">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`inline-flex items-center px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`inline-flex items-center px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'events'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Events ({eventStats.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('speakers')}
                            className={`inline-flex items-center px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'speakers'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Speakers ({speakerStats.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('talks')}
                            className={`inline-flex items-center px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'talks'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Talks ({talkStats.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('allFeedback')}
                            className={`inline-flex items-center px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'allFeedback'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            All Feedback ({feedbackData.length})
                        </button>
                    </div>
                </div>

                {/* Filter Input */}
                <div className="mb-6 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter size={16} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Filter results..."
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Overview Dashboard */}
                {activeTab === 'overview' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                                <div className="text-gray-500 mb-2">Total Feedback</div>
                                <div className="text-3xl font-bold">{totalFeedback}</div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                                <div className="text-gray-500 mb-2">Average Rating</div>
                                <div className="text-3xl font-bold flex items-center">
                                    {overallAverageRating.toFixed(1)}
                                    <Star className="ml-2 h-6 w-6 fill-yellow-400 text-yellow-400" />
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                                <div className="text-gray-500 mb-2">Events with Feedback</div>
                                <div className="text-3xl font-bold">{totalEvents}</div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                                <div className="text-gray-500 mb-2">Speakers with Feedback</div>
                                <div className="text-3xl font-bold">{totalSpeakers}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                            {/* Top Rated Talks */}
                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                                <h3 className="text-xl font-bold mb-4">Top Rated Talks</h3>
                                <div className="space-y-4">
                                    {talkStats
                                        .sort((a, b) => b.averageRating - a.averageRating)
                                        .slice(0, 5)
                                        .map((talk) => (
                                            <div key={talk._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                                <div className="relative h-10 w-10 rounded-full overflow-hidden">
                                                    <Image
                                                        src={talk.speakerImage || '/images/speakers/default.jpg'}
                                                        alt={talk.speakerName}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="font-medium">{talk.title}</div>
                                                    <div className="text-sm text-gray-500">{talk.speakerName}</div>
                                                </div>
                                                <div className="flex items-center bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                                                    {talk.averageRating.toFixed(1)}
                                                    <Star className="ml-1 h-4 w-4 fill-yellow-500 text-yellow-500" />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Top Rated Speakers */}
                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                                <h3 className="text-xl font-bold mb-4">Top Rated Speakers</h3>
                                <div className="space-y-4">
                                    {speakerStats
                                        .sort((a, b) => b.averageRating - a.averageRating)
                                        .slice(0, 5)
                                        .map((speaker) => (
                                            <div key={speaker._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                                                    <Image
                                                        src={speaker.image || '/images/speakers/default.jpg'}
                                                        alt={speaker.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="font-medium">{speaker.name}</div>
                                                    <div className="text-sm text-gray-500">{speaker.feedbackCount} feedback entries</div>
                                                </div>
                                                <div className="flex items-center bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                                                    {speaker.averageRating.toFixed(1)}
                                                    <Star className="ml-1 h-4 w-4 fill-yellow-500 text-yellow-500" />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Feedback */}
                        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                            <h3 className="text-xl font-bold mb-4">Recent Feedback</h3>
                            <div className="space-y-4">
                                {feedbackData
                                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                                    .slice(0, 5)
                                    .map((feedback) => (
                                        <div key={feedback._id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-medium">{feedback.talk.title}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {feedback.speaker.name} at {feedback.event.title}
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            size={16}
                                                            className={star <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            {feedback.comment && (
                                                <div className="text-gray-700 bg-gray-50 p-3 rounded-md">
                                                    &quot;{feedback.comment}&quot;
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-2">
                                                Submitted on {new Date(feedback.submittedAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Events List */}
                {activeTab === 'events' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('title')}
                                    >
                                        <div className="flex items-center">
                                            Event
                                            {sortField === 'title' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('date')}
                                    >
                                        <div className="flex items-center">
                                            Date
                                            {sortField === 'date' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('feedbackCount')}
                                    >
                                        <div className="flex items-center">
                                            Feedback Count
                                            {sortField === 'feedbackCount' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('averageRating')}
                                    >
                                        <div className="flex items-center">
                                            Avg. Rating
                                            {sortField === 'averageRating' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Talk Count
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                            No events found matching your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEvents.map((event) => (
                                        <tr key={event._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link href={`/events/${event._id}`} className="font-medium text-blue-600 hover:underline">
                                                    {event.title}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(event.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {event.feedbackCount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {event.averageRating.toFixed(1)}
                                                    <Star className="ml-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {event.talkCount}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Speakers List */}
                {activeTab === 'speakers' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('name')}
                                    >
                                        <div className="flex items-center">
                                            Speaker
                                            {sortField === 'name' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('feedbackCount')}
                                    >
                                        <div className="flex items-center">
                                            Feedback Count
                                            {sortField === 'feedbackCount' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('averageRating')}
                                    >
                                        <div className="flex items-center">
                                            Avg. Rating
                                            {sortField === 'averageRating' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSpeakers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                                            No speakers found matching your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSpeakers.map((speaker) => (
                                        <tr key={speaker._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 relative">
                                                        <Image
                                                            src={speaker.image || '/images/speakers/default.jpg'}
                                                            alt={speaker.name}
                                                            fill
                                                            className="object-cover rounded-full"
                                                        />
                                                    </div>
                                                    <div className="ml-4">
                                                        <Link href={`/speakers/${speaker._id}`} className="font-medium text-blue-600 hover:underline">
                                                            {speaker.name}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {speaker.feedbackCount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {speaker.averageRating.toFixed(1)}
                                                    <Star className="ml-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Talks List */}
                {activeTab === 'talks' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('title')}
                                    >
                                        <div className="flex items-center">
                                            Talk Title
                                            {sortField === 'title' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('speakerName')}
                                    >
                                        <div className="flex items-center">
                                            Speaker
                                            {sortField === 'speakerName' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('eventTitle')}
                                    >
                                        <div className="flex items-center">
                                            Event
                                            {sortField === 'eventTitle' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('eventDate')}
                                    >
                                        <div className="flex items-center">
                                            Date
                                            {sortField === 'eventDate' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('averageRating')}
                                    >
                                        <div className="flex items-center">
                                            Rating
                                            {sortField === 'averageRating' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                        onClick={() => toggleSort('feedbackCount')}
                                    >
                                        <div className="flex items-center">
                                            Responses
                                            {sortField === 'feedbackCount' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />
                                            )}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTalks.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                            No talks found matching your filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTalks.map((talk) => (
                                        <tr key={talk._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{talk.title}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 relative">
                                                        <Image
                                                            src={talk.speakerImage || '/images/speakers/default.jpg'}
                                                            alt={talk.speakerName}
                                                            fill
                                                            className="object-cover rounded-full"
                                                        />
                                                    </div>
                                                    <div className="ml-3 text-sm text-gray-900">{talk.speakerName}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{talk.eventTitle}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {new Date(talk.eventDate).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {talk.averageRating.toFixed(1)}
                                                    <Star className="ml-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{talk.feedbackCount}</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* All Feedback List */}
                {activeTab === 'allFeedback' && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {filteredFeedback.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                No feedback found matching your filter.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredFeedback.map((feedback) => (
                                    <div key={feedback._id} className="p-6 hover:bg-gray-50">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-medium text-lg">{feedback.talk.title}</h4>
                                                <div className="flex items-center mt-1">
                                                    <div className="relative h-8 w-8 rounded-full overflow-hidden">
                                                        <Image
                                                            src={feedback.speaker.image || '/images/speakers/default.jpg'}
                                                            alt={feedback.speaker.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <span className="ml-2 text-gray-600">{feedback.speaker.name}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                                                {feedback.rating} <Star className="ml-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            </div>
                                        </div>

                                        <div className="flex items-center text-sm text-gray-500 mb-3">
                                            <Calendar size={16} className="mr-1" />
                                            <span className="mr-4">
                                                {new Date(feedback.event.datetime).toLocaleDateString()}
                                            </span>
                                            <Link
                                                href={`/events/${feedback.event._id}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {feedback.event.title}
                                            </Link>
                                        </div>

                                        {feedback.comment && (
                                            <div className="bg-gray-50 p-4 rounded-md text-gray-700 mb-3">
                                                &quot;{feedback.comment}&quot;
                                            </div>
                                        )}

                                        <div className="text-xs text-gray-500">
                                            Submitted: {new Date(feedback.submittedAt).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export const getServerSideProps: GetServerSideProps = async () => {
    // Check if user is authenticated (you would implement your auth logic here)
    // For simplicity, this example doesn't include authentication

    try {
        // Fetch all feedback data using our new query functions
        const feedbackData = await getFeedback();
        const eventStats = await getEventFeedbackStats();
        const speakerStats = await getSpeakerFeedbackStats();
        const talkStats = await getTalkFeedbackStats();

        return {
            props: {
                feedbackData,
                eventStats,
                speakerStats,
                talkStats
            },
        };
    } catch (error) {
        console.error('Error fetching feedback data:', error);
        return {
            props: {
                feedbackData: [],
                eventStats: [],
                speakerStats: [],
                talkStats: [],
                error: 'Failed to load data'
            },
        };
    }
}