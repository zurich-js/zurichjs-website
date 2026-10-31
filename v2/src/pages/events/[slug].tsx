import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { RatingSheet, type RateTarget } from '@/components/site/RatingSheet';
import { Button } from '@/components/ui/Button';
import { Monogram } from '@/components/ui/Monogram';
import { Photo } from '@/components/ui/Photo';
import { Surface } from '@/components/ui/Surface';
import { EVENTS, SITE } from '@/data/content';
import type { Event } from '@/data/types';
import { track } from '@/lib/analytics';
import { cx } from '@/lib/cx';
import { eventById, eventHref, nextMeetup, presentEvent, recapSummary, speakersFor, usesWorkshopTemplate } from '@/lib/events';
import { dateLong } from '@/lib/format';
import { useCopy, useNow, useStatePreview } from '@/lib/hooks';
import { downloadIcs } from '@/lib/ics';

interface Props {
  eventId: string;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: EVENTS.filter((e) => !usesWorkshopTemplate(e)).map((e) => ({ params: { slug: e.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const ev = eventById(String(params?.slug));
  if (!ev || usesWorkshopTemplate(ev)) return { notFound: true };
  return { props: { eventId: ev.id } };
};

const TONE = { yellow: 'bg-yellow', grey: 'bg-grey', danger: 'bg-danger-soft' } as const;

export default function EventPage({ eventId }: Props) {
  const ev = eventById(eventId)!;
  const now = useNow();
  const preview = useStatePreview();
  const p = presentEvent(ev, now, preview);
  const isPast = p.state === 'past';
  const isLive = p.state === 'live';

  if (isPast) return <RecapView ev={ev} now={now} />;
  return <UpcomingView ev={ev} now={now} p={p} isLive={isLive} />;
}

/* -------------------------------------------------------------------------- */
/* Upcoming / live                                                              */
/* -------------------------------------------------------------------------- */

function UpcomingView({ ev, now, p, isLive }: { ev: Event; now: Date; p: ReturnType<typeof presentEvent>; isLive: boolean }) {
  const router = useRouter();
  const [copied, copy] = useCopy();
  const [rated, setRated] = useState<Record<string, number>>({});
  const [target, setTarget] = useState<RateTarget | null>(null);

  const talks = ev.agenda.map((a, i) => ({ a, i })).filter((x) => x.a.talk);
  const toTarget = (i: number): RateTarget => {
    const a = ev.agenda[i]!;
    return { key: String(i), title: a.title, sub: `${speakersFor(a.talk!.speakerIds).map((s) => s.name).join(', ')} · ${a.time}` };
  };
  const pending = talks.filter((x) => !rated[String(x.i)] && String(x.i) !== target?.key).map((x) => toTarget(x.i));
  const rateFirst = () => {
    const first = talks.find((x) => !rated[String(x.i)]) ?? talks[0];
    if (first) setTarget(toTarget(first.i));
  };

  const url = typeof window !== 'undefined' ? window.location.origin + eventHref(ev) : `https://zurichjs.com${eventHref(ev)}`;
  const share = async () => {
    track({ name: 'share_click', eventId: ev.id });
    const data = { title: `ZurichJS: ${ev.title}`, text: `${p.dateLineShort} · ${p.venueShort}`, url: `${url}?utm_source=share` };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* dismissed */
      }
    } else copy(data.url);
  };

  const primary = (() => {
    switch (p.cta.kind) {
      case 'rsvp':
      case 'waitlist':
        return (
          <Button href={p.cta.href ?? SITE.meetupGroupUrl} variant="yellow" onClick={() => track({ name: 'rsvp_handoff_click', eventId: ev.id })}>
            {p.cta.label}
          </Button>
        );
      case 'follow':
        return (
          <Button href={SITE.meetupGroupUrl} variant="yellow">
            {p.cta.label}
          </Button>
        );
      case 'next':
        return (
          <Button href="/events" variant="yellow">
            {p.cta.label}
          </Button>
        );
      case 'feedback':
        return (
          <>
            <Button variant="yellow" onClick={rateFirst}>
              Rate the talks
            </Button>
            <Button href={`/feedback?event=${ev.slug}`} variant="outline-white">
              Feedback on the evening
            </Button>
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <Layout
      title={ev.title}
      description={`${p.dateLineShort} · ${p.venueShort}. ${ev.description}`}
      opening={
        <PageOpening title={ev.title} crumb={{ label: 'Events', href: '/events', here: p.crumb }} pills={p.pills}>
          <div className="flex flex-col gap-[18px] pt-1">
            <div className="text-[clamp(18px,1.6vw,21px)] leading-[1.5]">
              <b className="text-yellow">{p.whenShort}</b>
              <br />
              <span className="text-grey-mid">
                {p.venueShort}
                {p.venueStreet}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {primary}
              {p.dateKnown && (
                <Button
                  variant="outline-white"
                  className="text-[17px] px-5"
                  onClick={() => {
                    track({ name: 'ics_download', eventId: ev.id });
                    downloadIcs(ev, url);
                  }}
                >
                  Add to calendar
                </Button>
              )}
              <Button variant="outline-white" className="text-[17px] px-5" onClick={share}>
                {copied ? 'Link copied' : 'Share'}
              </Button>
            </div>
            {p.ctaNote && <div className="text-[15px] text-grey-mid">{p.ctaNote}</div>}
          </div>
        </PageOpening>
      }
    >
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,104px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(40px,5vw,72px)] items-start">
        <div className="flex flex-col gap-[clamp(40px,5vw,64px)] col-span-full md:[grid-column:1/-2] min-w-0">
          {p.banner && (
            <div role="status" className={cx('rounded-card py-[22px] px-6 text-black flex flex-col gap-1.5', TONE[p.banner.tone])}>
              <h2 className="m-0 text-[21px] font-bold">{p.banner.title}</h2>
              <p className="m-0 text-[17px] leading-[1.5]">{p.banner.body}</p>
            </div>
          )}

          <section className="flex flex-col gap-3.5">
            <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">About this meetup</h2>
            <p className="m-0 text-[18px] leading-[1.6] text-ink-2 max-w-[680px] text-pretty">{ev.description}</p>
          </section>

          {ev.agenda.length > 0 && (
            <section className="flex flex-col gap-6">
              <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">Programme</h2>
              {ev.agenda.map((a, i) => (
                <div key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-[18px]">
                  <div className="text-[18px] font-bold pt-px">{a.time}</div>
                  <div className="flex flex-col gap-2 min-w-0">
                    <h3 className={cx('m-0 font-bold leading-[1.3] text-pretty', a.talk ? 'text-[22px]' : 'text-[19px]')}>{a.title}</h3>
                    {a.talk && (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-wrap gap-x-[18px] gap-y-2">
                          {speakersFor(a.talk.speakerIds).map((s) => (
                            <Link key={s.id} href={`/speakers/${s.id}`} className="no-underline flex items-center gap-2.5 text-[17px] font-bold text-left">
                              <Monogram initials={s.initials} size="avatar" className="w-9 h-9 flex-none text-[13px]" />
                              <span>
                                <span className="underline underline-offset-[3px]">{s.name}</span> <span className="font-normal text-ink-2">{s.role}</span>
                              </span>
                            </Link>
                          ))}
                        </div>
                        {a.talk.description && <p className="m-0 text-[17px] leading-[1.55] text-ink-2 max-w-[640px]">{a.talk.description}</p>}
                        <div className="text-[15px] text-ink-2">
                          {[`${a.talk.durationMin} min`, a.talk.level, a.talk.language ?? 'English'].filter(Boolean).join(' · ')}
                        </div>
                        {isLive && (
                          <Button variant={rated[String(i)] ? 'grey' : 'yellow'} size="sm" className="self-start mt-1 !border-black" onClick={() => setTarget(toTarget(i))}>
                            {rated[String(i)] ? 'Rated ✓ · change' : 'Rate this talk'}
                          </Button>
                        )}
                      </div>
                    )}
                    {a.note && <p className="m-0 text-[17px] text-ink-2">{a.note}</p>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {ev.practical.length > 0 && (
            <section className="flex flex-col gap-5">
              <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">Good to know</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-x-10 gap-y-[22px]">
                {ev.practical.map((x) => (
                  <div key={x.label} className="flex flex-col gap-1">
                    <h3 className="m-0 text-[18px] font-bold">{x.label}</h3>
                    <p className="m-0 text-[17px] leading-[1.5] text-ink-2">
                      {x.label === 'Code of conduct' ? (
                        <>
                          All ZurichJS events follow our <Link href="/policies/code-of-conduct">code of conduct</Link>.
                        </>
                      ) : (
                        x.value
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside aria-label="Event summary" className="md:sticky md:top-[72px] bg-grey rounded-card p-6 flex flex-col gap-[18px]">
          <div className="flex flex-col gap-0.5">
            <div className="text-[15px] text-ink-2">When</div>
            <div className="text-[19px] font-bold">{p.whenShort}</div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-[15px] text-ink-2">Where</div>
            <div className="text-[19px] font-bold">{p.venueShort}</div>
            {p.venueSub && <div className="text-[16px] text-ink-2">{p.venueSub}</div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[15px] text-ink-2">Cost</div>
              <div className="text-[19px] font-bold">Free</div>
            </div>
            <div>
              <div className="text-[15px] text-ink-2">Status</div>
              <div className="text-[19px] font-bold">{p.stateLabel}</div>
            </div>
          </div>
          {(p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist') && (
            <Button href={p.cta.href ?? SITE.meetupGroupUrl} variant="black" size="lg" onClick={() => track({ name: 'rsvp_handoff_click', eventId: ev.id })}>
              {p.cta.label}
            </Button>
          )}
          {p.cta.kind === 'follow' && (
            <Button href={SITE.meetupGroupUrl} variant="black" size="lg">
              {p.cta.label}
            </Button>
          )}
          {p.cta.kind === 'next' && (
            <Button href="/events" variant="black" size="lg">
              See upcoming events
            </Button>
          )}
          {p.cta.kind === 'feedback' && (
            <Button href={`/feedback?event=${ev.slug}`} variant="black" size="lg">
              Feedback on the evening
            </Button>
          )}
          {p.ctaNote && <div className="text-[15px] leading-[1.5] text-ink-2">{p.ctaNote}</div>}
          <Button variant="link" className="self-start text-[16px]" onClick={() => copy(url)}>
            {copied ? 'Link copied' : 'Copy link'}
          </Button>
        </aside>
      </main>

      <RatingSheet
        eventId={ev.id}
        target={target}
        pending={pending}
        onRated={(k, n) => setRated((r) => ({ ...r, [k]: n }))}
        onNext={(t) => setTarget(t)}
        onClose={() => {
          setTarget(null);
          if (router.query.rate) router.replace(eventHref(ev), undefined, { shallow: true });
        }}
      />
    </Layout>
  );
}

/* -------------------------------------------------------------------------- */
/* Recap (same URL, after the feedback window)                                   */
/* -------------------------------------------------------------------------- */

function RecapView({ ev, now }: { ev: Event; now: Date }) {
  const next = nextMeetup(now);
  const nextP = next ? presentEvent(next, now) : null;
  const talks = ev.recap?.talks ?? [];
  return (
    <Layout
      title={ev.title}
      description={recapSummary(ev)}
      opening={<PageOpening title={ev.title} crumb={{ label: 'Events', href: '/events?tab=past', here: ev.startsAt ? dateLong(ev.startsAt) : 'Past' }} sub={recapSummary(ev)} />}
    >
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,104px)] flex flex-col gap-[clamp(48px,6vw,80px)]">
        {talks.length > 0 && (
          <section className="flex flex-col gap-6">
            <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">Talks</h2>
            {talks.map((t) => (
              <div key={t.title} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-10 gap-y-3.5 items-start">
                <div className="flex flex-col gap-2 col-span-full md:[grid-column:1/-2]">
                  <h3 className="m-0 text-[22px] font-bold leading-[1.3] text-pretty">{t.title}</h3>
                  <div className="flex flex-wrap gap-x-3">
                    {speakersFor(t.speakerIds).map((s) => (
                      <Link key={s.id} href={`/speakers/${s.id}`} className="text-[17px] font-bold underline underline-offset-[3px]">
                        {s.name}
                      </Link>
                    ))}
                  </div>
                  <p className="m-0 text-[17px] leading-[1.55] text-ink-2">{t.summary}</p>
                </div>
                <span className="text-[16px] font-bold text-ink-2">{t.format}</span>
              </div>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-[18px]">
          <div className="flex justify-between items-baseline flex-wrap gap-2.5">
            <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">Photos from the evening</h2>
            <Link href="/media" className="font-bold text-[17px] underline underline-offset-[3px]">
              All photos
            </Link>
          </div>
          {ev.photos.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
              {ev.photos.map((ph, i) => (
                <Photo key={i} photo={ph} className="aspect-[4/3] w-full !rounded-2xl" sizes="(min-width: 800px) 25vw, 100vw" />
              ))}
            </div>
          ) : (
            <Surface className="p-6 text-[17px] text-ink-2">Photos from this evening aren’t online yet. They usually follow within a week.</Surface>
          )}
        </section>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
          <Surface className="p-7 flex flex-col gap-2.5">
            <h2 className="m-0 text-[24px] font-bold">Were you there?</h2>
            <p className="m-0 text-[17px] leading-[1.5] text-ink-2">A few open questions, about five minutes. Speakers read every answer, and it’s how the next one gets better.</p>
            <Button href={`/feedback?event=${ev.slug}`} variant="outline-black" className="self-start text-[17px]">
              Give feedback
            </Button>
          </Surface>
          <Surface tone="yellow" className="p-7 flex flex-col gap-2.5">
            <h2 className="m-0 text-[24px] font-bold">{next ? `Next: ${next.title}` : 'The next meetup is being planned'}</h2>
            <p className="m-0 text-[17px] leading-[1.5]">{next && nextP ? `${nextP.dateLineShort} · ${nextP.venueShort}` : 'It is announced on Meetup first.'}</p>
            <Button href={next ? eventHref(next) : SITE.meetupGroupUrl} variant="black" className="self-start text-[17px]">
              {next ? 'See the next meetup' : 'Follow the group on Meetup'}
            </Button>
          </Surface>
        </section>
      </main>
    </Layout>
  );
}
