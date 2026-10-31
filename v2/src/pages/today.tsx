import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { RatingSheet, type RateTarget } from '@/components/site/RatingSheet';
import { Button } from '@/components/ui/Button';
import { LogoGrid } from '@/components/ui/LogoGrid';
import { Surface } from '@/components/ui/Surface';
import { SITE, SPONSORS } from '@/data/content';
import type { Event } from '@/data/types';
import { cx } from '@/lib/cx';
import { eventHref, nextMeetup, nextWorkshop, presentEvent, speakersFor, upcomingEvents } from '@/lib/events';
import { dateLong } from '@/lib/format';
import { usePreviewClock } from '@/lib/hooks';

/** Agenda item start as a Date, on the event's day in Europe/Zurich. */
function itemStart(ev: Event, time: string): Date {
  const base = new Date(ev.startsAt!);
  const [h, m] = time.split(':').map(Number);
  const offsetMatch = /([+-]\d{2}:\d{2})$/.exec(ev.startsAt!);
  const day = ev.startsAt!.slice(0, 10);
  return new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${offsetMatch ? offsetMatch[1] : 'Z'}`) || base;
}

/** The meetup happening today (doors ±1 day), or the next one. */
function tonightsEvent(now: Date): Event | undefined {
  const live = upcomingEvents(now).find((e) => e.type === 'meetup' && e.startsAt && Math.abs(new Date(e.startsAt).getTime() - now.getTime()) < 36 * 3600_000);
  return live ?? nextMeetup(now);
}

export default function TodayPage() {
  const now = usePreviewClock();
  const ev = tonightsEvent(now);
  const [rated, setRated] = useState<Record<string, number>>({});
  const [target, setTarget] = useState<RateTarget | null>(null);

  if (!ev || !ev.startsAt) {
    return (
      <Layout title="Tonight" noIndex opening={<PageOpening title="No meetup tonight" sub="The next one is being planned. It is announced on Meetup first." />}>
        <main className="px-gut py-[clamp(40px,5vw,72px)]">
          <Button href={SITE.meetupGroupUrl} variant="black">
            Follow ZurichJS on Meetup
          </Button>
        </main>
      </Layout>
    );
  }

  const p = presentEvent(ev, now);
  const items = ev.agenda.map((a, i) => ({ ...a, i, at: itemStart(ev, a.time) }));
  const cur = items.reduce((acc, it) => (it.at.getTime() <= now.getTime() ? it.i : acc), -1);
  const doorsAt = items[0]?.at;
  const beforeDoors = cur < 0;
  const wrapped = cur >= items.length - 1 && items[items.length - 1]?.title.toLowerCase() === 'close';
  const nowItem = beforeDoors || wrapped ? null : items[cur];
  const nextItem = items[cur + 1];
  const talks = items.filter((it) => it.talk);
  const toTarget = (i: number): RateTarget => {
    const a = ev.agenda[i]!;
    return { key: String(i), title: a.title, sub: `${speakersFor(a.talk!.speakerIds).map((s) => s.name).join(', ')} · ${a.time}` };
  };
  const startedTalks = talks.filter((t) => t.i <= cur);
  const lastTalk = startedTalks[startedTalks.length - 1];
  const pending = startedTalks.filter((t) => !rated[String(t.i)] && String(t.i) !== target?.key).map((t) => toTarget(t.i));
  const primaryLabel = lastTalk && !rated[String(lastTalk.i)] ? 'Rate this talk' : 'Rate the evening';
  const onPrimary = () => {
    if (lastTalk && !rated[String(lastTalk.i)]) setTarget(toTarget(lastTalk.i));
    else window.location.href = `/feedback?event=${ev.slug}`;
  };
  const ws = nextWorkshop(now);

  return (
    <Layout
      title="Tonight"
      noIndex
      opening={
        <PageOpening title={ev.title}>
          <div className="flex flex-col gap-5 pt-1">
            <div className="text-[clamp(18px,1.6vw,21px)] leading-[1.5]">
              <b className="text-yellow">{p.whenShort}</b>
              <br />
              <span className="text-grey-mid">{p.venueShort}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3 max-w-[880px]">
              <Surface tone="ink" className="py-5 px-[22px] flex flex-col gap-1.5">
                <div className="text-[15px] font-bold text-yellow">{beforeDoors ? `Doors open at ${items[0]?.time ?? '18:30'}` : wrapped ? 'That’s a wrap' : `Now · since ${nowItem!.time}`}</div>
                <div className="text-[22px] leading-[1.25] font-bold text-pretty">{beforeDoors ? 'Find the venue' : wrapped ? 'Thanks for coming tonight' : nowItem!.title}</div>
                <div className="text-[16px] text-[#D4D5DA]">
                  {beforeDoors ? `${p.venueShort}${p.venueStreet}` : wrapped ? 'Rate the talks while they are fresh.' : nowItem!.talk ? speakersFor(nowItem!.talk.speakerIds).map((s) => s.name).join(', ') : nowItem!.note ?? ''}
                </div>
              </Surface>
              {!wrapped && nextItem && (
                <div className="rounded-card py-5 px-[22px] flex flex-col gap-1.5 shadow-[inset_0_0_0_2px_#19191B]">
                  <div className="text-[15px] font-bold text-grey-mid">Next · {nextItem.time}</div>
                  <div className="text-[20px] leading-[1.25] font-bold text-pretty">{nextItem.title}</div>
                  <div className="text-[16px] text-grey-mid">{nextItem.talk ? speakersFor(nextItem.talk.speakerIds).map((s) => s.name).join(', ') : nextItem.note ?? ''}</div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="yellow" grow onClick={onPrimary}>
                {primaryLabel}
              </Button>
              <Button href={eventHref(ev)} variant="outline-white" grow>
                Event details
              </Button>
            </div>
          </div>
        </PageOpening>
      }
    >
      <main className="flex flex-col gap-[clamp(48px,6vw,88px)] pt-[clamp(40px,5vw,72px)] pb-[clamp(24px,4vw,56px)]">
        <section aria-labelledby="h-prog" className="px-gut flex flex-col gap-5">
          <h2 id="h-prog" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
            Tonight&apos;s programme
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((r) => {
              const isNow = r.i === cur && !wrapped;
              const done = r.i < cur || wrapped;
              const canRate = !!r.talk && r.i <= cur;
              return (
                <div key={r.i} className={cx('grid grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[72px_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2.5 md:gap-[18px] items-center py-4 px-[18px] rounded-[20px]', isNow ? 'bg-yellow' : done ? 'bg-white' : 'bg-grey-soft')}>
                  <div className="flex flex-col gap-1 items-start">
                    <span className={cx('text-[18px] font-bold', done && 'text-grey-text')}>{r.time}</span>
                    {isNow && <span className="text-[13px] font-bold py-0.5 px-2.5 rounded-pill bg-black text-yellow">Now</span>}
                  </div>
                  <div className="flex flex-col gap-[3px] min-w-0">
                    <span className={cx('font-bold leading-[1.3] text-pretty', r.talk ? 'text-[19px]' : 'text-[17px]', done && 'text-grey-text')}>{r.title}</span>
                    {(r.talk || r.note) && <span className={cx('text-[16px]', done ? 'text-grey-text' : 'text-ink-2')}>{r.talk ? speakersFor(r.talk.speakerIds).map((s) => s.name).join(', ') : r.note}</span>}
                  </div>
                  {canRate && (
                    <Button variant={rated[String(r.i)] ? 'grey' : 'white'} size="sm" className="justify-self-start md:justify-self-end col-span-full md:col-auto !border-black" onClick={() => setTarget(toTarget(r.i))}>
                      {rated[String(r.i)] ? 'Rated ✓' : 'Rate this talk'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="h-rate" className="mx-gut bg-yellow rounded-block p-[clamp(24px,3.6vw,48px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-10 gap-y-5 items-center">
          <div className="flex flex-col gap-2.5">
            <h2 id="h-rate" className="m-0 text-[clamp(26px,2.8vw,38px)] leading-[1.15] font-bold">
              How was tonight?
            </h2>
            <p className="m-0 text-[18px] leading-[1.55]">One score and a few open questions. Speakers read every comment, and it’s how we make the next one better.</p>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-end">
            <Button href={`/feedback?event=${ev.slug}`} variant="black" grow>
              Rate the evening
            </Button>
          </div>
        </section>

        <section aria-labelledby="h-made" className="px-gut flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="h-made" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
              Tonight is made possible by
            </h2>
            <p className="m-0 text-[18px] text-ink-2">The venue host and partners cover the room, food and drinks.</p>
          </div>
          <LogoGrid sponsors={(ev.hosts ? SPONSORS.filter((s) => ev.hosts!.includes(s.id)) : SPONSORS).slice(0, 4)} />
        </section>

        <section aria-labelledby="h-after" className="px-gut grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
          <h2 id="h-after" className="m-0 mb-1 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold col-span-full">
            Before you head home
          </h2>
          <Surface className="p-6 flex flex-col gap-2.5">
            <div className="text-[21px] font-bold">Keep in touch</div>
            <div className="text-[17px] leading-[1.5] flex-1">Talk between meetups on Slack, or follow along on LinkedIn.</div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <Button href={SITE.slackInviteUrl} variant="black" size="sm">
                Join Slack
              </Button>
              <Button href={SITE.linkedinUrl} variant="white" size="sm">
                LinkedIn
              </Button>
            </div>
          </Surface>
          <Surface className="p-6 flex flex-col gap-2.5">
            <div className="text-[21px] font-bold">Support the community</div>
            <div className="text-[17px] leading-[1.5] flex-1">ZurichJS is a non-profit. Coffee money and T-shirts help pay for the next one.</div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <Button href="/donate" variant="black" size="sm">
                Donate with Twint
              </Button>
              <Button href="https://zurichjs.com/tshirt" variant="white" size="sm">
                Buy a T-shirt
              </Button>
            </div>
          </Surface>
          <Surface tone="black" className="p-6 flex flex-col gap-2.5">
            <div className="text-[21px] font-bold">Coming up</div>
            <div className="text-[17px] leading-[1.5] flex-1">{ws ? `${ws.title}, a half-day workshop on ${ws.startsAt ? dateLong(ws.startsAt) : 'a date to be announced'}.` : 'The next workshop is being planned. Workshops are announced on Meetup first.'}</div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <Button href="/events?type=workshop" variant="yellow" size="sm">
                See workshops
              </Button>
              <Button href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://zurichjs.com${eventHref(ev)}?utm_source=today`)}`} variant="outline-white" size="sm" className="!border">
                Share tonight
              </Button>
            </div>
          </Surface>
        </section>
      </main>

      <RatingSheet eventId={ev.id} target={target} pending={pending} onRated={(k, n) => setRated((r) => ({ ...r, [k]: n }))} onNext={(t) => setTarget(t)} onClose={() => setTarget(null)} />
      {doorsAt && process.env.NODE_ENV !== 'production' && <div className="sr-only">Preview the evening with ?at=YYYY-MM-DDTHH:MM</div>}
    </Layout>
  );
}
