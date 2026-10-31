import type { GetStaticPaths, GetStaticProps } from 'next';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { Monogram } from '@/components/ui/Monogram';
import { Photo } from '@/components/ui/Photo';
import { Surface } from '@/components/ui/Surface';
import { SPEAKERS } from '@/data/content';
import { eventById, eventHref, presentEvent, speakerById, resolveState } from '@/lib/events';
import { monthYear } from '@/lib/format';
import { useNow } from '@/lib/hooks';

interface Props {
  id: string;
}

export const getStaticPaths: GetStaticPaths = async () => ({ paths: SPEAKERS.map((s) => ({ params: { id: s.id } })), fallback: false });
export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const s = speakerById(String(params?.id));
  return s ? { props: { id: s.id } } : { notFound: true };
};

export default function SpeakerPage({ id }: Props) {
  const s = speakerById(id)!;
  const now = useNow();

  // Upcoming talk: any future event whose agenda lists this speaker.
  const upcoming = (() => {
    for (const evId of ['u-nov-2026']) {
      const ev = eventById(evId);
      if (!ev) continue;
      const st = resolveState(ev, now);
      if (st === 'past' || st === 'cancelled') continue;
      const item = ev.agenda.find((a) => a.talk?.speakerIds.includes(s.id));
      if (item) return { ev, item, p: presentEvent(ev, now) };
    }
    return null;
  })();

  const history = s.talks
    .map((t) => ({ t, ev: eventById(t.eventId) }))
    .sort((a, b) => (b.ev?.startsAt ?? '').localeCompare(a.ev?.startsAt ?? ''));

  return (
    <Layout
      title={s.name}
      description={s.bio}
      opening={<PageOpening title={s.name} crumb={{ label: 'Speakers', href: '/speakers', here: s.name }} sub={`${s.role}${s.company ? ` at ${s.company}` : ''}`} />}
    >
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,104px)] flex flex-col gap-[clamp(40px,5vw,64px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-x-14 gap-y-7 items-start">
          {s.photo ? <Photo photo={s.photo} className="aspect-square w-full max-w-[340px]" sizes="340px" /> : <Monogram initials={s.initials} size="tile" className="max-w-[340px] !text-[88px]" />}
          <div className="flex flex-col gap-[18px] col-span-full md:col-span-2 min-w-0">
            <p className="m-0 text-[19px] leading-[1.6] text-ink-2 max-w-[640px] text-pretty">{s.bio}</p>
            <div className="flex flex-wrap gap-2">
              {s.links.map((l) => (
                <Button key={l.label} href={l.url} variant="grey" size="sm" className="!border-0">
                  {l.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {upcoming && (
          <Surface tone="yellow" className="py-6 px-7 flex flex-wrap gap-x-7 gap-y-4 items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-[17px] font-bold">Speaking next: {upcoming.p.dateLineShort}</div>
              <div className="text-[22px] font-bold leading-[1.25]">{upcoming.item.title}</div>
            </div>
            <Button href={eventHref(upcoming.ev)} variant="black" className="text-[17px]">
              See the meetup
            </Button>
          </Surface>
        )}

        <section className="flex flex-col gap-5">
          <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">Talks at ZurichJS</h2>
          {history.map(({ t, ev }) => (
            <Surface key={t.title} tone="soft" className="flex flex-col gap-1.5 py-[18px] px-5 !rounded-[20px]">
              <div className="text-[16px] text-ink-2">
                {[ev?.startsAt ? monthYear(ev.startsAt) : null, ev?.title, t.format].filter(Boolean).join(' · ')}
              </div>
              <h3 className="m-0 text-[21px] font-bold leading-[1.3] text-pretty">{t.title}</h3>
            </Surface>
          ))}
          {history.length === 0 && <p className="m-0 text-[17px] text-ink-2">No past talks listed yet.</p>}
        </section>

        <Surface className="flex flex-wrap gap-x-6 gap-y-3 justify-between items-center py-6 px-7">
          <p className="m-0 text-[18px]">Want to give a talk like this? First-time speakers are welcome, and we’ll help you get ready.</p>
          <Button href="/cfp" variant="black" className="text-[17px]">
            Propose a talk
          </Button>
        </Surface>
      </main>
    </Layout>
  );
}
