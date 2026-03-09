/* eslint-disable @typescript-eslint/no-explicit-any */

import { format, parseISO, differenceInDays, startOfMonth } from 'date-fns';
import {
    BarChart3,
    Users,
    Clock,
    Tag,
    Search,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    FileText,
    TrendingUp,
    Filter,
    Mic,
    Layers,
    ArrowLeft,
} from 'lucide-react';
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState, useMemo } from 'react';

import Layout from '@/components/layout/Layout';
import { TALK_TOPICS } from '@/components/cfp/constants';
import { getCFPSubmissions, CFPSubmission } from '@/sanity/queries';

interface CFPAnalyticsProps {
    submissions: CFPSubmission[];
}

// --- Helper components ---

function StatCard({ label, value, sublabel, icon: Icon, color }: {
    label: string;
    value: string | number;
    sublabel?: string;
    icon: any;
    color: string;
}) {
    return (
        <div className={`rounded-xl border p-5 ${color}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{label}</span>
                <Icon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
        </div>
    );
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color?: string }[]; maxValue?: number }) {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);
    return (
        <div className="space-y-2">
            {data.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-600 truncate text-right" title={item.label}>
                        {item.label}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${item.color || 'bg-yellow-400'} flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                        >
                            {item.value > 0 && (
                                <span className="text-xs font-medium text-gray-800">{item.value}</span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-800',
        under_review: 'bg-blue-100 text-blue-800',
        accepted: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        waitlisted: 'bg-purple-100 text-purple-800',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status.replace('_', ' ')}
        </span>
    );
}

function LevelBadge({ level }: { level: string }) {
    const styles: Record<string, string> = {
        beginner: 'bg-emerald-100 text-emerald-800',
        intermediate: 'bg-sky-100 text-sky-800',
        advanced: 'bg-violet-100 text-violet-800',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[level] || 'bg-gray-100 text-gray-800'}`}>
            {level}
        </span>
    );
}

// --- Tab Components ---

