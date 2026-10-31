import { useRouter } from 'next/router';
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { SITE } from '@/data/content';
import { cx } from '@/lib/cx';
import { useNextMeetupHref } from '@/lib/hooks';
import Link from 'next/link';

const LINKS = [
  { h: 'Upcoming events', d: 'Meetups and workshops.', href: '/events', yellow: true },
  { h: 'Past talks', d: 'Every talk and who gave it.', href: '/events?tab=past' },
  { h: 'Speakers', d: 'Everyone who has spoken.', href: '/speakers' },
  { h: 'Speak at a meetup', d: 'Propose a talk.', href: '/cfp' },
  { h: 'About ZurichJS', d: 'Who runs it and how.', href: '/about' },
  { h: 'Contact', d: 'Reach the organisers.', href: '/contact' },
];

export default function NotFound() {
  const router = useRouter();
  const nextHref = useNextMeetupHref();
  const [q, setQ] = useState('');
  return (
    <Layout
      title="Page not found"
      noIndex
      opening={
        <PageOpening title="We couldn’t find that page" sub="The link may be old, or the page moved when we rebuilt the site. Even JavaScript can’t find everything. Try a search or one of the pages below.">
          <form
            className="flex flex-col gap-4 pt-1 max-w-[640px]"
            onSubmit={(e) => {
              e.preventDefault();
              router.push({ pathname: '/events', query: q ? { q } : {} });
            }}
          >
            <label className="flex items-center gap-2.5 bg-ink rounded-pill pl-[22px] pr-2 min-h-[56px]">
              <span className="sr-only-label">Search events, talks and speakers</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, talks, speakers" className="flex-1 min-w-0 border-0 bg-transparent text-white text-[18px] outline-offset-[6px] placeholder:text-grey-mid" />
              <Button type="submit" variant="yellow" size="sm" className="!border-0">
                Search
              </Button>
            </label>
            <div className="flex flex-wrap gap-3">
              <Button href="/" variant="outline-white" className="text-[17px]">
                Go to the homepage
              </Button>
              <Button href={nextHref} variant="outline-white" className="text-[17px]">
                See the next meetup
              </Button>
            </div>
          </form>
        </PageOpening>
      }
    >
      <main className="px-gut pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)] flex flex-col gap-[22px]">
        <h2 className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">Popular pages</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
          {LINKS.map((l) => (
            <Link key={l.h} href={l.href} className={cx('no-underline text-black text-left rounded-[20px] py-5 px-[22px] flex flex-col gap-1', l.yellow ? 'bg-yellow hover:bg-yellow-hover' : 'bg-grey hover:bg-[#E2E2E6]')}>
              <span className="text-[19px] font-bold">{l.h}</span>
              <span className="text-[16px] leading-[1.45] text-ink-2">{l.d}</span>
            </Link>
          ))}
        </div>
        <p className="m-0 mt-3 text-[17px] leading-[1.55] text-ink-2">
          If you followed a link from our site, tell us at{' '}
          <a href={`mailto:${SITE.email}`} className="font-bold">
            {SITE.email}
          </a>{' '}
          and we will fix it.
        </p>
      </main>
    </Layout>
  );
}
