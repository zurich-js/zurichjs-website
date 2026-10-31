import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { Monogram } from '@/components/ui/Monogram';
import { Photo } from '@/components/ui/Photo';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Surface } from '@/components/ui/Surface';
import { MILESTONES, PHOTOS, QUOTES, SITE, TEAM } from '@/data/content';
import { cx } from '@/lib/cx';
import { eventById, eventHref } from '@/lib/events';
import { useNextMeetupHref } from '@/lib/hooks';

const FIRST_STEPS = [
  ['18:30', 'Doors open', 'Grab a drink and a name tag. Plenty of people come alone. Find us in yellow T-shirts if you’d like an introduction.'],
  ['19:00', 'Talks', 'Two to four talks: full-length slots and quick lightning talks, some on what’s new, some on ideas that last. In English, and not always about JavaScript.'],
  ['20:15', 'Food and conversation', 'The part many people come for. Nobody minds if you just listen.'],
  ['21:30', 'Close', 'Free to attend. RSVP on Meetup so the host can plan food and space.'],
];

const VALUES = [
  ['Trust', 'We act responsibly with the trust that members place in us to execute on our mission.', 'grey'],
  ['Authenticity', 'Everyone should feel included. We only promote partners we believe in ourselves.', 'grey'],
  ['Quality', 'Conference-level experiences in a relaxed meetup space.', 'yellow'],
] as const;

const SUPPORT = [
  { h: 'Become a member', d: 'Join the Swiss JavaScript Group association.', href: 'https://zurichjs.com/membership' },
  { h: 'Buy us a coffee', d: 'A small one-off contribution.', href: '/donate' },
  { h: 'Host or sponsor a meetup', d: 'Offer a room, food or a contribution.', href: '/partners' },
];

const TOUCH = [
  { label: 'Meetup', bg: 'bg-[#ED1C40]', href: SITE.meetupGroupUrl },
  { label: 'Slack', bg: 'bg-[#4A154B]', href: SITE.slackInviteUrl },
  { label: 'LinkedIn', bg: 'bg-[#0A66C2]', href: SITE.linkedinUrl },
  { label: 'Instagram', bg: 'bg-[linear-gradient(45deg,#F58529_0%,#DD2A7B_50%,#8134AF_100%)]', href: SITE.instagramUrl },
  { label: 'Bluesky', bg: 'bg-[#1185FE]', href: SITE.blueskyUrl },
];

