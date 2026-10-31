import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { HomeHero } from '@/components/site/HomeHero';
import { ConferenceModule } from '@/components/site/ConferenceModule';
import { HostsSection } from '@/components/site/HostsSection';
import { SpeakCta } from '@/components/site/SpeakCta';
import { SpeakerCard } from '@/components/site/SpeakerCard';
import { TalkRow, type TalkRowData } from '@/components/site/TalkRow';
import { Photo } from '@/components/ui/Photo';
import { PHOTOS, SPEAKERS } from '@/data/content';
import { monthYear } from '@/lib/format';
import { eventHref, nextMeetup, pastEvents, speakersFor } from '@/lib/events';
import { useNow } from '@/lib/hooks';

const LIKE = [
  {
    t: 'Talks, then time to talk',
    d: 'Two to four talks, a mix of full-length and lightning, on what’s new and on ideas that stand the test of time. Not always about JavaScript, and always open to everyone. Then food, drinks and meeting who else is building things in your city.',
  },
  { t: 'Every framework, every level', d: 'Juniors to CTOs, frontend to infrastructure. JavaScript is the common ground, and the banner is wide enough for everyone.' },
  {
    t: 'A mini-conference in a meetup room',
    d: 'Speakers from Zurich and well beyond, and every practical detail on the event page before you go: cost, language, how to get there, who to ask.',
  },
];

function recentTalks(now: Date): TalkRowData[] {
  const rows: TalkRowData[] = [];
  for (const ev of pastEvents(now)) {
    for (const t of ev.recap?.talks ?? []) {
      rows.push({ title: t.title, speakers: speakersFor(t.speakerIds), date: ev.startsAt ? monthYear(ev.startsAt) : '', format: t.format.split(' · ')[0] ?? 'Talk', href: eventHref(ev) });
      if (rows.length === 4) return rows;
    }
  }
  return rows;
}

export default function HomePage() {
  const now = useNow();
  const next = nextMeetup(now);
  const talks = recentTalks(now);
  const teaser = SPEAKERS.slice(0, 4);

  return (
    <Layout title="ZurichJS" description="JavaScript meetups in Zurich. Talks, people and a room full of developers you wouldn’t otherwise meet. Free, in English, run by volunteers." opening={<HomeHero next={next} now={now} />}>
      <main className="flex flex-col gap-[clamp(64px,8vw,112px)] pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)]">
        <section aria-labelledby="h-like" className="px-gut grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[clamp(32px,5vw,72px)] items-center">
          <Photo photo={PHOTOS.speaker} className="aspect-[4/3] w-full" />
          <div className="flex flex-col gap-7">
            <h2 id="h-like" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              What happens at a meetup
            </h2>
            {LIKE.map((l) => (
              <div key={l.t} className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[21px] font-bold">{l.t}</h3>
                <p className="m-0 text-[18px] leading-[1.55] text-ink-2 text-pretty">{l.d}</p>
              </div>
            ))}
            <figure className="m-0 flex flex-col gap-2.5">
              <blockquote className="m-0 text-[clamp(20px,1.9vw,24px)] leading-[1.45] font-bold text-pretty">“It felt like a large group of friends because folks knew each other, and were also very welcoming.”</blockquote>
              <figcaption className="text-[16px] text-ink-2">Harshil Agrawal, Dev Educator at Cloudflare</figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="h-talks" className="px-gut flex flex-col gap-7">
          <div className="flex justify-between items-baseline gap-4 flex-wrap">
            <h2 id="h-talks" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              Talks from past meetups
            </h2>
            <Link href="/events?tab=past" className="font-bold text-[18px] underline underline-offset-4">
              All past events
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {talks.map((t) => (
              <TalkRow key={t.title} t={t} />
            ))}
          </div>
        </section>

        <ConferenceModule />

        <section aria-labelledby="h-speakers" className="px-gut flex flex-col gap-7">
          <div className="flex justify-between items-baseline gap-4 flex-wrap">
            <h2 id="h-speakers" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              Meet the speakers
            </h2>
            <Link href="/speakers" className="font-bold text-[18px] underline underline-offset-4">
              All speakers
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] md:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-x-4 gap-y-6">
            {teaser.map((s) => (
              <SpeakerCard key={s.id} speaker={s} meta={s.tagline} />
            ))}
          </div>
          <SpeakCta />
        </section>

        <HostsSection />
      </main>
    </Layout>
  );
}
