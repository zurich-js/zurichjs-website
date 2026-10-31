import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { SpeakerCard } from '@/components/site/SpeakerCard';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { SPEAKERS } from '@/data/content';

export default function SpeakersPage() {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = SPEAKERS.filter((s) => !needle || `${s.name} ${s.role} ${s.company ?? ''} ${s.topics.join(' ')}`.toLowerCase().includes(needle));

  return (
    <Layout
      title="Speakers"
      description="Everyone who has spoken at ZurichJS, and what they talked about."
      opening={
        <PageOpening
          title="Speakers"
          sub="Half of our speakers travel in from outside Zurich. We’ve hosted contributors from Node.js, Astro and Qwik, alongside Microsoft MVPs and Google Developer Experts. Here they all are, with what they talked about."
          compact
        />
      }
    >
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,104px)] flex flex-col gap-8">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex-[1_1_280px] flex">
            <span className="sr-only-label">Search speakers and topics</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company or topic" className="flex-1 min-w-0 min-h-[48px] border border-grey-line rounded-pill px-5 text-[17px] bg-white" />
          </label>
          <Button href="/cfp" variant="black" className="text-[17px]">
            Speak at a meetup
          </Button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] md:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-x-4 gap-y-8">
          {list.map((s, i) => (
            <SpeakerCard key={s.id} speaker={s} meta={`${s.role} · ${s.talks.length} talk${s.talks.length === 1 ? '' : 's'}`} tone={i % 3 === 0 ? 'yellow' : 'grey'} />
          ))}
        </div>
        {list.length === 0 && (
          <Surface className="p-7 flex flex-col gap-2.5">
            <h2 className="m-0 text-[24px] font-bold">No speakers match “{q}”.</h2>
            <p className="m-0 text-[17px] text-ink-2">Try a first name or a topic like “testing”, or be the first to talk about it.</p>
            <Button href="/cfp" variant="black" className="self-start">
              Propose a talk
            </Button>
          </Surface>
        )}
      </main>
    </Layout>
  );
}
