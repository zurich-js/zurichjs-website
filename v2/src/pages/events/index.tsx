import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { EventRow } from '@/components/site/EventRow';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { SITE } from '@/data/content';
import { cx } from '@/lib/cx';
import { pastEvents, speakersFor, upcomingEvents } from '@/lib/events';
import { useNow } from '@/lib/hooks';

type Tab = 'upcoming' | 'past';
type Type = 'all' | 'meetup' | 'workshop';

const TABS: { k: Tab; label: string }[] = [
  { k: 'upcoming', label: 'Upcoming' },
  { k: 'past', label: 'Past' },
];
const TYPES: { k: Type; label: string }[] = [
  { k: 'all', label: 'All' },
  { k: 'meetup', label: 'Meetups' },
  { k: 'workshop', label: 'Workshops' },
];

export default function EventsPage() {
  const router = useRouter();
  const now = useNow();
  const tab: Tab = router.query.tab === 'past' ? 'past' : 'upcoming';
  const type: Type = router.query.type === 'meetup' || router.query.type === 'workshop' ? router.query.type : 'all';
  const q = typeof router.query.q === 'string' ? router.query.q : '';

  const set = (patch: Partial<{ tab: Tab; type: Type; q: string }>) => {
    const next = { tab, type, q, ...patch };
    const query: Record<string, string> = {};
    if (next.tab !== 'upcoming') query.tab = next.tab;
    if (next.type !== 'all') query.type = next.type;
    if (next.q) query.q = next.q;
    router.replace({ pathname: '/events', query }, undefined, { shallow: true, scroll: false });
  };

  const rows = useMemo(() => {
    const list = tab === 'upcoming' ? upcomingEvents(now) : pastEvents(now);
    const needle = q.trim().toLowerCase();
    return list.filter((e) => {
      if (type !== 'all' && e.type !== type) return false;
      if (!needle) return true;
      const hay = [e.title, e.description, e.venue?.name, ...e.agenda.map((a) => a.title), ...e.agenda.flatMap((a) => speakersFor(a.talk?.speakerIds ?? []).map((s) => s.name)), ...(e.recap?.talks.map((t) => t.title) ?? [])]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [tab, type, q, now]);

  const title = type === 'workshop' ? 'Workshops' : 'Events';

  return (
    <Layout
      title={title}
      description="ZurichJS meetups and workshops. Every past event keeps its page, speakers and photos."
      opening={<PageOpening title={title} sub="Meetups and workshops. Every past event keeps its page, speakers and photos, so the talks live on long after the night." compact />}
    >
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,104px)] flex flex-col gap-7">
        <div className="flex flex-wrap gap-3 items-center">
          <div role="tablist" aria-label="When" className="flex gap-1 bg-grey rounded-pill p-1">
            {TABS.map((t) => (
              <button
                key={t.k}
                role="tab"
                aria-selected={tab === t.k}
                onClick={() => set({ tab: t.k })}
                className={cx('border-0 cursor-pointer min-h-[40px] px-[18px] rounded-pill font-bold text-[16px]', tab === t.k ? 'bg-black text-white' : 'bg-transparent text-black')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map((c) => (
              <button
                key={c.k}
                aria-pressed={type === c.k}
                onClick={() => set({ type: c.k })}
                className={cx('cursor-pointer min-h-[40px] px-4 rounded-pill border-0 text-black font-bold text-[16px]', type === c.k ? 'bg-yellow' : 'bg-grey hover:bg-[#E2E2E6]')}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="flex-[1_1_240px] flex flex-col">
            <span className="sr-only-label">Search events, talks and speakers</span>
            <input
              type="search"
              value={q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search events, talks, speakers"
              className="min-h-[48px] border border-grey-line rounded-pill px-5 text-[17px] bg-white"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((e) => (
            <EventRow key={e.id} ev={e} now={now} />
          ))}
          {rows.length === 0 && (
            <Surface className="p-7 flex flex-col gap-3">
              <h2 className="m-0 text-[24px] font-bold">{q ? `No events match “${q}”.` : tab === 'upcoming' ? 'Nothing scheduled yet.' : 'No past events of this type.'}</h2>
              <p className="m-0 text-[17px] text-ink-2">{q ? 'Try a speaker name or a topic, or clear the filters.' : 'The next meetup is being planned. It is announced on Meetup first.'}</p>
              <div className="flex gap-2.5 flex-wrap">
                <Button variant="white" onClick={() => set({ q: '', type: 'all' })}>
                  Clear filters
                </Button>
                <Button variant="black" href={SITE.meetupGroupUrl}>
                  Follow the group on Meetup
                </Button>
              </div>
            </Surface>
          )}
        </div>
      </main>
    </Layout>
  );
}