export default function AboutPage() {
  const nextHref = useNextMeetupHref();
  const involve = [
    { h: 'Come to a meetup', d: 'Free, in English, and fine to come alone.', cta: 'See the next meetup', href: nextHref, tone: 'yellow' as const },
    { h: 'Give a talk', d: 'It doesn’t have to be about JavaScript. First-time speakers get help preparing.', cta: 'Propose a talk', href: '/cfp', tone: 'grey' as const },
    { h: 'Volunteer', d: 'After almost every event, someone new offers to help. On the night, with photos, or with the website.', cta: 'Volunteer with us', href: '/cfv', tone: 'grey' as const },
    { h: 'Meet the speakers', d: 'Everyone who has spoken so far, and what they talked about.', cta: 'Browse speakers', href: '/speakers', tone: 'grey' as const },
  ];

  return (
    <Layout
      title="About"
      description="Who runs ZurichJS, how it started on personal savings, and how to take part."
      opening={
        <PageOpening
          title="JavaScript is the common ground that brought us together"
          sub="On 14 November 2024, we hosted our very first event, powered only by personal savings, donated time, and a lot of late nights. People showed up not just for the tech, but for the chance to connect face-to-face, across backgrounds, languages, and experience levels."
        >
          <div className="flex flex-wrap gap-3 pt-1.5">
            <Button href={nextHref} variant="yellow" grow>
              See the next meetup
            </Button>
            <Button href="#first-visit" variant="outline-white" grow>
              What a first visit is like
            </Button>
          </div>
        </PageOpening>
      }
    >
      <main className="flex flex-col gap-[clamp(64px,8vw,112px)] pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)]">
        {/* First visit */}
        <section id="first-visit" aria-labelledby="h-first" className="px-gut grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[clamp(32px,5vw,72px)] items-center scroll-mt-6">
          <div className="flex flex-col gap-7">
            <h2 id="h-first" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              What your first meetup is like
            </h2>
            <div className="flex flex-col gap-[22px]">
              {FIRST_STEPS.map(([t, h, d]) => (
                <div key={t} className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 items-start">
                  <div className="text-[18px] font-bold pt-0.5">{t}</div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[20px] font-bold">{h}</div>
                    <div className="text-[17px] leading-[1.55] text-ink-2">{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href={nextHref} variant="black" grow>
                See the next meetup
              </Button>
              <Button href="/policies/code-of-conduct" variant="grey" grow>
                Read the code of conduct
              </Button>
            </div>
          </div>
          <Photo photo={PHOTOS.community3} className="aspect-[4/3] w-full" />
        </section>

        {/* Why ZurichJS */}
        <section aria-labelledby="h-why" className="px-gut grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-[clamp(28px,5vw,72px)] items-start">
          <div className="flex flex-col gap-[18px]">
            <h2 id="h-why" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              Why it’s called ZurichJS
            </h2>
            <p className="m-0 text-[18px] leading-[1.55] text-ink-2">People ask this surprisingly often.</p>
            <div className="flex flex-wrap gap-2">
              {['Why not ZurichTS?', 'Why not Zurich Web?', 'Why not Zurich Tech?'].map((q) => (
                <span key={q} className="text-[17px] font-bold py-2 px-4 rounded-pill bg-grey">
                  {q}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 text-[18px] leading-[1.6] text-ink-2 max-w-[640px]">
            <p className="m-0 text-[clamp(22px,2.2vw,28px)] leading-[1.3] font-bold text-black">The short answer is simple: JavaScript is the common ground that brought us together.</p>
            <p className="m-0">Bogdan and Faris first crossed paths at the Zürich ReactJS Meetup. React is a library. Angular is a framework. All of them orbit the same gravity well. JavaScript.</p>
            <p className="m-0">At the time, it was mostly practical. A neutral home base that wasn’t tied to one framework, and most importantly, the Meetup.com group was free!</p>
            <p className="m-0">In the beginning, ZurichJS was just a name. Now it’s a philosophy: accessibility, experimentation, cross-stack thinking, and a welcoming entry point into software.</p>
            <p className="m-0 text-black font-bold">JavaScript just happens to be the banner we stand under. And it turns out that banner is wide enough to welcome everyone.</p>
            <Button href="/about/why-zurichjs" variant="white" className="self-start mt-1 text-[17px]">
              Read the full story
            </Button>
          </div>
        </section>

        {/* Story */}
        <section aria-labelledby="h-story" className="px-gut flex flex-col gap-7">
          <SectionHeading
            id="h-story"
            sub="We started with personal financial investments, a LinkedIn page, an inactive Meetup group with no past events, and good relationships that allowed us to host events. Here’s what happened next."
            action={
              <Button href="/events?tab=past" variant="white">
                Browse all past events
              </Button>
            }
          >
            From a free Meetup group to a Swiss nonprofit
          </SectionHeading>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] md:grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-x-4 gap-y-6">
            {MILESTONES.map((m) => {
              const ev = m.eventId ? eventById(m.eventId) : undefined;
              const inner = (
                <>
                  {m.photo ? (
                    <Photo photo={m.photo} className="aspect-[4/3] w-full !rounded-[20px]" sizes="(min-width: 800px) 25vw, 50vw" />
                  ) : (
                    <span className="w-full aspect-[4/3] rounded-[20px] bg-yellow flex items-end p-[18px] box-border text-[26px] font-bold leading-[1.1]">{m.title}</span>
                  )}
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] text-ink-2">{m.date}</span>
                    <span className="text-[20px] font-bold leading-[1.25] text-pretty">{m.title}</span>
                  </span>
                </>
              );
              return ev ? (
                <Link key={m.title} href={eventHref(ev)} className="no-underline text-black flex flex-col gap-3">
                  {inner}
                </Link>
              ) : (
                <div key={m.title} className="flex flex-col gap-3">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* Values */}
        <section aria-labelledby="h-values" className="px-gut flex flex-col gap-7">
          <SectionHeading id="h-values" sub="We believe a healthy developer community relies on these three pillars.">
            Trust, authenticity, quality
          </SectionHeading>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
            {VALUES.map(([h, d, tone]) => (
              <Surface key={h} tone={tone} className="p-7 flex flex-col gap-2.5">
                <h3 className="m-0 text-[24px] font-bold">{h}</h3>
                <p className="m-0 text-[17px] leading-[1.55]">{d}</p>
              </Surface>
            ))}
          </div>
        </section>

        {/* Team */}
        <section aria-labelledby="h-team" className="px-gut flex flex-col gap-7">
          <SectionHeading
            id="h-team"
            sub="We’ve built everything by volunteering our time and effort. Say hello at the next meetup; we’re the ones in yellow T-shirts."
            action={
              <Button href="/cfv" variant="black">
                Volunteer with us
              </Button>
            }
          >
            The people who run it
          </SectionHeading>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] md:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-x-4 gap-y-7">
            {TEAM.map((m) => (
              <div key={m.name} className="flex flex-col gap-3">
                {m.photo ? <Photo photo={m.photo} className="aspect-square w-full" sizes="(min-width: 800px) 25vw, 50vw" /> : <Monogram initials={m.initials} size="portrait" label={m.name} />}
                <div className="flex flex-col gap-1">
                  <div className="text-[20px] font-bold">{m.name}</div>
                  <div className="text-[16px] text-ink-2">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Nonprofit */}
        <section aria-labelledby="h-verein" className="mx-gut bg-grey rounded-block p-[clamp(24px,4vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-x-12 gap-y-7 items-start">
          <div className="flex flex-col gap-3.5">
            <h2 id="h-verein" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
              A nonprofit, run by volunteers
            </h2>
            <p className="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">
              ZurichJS is a registered non-profit under the Swiss JavaScript Group. All revenue we make goes directly into the conference or venues, speaker travel, workshops, experiences, and the infrastructure that keeps the meetup community running.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {SUPPORT.map((s) => (
              <ArrowLink key={s.h} href={s.href} h={s.h} d={s.d} />
            ))}
          </div>
        </section>

        {/* Quotes */}
        <section aria-labelledby="h-quotes" className="px-gut flex flex-col gap-7">
          <h2 id="h-quotes" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
            What people tell us afterwards
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
            {QUOTES.map((q, i) => (
              <Surface key={q.name} as="figure" tone={i === 0 ? 'yellow' : 'grey'} className="m-0 p-7 flex flex-col gap-4 justify-between">
                <blockquote className="m-0 text-[19px] leading-[1.55] text-pretty">“{q.text}”</blockquote>
                <figcaption className="text-[16px] leading-[1.4]">
                  <b>{q.name}</b>
                  <br />
                  <span className="text-ink-2">{q.role}</span>
                </figcaption>
              </Surface>
            ))}
          </div>
        </section>

        {/* Ways to take part */}
        <section aria-labelledby="h-involved" className="px-gut flex flex-col gap-7">
          <h2 id="h-involved" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
            Ways to take part
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
            {involve.map((w) => (
              <Surface key={w.h} tone={w.tone} className="p-[26px] flex flex-col gap-2.5">
                <div className="text-[22px] font-bold">{w.h}</div>
                <div className="text-[17px] leading-[1.5] text-ink-2 flex-1">{w.d}</div>
                <Button href={w.href} variant={w.tone === 'yellow' ? 'black' : 'white'} size="sm" className="self-start mt-2">
                  {w.cta}
                </Button>
              </Surface>
            ))}
          </div>
        </section>

        {/* Stay in touch */}
        <section aria-labelledby="h-touch" className="px-gut grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-x-12 gap-y-6 items-center">
          <div className="flex flex-col gap-2.5">
            <h2 id="h-touch" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
              Stay in touch between meetups
            </h2>
            <p className="m-0 text-[18px] leading-[1.55] text-ink-2">Meetup.com announces every event. Slack is where the conversation keeps going in between.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {TOUCH.map((t) => (
              <a
                key={t.label}
                href={t.href}
                target="_blank"
                rel="noopener"
                aria-label={`ZurichJS on ${t.label} (opens in a new tab)`}
                className={cx('no-underline min-h-[52px] px-[22px] rounded-pill text-white font-bold text-[19px] flex items-center justify-center hover:brightness-[0.92] flex-[1_1_100%] md:flex-[0_0_auto]', t.bg)}
              >
                {t.label}
              </a>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}

/** White row with a heading, one line and a yellow arrow. */
export function ArrowLink({ href, h, d, tone = 'white', arrow = 'yellow' }: { href: string; h: string; d: string; tone?: 'white' | 'grey' | 'yellow'; arrow?: 'yellow' | 'white' }) {
  const cls = cx(
    'no-underline text-black text-left rounded-[20px] py-[18px] px-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center',
    tone === 'white' ? 'bg-white hover:bg-grey-soft' : tone === 'yellow' ? 'bg-yellow hover:bg-yellow-hover' : 'bg-grey hover:bg-[#E2E2E6]',
  );
  const inner = (
    <>
      <span className="flex col gap-[3px] flex-col">
        <span className="text-[18px] font-bold">{h}</span>
        <span className="text-[16px] leading-[1.45] text-ink-2">{d}</span>
      </span>
      <span aria-hidden="true" className={cx('w-10 h-10 rounded-pill flex items-center justify-center font-bold', arrow === 'yellow' ? 'bg-yellow' : 'bg-white')}>
        →
      </span>
    </>
  );
  return /^https?:/.test(href) ? (
    <a href={href} target="_blank" rel="noopener" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
