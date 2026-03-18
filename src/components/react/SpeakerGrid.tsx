import { useState, useEffect, useCallback, useMemo } from 'react';

interface SpeakerTalk {
  id: string;
  title: string;
  tags?: string[];
  type?: string;
}

interface Speaker {
  id: string;
  name: string;
  title?: string;
  company?: string;
  image: string;
  talkCount: number;
  talks: SpeakerTalk[];
}

interface SpeakerGridProps {
  speakers: Speaker[];
}

export default function SpeakerGrid({ speakers }: SpeakerGridProps) {
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState('All');

  // Collect all unique tags with counts
  const topicsWithCounts = useMemo(() => {
    const tagMap = new Map<string, number>();
    for (const speaker of speakers) {
      for (const talk of speaker.talks) {
        for (const tag of talk.tags ?? []) {
          tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
        }
      }
    }
    return Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [speakers]);

  // Filter speakers
  const filtered = useMemo(() => {
    let result = speakers;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.title?.toLowerCase().includes(q)) ||
          (s.company?.toLowerCase().includes(q))
      );
    }

    if (activeTopic !== 'All') {
      result = result.filter((s) =>
        s.talks.some((t) => t.tags?.includes(activeTopic))
      );
    }

    return result;
  }, [speakers, search, activeTopic]);

  // Get tags for a speaker (deduplicated, max 3)
  const getSpeakerTags = useCallback((speaker: Speaker) => {
    const tags = new Set<string>();
    for (const talk of speaker.talks) {
      for (const tag of talk.tags ?? []) {
        tags.add(tag);
      }
    }
    return Array.from(tags).slice(0, 3);
  }, []);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('speaker-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div>
      {/* Search bar */}
      <div className="relative max-w-xl mx-auto mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          id="speaker-search"
          type="text"
          placeholder="Search speakers by name, title, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-16 py-3 rounded-xl border-2 border-gray-200 focus:border-[#f7df1e] focus:ring-2 focus:ring-[#f7df1e]/30 outline-none transition-all text-gray-900 bg-white"
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded border border-gray-300 bg-gray-100 text-xs text-gray-500 font-mono">/</kbd>
        </div>
      </div>

      {/* Topic filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        <button
          onClick={() => setActiveTopic('All')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTopic === 'All'
              ? 'bg-gray-900 text-[#f7df1e]'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          All ({speakers.length})
        </button>
        {topicsWithCounts.map(([topic, count]) => (
          <button
            key={topic}
            onClick={() => setActiveTopic(activeTopic === topic ? 'All' : topic)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTopic === topic
                ? 'bg-gray-900 text-[#f7df1e]'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {topic} ({count})
          </button>
        ))}
      </div>

      {/* Speaker cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">
            No speakers found{search ? ` matching "${search}"` : ''}{activeTopic !== 'All' ? ` in "${activeTopic}"` : ''}
          </p>
          <button
            onClick={() => { setSearch(''); setActiveTopic('All'); }}
            className="px-6 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((speaker) => (
            <a
              key={speaker.id}
              href={`/speakers/${speaker.id}`}
              className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:border-[#f7df1e]"
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img
                  src={speaker.image}
                  alt={speaker.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-gray-700 transition-colors">
                  {speaker.name}
                </h3>
                {speaker.title && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{speaker.title}</p>
                )}
                {speaker.company && (
                  <p className="text-xs text-gray-400 mt-0.5">{speaker.company}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-[#f7df1e]">
                    {speaker.talkCount} talk{speaker.talkCount !== 1 ? 's' : ''}
                  </span>
                  {getSpeakerTags(speaker).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