function OverviewTab({ submissions }: { submissions: CFPSubmission[] }) {
    const total = submissions.length;
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        submissions.forEach(s => {
            counts[s.status] = (counts[s.status] || 0) + 1;
        });
        return counts;
    }, [submissions]);

    const levelCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        submissions.forEach(s => {
            if (s.level) counts[s.level] = (counts[s.level] || 0) + 1;
        });
        return counts;
    }, [submissions]);

    const durationCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        submissions.forEach(s => {
            const dur = s.durationMinutes ? `${s.durationMinutes} min` : 'Unknown';
            counts[dur] = (counts[dur] || 0) + 1;
        });
        return counts;
    }, [submissions]);

    const submissionsByMonth = useMemo(() => {
        const months: Record<string, number> = {};
        submissions.forEach(s => {
            if (s.submittedAt) {
                try {
                    const key = format(startOfMonth(parseISO(s.submittedAt)), 'MMM yyyy');
                    months[key] = (months[key] || 0) + 1;
                } catch {
                    // skip invalid dates
                }
            }
        });
        return Object.entries(months)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .slice(-12);
    }, [submissions]);

    const topTopics = useMemo(() => {
        const counts: Record<string, number> = {};
        submissions.forEach(s => {
            (s.tags || []).forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
    }, [submissions]);

    const pending = statusCounts['pending'] || 0;
    const underReview = statusCounts['under_review'] || 0;
    const accepted = statusCounts['accepted'] || 0;
    const rejected = statusCounts['rejected'] || 0;

    const avgTopicsPerTalk = total > 0
        ? (submissions.reduce((sum, s) => sum + (s.tags?.length || 0), 0) / total).toFixed(1)
        : '0';

    const recentSubmissions = submissions.filter(s => {
        if (!s.submittedAt) return false;
        try {
            return differenceInDays(new Date(), parseISO(s.submittedAt)) <= 30;
        } catch {
            return false;
        }
    });

    const uniqueSpeakers = new Set(submissions.map(s => s.speaker?.email).filter(Boolean)).size;

    return (
        <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Submissions" value={total} sublabel={`${recentSubmissions.length} in last 30 days`} icon={FileText} color="bg-white border-gray-200" />
                <StatCard label="Unique Speakers" value={uniqueSpeakers} sublabel={`${total > 0 ? ((uniqueSpeakers / total) * 100).toFixed(0) : 0}% unique`} icon={Users} color="bg-white border-gray-200" />
                <StatCard label="Pending Review" value={pending + underReview} sublabel={`${pending} pending, ${underReview} in review`} icon={Clock} color="bg-white border-gray-200" />
                <StatCard label="Acceptance Rate" value={total > 0 ? `${((accepted / total) * 100).toFixed(0)}%` : 'N/A'} sublabel={`${accepted} accepted, ${rejected} rejected`} icon={TrendingUp} color="bg-white border-gray-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Funnel */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Layers className="w-5 h-5" /> Submission Funnel
                    </h3>
                    <BarChart
                        data={[
                            { label: 'Pending', value: pending, color: 'bg-amber-400' },
                            { label: 'Under Review', value: underReview, color: 'bg-blue-400' },
                            { label: 'Accepted', value: accepted, color: 'bg-green-400' },
                            { label: 'Waitlisted', value: statusCounts['waitlisted'] || 0, color: 'bg-purple-400' },
                            { label: 'Rejected', value: rejected, color: 'bg-red-400' },
                        ]}
                    />
                </div>

                {/* Level Distribution */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" /> Experience Level
                    </h3>
                    <BarChart
                        data={[
                            { label: 'Beginner', value: levelCounts['beginner'] || 0, color: 'bg-emerald-400' },
                            { label: 'Intermediate', value: levelCounts['intermediate'] || 0, color: 'bg-sky-400' },
                            { label: 'Advanced', value: levelCounts['advanced'] || 0, color: 'bg-violet-400' },
                        ]}
                    />
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-600 mb-3">Talk Duration</h4>
                        <BarChart
                            data={Object.entries(durationCounts)
                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                .map(([label, value]) => ({
                                    label,
                                    value,
                                    color: 'bg-yellow-400',
                                }))}
                        />
                    </div>
                </div>

                {/* Timeline */}
                {submissionsByMonth.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> Submission Timeline
                        </h3>
                        <BarChart
                            data={submissionsByMonth.map(([label, value]) => ({
                                label,
                                value,
                                color: 'bg-yellow-400',
                            }))}
                        />
                    </div>
                )}

                {/* Top Topics */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Tag className="w-5 h-5" /> Top Topics
                    </h3>
                    <BarChart
                        data={topTopics.map(([label, value]) => ({
                            label,
                            value,
                            color: 'bg-yellow-400',
                        }))}
                    />
                    <div className="text-xs text-gray-500 mt-3">
                        Avg. {avgTopicsPerTalk} topics per talk &middot; {TALK_TOPICS.length} available topics
                    </div>
                </div>
            </div>
        </div>
    );
}

function SubmissionsTab({ submissions }: { submissions: CFPSubmission[] }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<string>('submittedAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filtered = useMemo(() => {
        let items = [...submissions];

        if (statusFilter !== 'all') {
            items = items.filter(s => s.status === statusFilter);
        }
        if (levelFilter !== 'all') {
            items = items.filter(s => s.level === levelFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(s =>
                s.title?.toLowerCase().includes(q) ||
                s.description?.toLowerCase().includes(q) ||
                s.speaker?.name?.toLowerCase().includes(q) ||
                s.speaker?.email?.toLowerCase().includes(q) ||
                (s.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        items.sort((a, b) => {
            let aVal: any, bVal: any;
            if (sortField === 'submittedAt') {
                aVal = a.submittedAt || '';
                bVal = b.submittedAt || '';
            } else if (sortField === 'title') {
                aVal = a.title?.toLowerCase() || '';
                bVal = b.title?.toLowerCase() || '';
            } else if (sortField === 'speaker') {
                aVal = a.speaker?.name?.toLowerCase() || '';
                bVal = b.speaker?.name?.toLowerCase() || '';
            } else if (sortField === 'duration') {
                aVal = a.durationMinutes || 0;
                bVal = b.durationMinutes || 0;
            } else {
                aVal = (a as any)[sortField] || '';
                bVal = (b as any)[sortField] || '';
            }

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [submissions, statusFilter, levelFilter, search, sortField, sortDir]);

    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />;
    };

    const statuses = [...new Set(submissions.map(s => s.status))].sort();
    const levels = [...new Set(submissions.map(s => s.level).filter(Boolean))].sort();

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search talks, speakers, topics..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                    >
                        <option value="all">All statuses</option>
                        {statuses.map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                    </select>
                    <select
                        value={levelFilter}
                        onChange={e => setLevelFilter(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                    >
                        <option value="all">All levels</option>
                        {levels.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-gray-500">
                    {filtered.length} of {submissions.length} submissions
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('title')}>
                                    <div className="flex items-center gap-1">Talk <SortIcon field="title" /></div>
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('speaker')}>
                                    <div className="flex items-center gap-1">Speaker <SortIcon field="speaker" /></div>
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('duration')}>
                                    <div className="flex items-center gap-1">Duration <SortIcon field="duration" /></div>
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Level</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('submittedAt')}>
                                    <div className="flex items-center gap-1">Submitted <SortIcon field="submittedAt" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(sub => (
                                <Fragment key={sub._id}>
                                    <tr
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => toggleExpand(sub._id)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {expanded.has(sub._id)
                                                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                                <span className="font-medium text-sm text-gray-900">{sub.title || 'Untitled'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{sub.speaker?.name || 'Unknown'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{sub.durationMinutes ? `${sub.durationMinutes} min` : '—'}</td>
                                        <td className="px-4 py-3"><LevelBadge level={sub.level} /></td>
                                        <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {sub.submittedAt ? format(parseISO(sub.submittedAt), 'MMM d, yyyy') : '—'}
                                        </td>
                                    </tr>
                                    {expanded.has(sub._id) && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-4 bg-gray-50">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{sub.description || 'No description provided.'}</p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {sub.speaker && (
                                                            <div>
                                                                <h4 className="text-sm font-medium text-gray-700 mb-1">Speaker Details</h4>
                                                                <div className="text-sm text-gray-600 space-y-1">
                                                                    <div><strong>{sub.speaker.name}</strong> &middot; {sub.speaker.title || 'No title'}</div>
                                                                    <div>{sub.speaker.email}</div>
                                                                    <div className="flex gap-3">
                                                                        {sub.speaker.linkedin && (
                                                                            <a href={sub.speaker.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                                                                LinkedIn <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        )}
                                                                        {sub.speaker.github && (
                                                                            <a href={sub.speaker.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                                                                GitHub <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        )}
                                                                        {sub.speaker.twitter && (
                                                                            <a href={sub.speaker.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                                                                Twitter <ExternalLink className="w-3 h-3" />
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {sub.tags && sub.tags.length > 0 && (
                                                            <div>
                                                                <h4 className="text-sm font-medium text-gray-700 mb-1">Topics</h4>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {sub.tags.map(tag => (
                                                                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <a
                                                                href={`https://zurichjs.sanity.studio/structure/talkSubmissions;allSubmissions;${sub._id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                                            >
                                                                Open in Sanity Studio <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        No submissions match your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SpeakersTab({ submissions }: { submissions: CFPSubmission[] }) {
    const [search, setSearch] = useState('');

    const speakerData = useMemo(() => {
        const map = new Map<string, {
            name: string;
            email: string;
            title: string;
            linkedin: string;
            github: string;
            twitter: string;
            submissions: CFPSubmission[];
        }>();

        submissions.forEach(s => {
            if (!s.speaker?.email) return;
            const key = s.speaker.email;
            if (!map.has(key)) {
                map.set(key, {
                    name: s.speaker.name,
                    email: s.speaker.email,
                    title: s.speaker.title || '',
                    linkedin: s.speaker.linkedin || '',
                    github: s.speaker.github || '',
                    twitter: s.speaker.twitter || '',
                    submissions: [],
                });
            }
            map.get(key)!.submissions.push(s);
        });

        return [...map.values()].sort((a, b) => b.submissions.length - a.submissions.length);
    }, [submissions]);

    const filtered = useMemo(() => {
        if (!search.trim()) return speakerData;
        const q = search.toLowerCase();
        return speakerData.filter(sp =>
            sp.name.toLowerCase().includes(q) ||
            sp.email.toLowerCase().includes(q) ||
            sp.title.toLowerCase().includes(q)
        );
    }, [speakerData, search]);

    const repeatSpeakers = speakerData.filter(s => s.submissions.length > 1).length;
    const withGithub = speakerData.filter(s => s.github).length;
    const withTwitter = speakerData.filter(s => s.twitter).length;

    return (
        <div className="space-y-6">
            {/* Speaker Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Speakers" value={speakerData.length} icon={Users} color="bg-white border-gray-200" />
                <StatCard label="Repeat Submitters" value={repeatSpeakers} sublabel={`${speakerData.length > 0 ? ((repeatSpeakers / speakerData.length) * 100).toFixed(0) : 0}% of speakers`} icon={Mic} color="bg-white border-gray-200" />
                <StatCard label="With GitHub" value={withGithub} sublabel={`${speakerData.length > 0 ? ((withGithub / speakerData.length) * 100).toFixed(0) : 0}%`} icon={Users} color="bg-white border-gray-200" />
                <StatCard label="With Twitter" value={withTwitter} sublabel={`${speakerData.length > 0 ? ((withTwitter / speakerData.length) * 100).toFixed(0) : 0}%`} icon={Users} color="bg-white border-gray-200" />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search speakers..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                />
            </div>

            {/* Speaker Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(sp => (
                    <div key={sp.email} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="font-medium text-gray-900">{sp.name}</h4>
                                <div className="text-sm text-gray-500">{sp.title}</div>
                                <div className="text-sm text-gray-400">{sp.email}</div>
                            </div>
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                {sp.submissions.length} talk{sp.submissions.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="mt-3 space-y-1">
                            {sp.submissions.map(sub => (
                                <div key={sub._id} className="flex items-center gap-2 text-sm">
                                    <StatusBadge status={sub.status} />
                                    <span className="text-gray-700 truncate">{sub.title}</span>
                                    {sub.durationMinutes > 0 && (
                                        <span className="text-gray-400 text-xs flex-shrink-0">{sub.durationMinutes}m</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {(sp.linkedin || sp.github || sp.twitter) && (
                            <div className="mt-3 pt-2 border-t border-gray-100 flex gap-3">
                                {sp.linkedin && (
                                    <a href={sp.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">LinkedIn</a>
                                )}
                                {sp.github && (
                                    <a href={sp.github} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">GitHub</a>
                                )}
                                {sp.twitter && (
                                    <a href={sp.twitter} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Twitter</a>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-500">No speakers found.</div>
                )}
            </div>
        </div>
    );
}

function TopicsTab({ submissions }: { submissions: CFPSubmission[] }) {
    const topicStats = useMemo(() => {
        const stats = new Map<string, {
            count: number;
            statuses: Record<string, number>;
            levels: Record<string, number>;
        }>();

        // Initialize all available topics
        TALK_TOPICS.forEach(topic => {
            stats.set(topic, { count: 0, statuses: {}, levels: {} });
        });

        submissions.forEach(sub => {
            (sub.tags || []).forEach(tag => {
                const entry = stats.get(tag) || { count: 0, statuses: {}, levels: {} };
                entry.count++;
                entry.statuses[sub.status] = (entry.statuses[sub.status] || 0) + 1;
                if (sub.level) {
                    entry.levels[sub.level] = (entry.levels[sub.level] || 0) + 1;
                }
                stats.set(tag, entry);
            });
        });

        return [...stats.entries()]
            .sort(([, a], [, b]) => b.count - a.count);
    }, [submissions]);

    const coveredTopics = topicStats.filter(([, s]) => s.count > 0).length;
    const uncoveredTopics = topicStats.filter(([, s]) => s.count === 0);

    // Topic co-occurrence: which topics are most commonly paired
    const coOccurrence = useMemo(() => {
        const pairs = new Map<string, number>();
        submissions.forEach(sub => {
            const tags = sub.tags || [];
            for (let i = 0; i < tags.length; i++) {
                for (let j = i + 1; j < tags.length; j++) {
                    const key = [tags[i], tags[j]].sort().join(' + ');
                    pairs.set(key, (pairs.get(key) || 0) + 1);
                }
            }
        });
        return [...pairs.entries()]
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8);
    }, [submissions]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Topics Covered" value={coveredTopics} sublabel={`of ${TALK_TOPICS.length} available`} icon={Tag} color="bg-white border-gray-200" />
                <StatCard label="Uncovered Topics" value={uncoveredTopics.length} sublabel="No submissions yet" icon={Tag} color="bg-white border-gray-200" />
                <StatCard label="Avg Topics / Talk" value={submissions.length > 0 ? (submissions.reduce((s, sub) => s + (sub.tags?.length || 0), 0) / submissions.length).toFixed(1) : '0'} icon={Layers} color="bg-white border-gray-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full topic breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4">Topic Distribution</h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {topicStats
                            .filter(([, s]) => s.count > 0)
                            .map(([topic, stats]) => (
                                <div key={topic} className="flex items-center gap-3">
                                    <div className="w-40 text-sm text-gray-600 truncate text-right" title={topic}>{topic}</div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden flex">
                                        {stats.statuses['accepted'] > 0 && (
                                            <div className="bg-green-400 h-full" style={{ width: `${(stats.statuses['accepted'] / stats.count) * 100}%` }} />
                                        )}
                                        {stats.statuses['pending'] > 0 && (
                                            <div className="bg-amber-400 h-full" style={{ width: `${(stats.statuses['pending'] / stats.count) * 100}%` }} />
                                        )}
                                        {stats.statuses['under_review'] > 0 && (
                                            <div className="bg-blue-400 h-full" style={{ width: `${(stats.statuses['under_review'] / stats.count) * 100}%` }} />
                                        )}
                                        {stats.statuses['rejected'] > 0 && (
                                            <div className="bg-red-400 h-full" style={{ width: `${(stats.statuses['rejected'] / stats.count) * 100}%` }} />
                                        )}
                                        {stats.statuses['waitlisted'] > 0 && (
                                            <div className="bg-purple-400 h-full" style={{ width: `${(stats.statuses['waitlisted'] / stats.count) * 100}%` }} />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 w-8 text-right">{stats.count}</span>
                                </div>
                            ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> Accepted</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Pending</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" /> In Review</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Rejected</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Co-occurrence */}
                    {coOccurrence.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold mb-4">Common Topic Pairings</h3>
                            <BarChart
                                data={coOccurrence.map(([label, value]) => ({
                                    label,
                                    value,
                                    color: 'bg-sky-400',
                                }))}
                            />
                        </div>
                    )}

                    {/* Uncovered Topics */}
                    {uncoveredTopics.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold mb-3">Uncovered Topics</h3>
                            <p className="text-sm text-gray-500 mb-3">These topics have zero submissions — consider targeted outreach.</p>
                            <div className="flex flex-wrap gap-2">
                                {uncoveredTopics.map(([topic]) => (
                                    <span key={topic} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 border border-gray-200">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Main page ---

type TabId = 'overview' | 'submissions' | 'speakers' | 'topics';

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'submissions', label: 'Submissions', icon: FileText },
    { id: 'speakers', label: 'Speakers', icon: Users },
    { id: 'topics', label: 'Topics & Logistics', icon: Tag },
];

// Need Fragment for the expandable rows
import { Fragment } from 'react';

export default function CFPAnalytics({ submissions }: CFPAnalyticsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    return (
        <Layout>
            <div className="container mx-auto px-6 py-20">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Admin
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">CFP Analytics</h1>
                    <p className="text-gray-600 mt-1">
                        Review submissions, speaker demographics, topic coverage, and operational insights.
                    </p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <div className="flex gap-1 -mb-px">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-yellow-500 text-yellow-700'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && <OverviewTab submissions={submissions} />}
                {activeTab === 'submissions' && <SubmissionsTab submissions={submissions} />}
                {activeTab === 'speakers' && <SpeakersTab submissions={submissions} />}
                {activeTab === 'topics' && <TopicsTab submissions={submissions} />}
            </div>
        </Layout>
    );
}

export const getServerSideProps: GetServerSideProps = async () => {
    try {
        const submissions = await getCFPSubmissions();
        return {
            props: {
                submissions: JSON.parse(JSON.stringify(submissions)),
            },
        };
    } catch (error) {
        console.error('Error fetching CFP data:', error);
        return {
            props: {
                submissions: [],
            },
        };
    }
};
