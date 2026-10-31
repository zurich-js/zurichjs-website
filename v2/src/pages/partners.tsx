import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { ChipGroup, TextArea, TextField, filled, isEmail } from '@/components/forms/Field';
import { LogoGrid } from '@/components/ui/LogoGrid';
import { Photo } from '@/components/ui/Photo';
import { Surface } from '@/components/ui/Surface';
import { CONFERENCE_STATE, PHOTOS, SITE, SPONSORS } from '@/data/content';
import { confLink, track } from '@/lib/analytics';
import { submitForm } from '@/lib/forms';
import { useNextMeetupHref } from '@/lib/hooks';

type Way = 'host' | 'food' | 'partner' | 'unsure';

const WAYS: { k: Way; h: string; give: string; get: string; yellow?: boolean }[] = [
  { k: 'host', h: 'Host a meetup', give: 'A room with seating, a screen and sound for one evening.', get: 'Your team in the room, a short welcome from the stage, and your logo on the event page and Meetup listing.', yellow: true },
  { k: 'food', h: 'Cover food and drinks', give: 'Pizza, drinks or both for one evening.', get: 'Thanks from the stage and your logo on the event page and on /today.' },
  { k: 'partner', h: 'Community partner', give: 'A contribution toward the season’s meetups, workshops and speaker travel.', get: 'Your logo on the homepage and every event page for the season, and first pick of hosting dates.' },
];

const AUDIENCE = [
  ['75%+', 'full-stack or frontend engineers'],
  ['40%', 'in senior roles'],
  ['60%+', 'with five or more years of experience'],
];
const INTERESTS = ['TypeScript', 'React', 'Node.js', 'Next.js', 'Performance', 'AI integration', 'Testing', 'GraphQL', 'DevOps'];
const HANDLE = [
  ['Speakers and programme', 'We find the speakers and support each one individually, from mentoring and preparation to travel, accommodation and technical checks.'],
  ['Promotion', 'We announce on Meetup, LinkedIn and Slack, and credit you everywhere the event appears.'],
  ['The evening itself', 'Organisers welcome people, run the stage, and look after the code of conduct.'],
  ['Photos afterwards', 'Our photographer shares pictures you can use on your own channels.'],
];

export default function PartnersPage() {
  const nextHref = useNextMeetupHref();
  const [f, setF] = useState({ org: '', name: '', email: '', way: 'host' as Way, msg: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const bad = { org: tried && !filled(f.org), name: tried && !filled(f.name), email: tried && !isEmail(f.email) };
  const valid = filled(f.org) && filled(f.name) && isEmail(f.email);

  const jump = () => document.getElementById('partner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const choose = (k: Way) => {
    setF({ ...f, way: k });
    jump();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return setTried(true);
    setBusy(true);
    setServerError('');
    const r = await submitForm('partners', f);
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track({ name: 'form_submit', form: 'partners' });
    setSent(true);
  };

  return (
    <Layout
      title="Host or support a meetup"
      description="Host a ZurichJS meetup, cover food and drinks, or become a community partner. Your money goes back into the community."
      opening={
        <PageOpening title="Host or support a ZurichJS meetup" sub="By sponsoring, you help us keep events accessible, bring in international expertise, and create opportunities for developers at all levels.">
          <div className="flex flex-wrap gap-3 pt-1.5">
            <Button variant="yellow" grow onClick={jump}>
              Send an inquiry
            </Button>
            <Button href={`mailto:${SITE.email}`} variant="outline-white" grow>
              Email the organisers
            </Button>
          </div>
        </PageOpening>
      }
    >
      <main className="px-gut pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)] flex flex-col gap-[clamp(56px,7vw,96px)]">
        <section aria-labelledby="h-ways" className="flex flex-col gap-7">
          <h2 id="h-ways" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
            Three ways to support a meetup
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
            {WAYS.map((w) => (
              <Surface key={w.k} tone={w.yellow ? 'yellow' : 'grey'} className="p-7 flex flex-col gap-3.5">
                <h3 className="m-0 text-[24px] font-bold">{w.h}</h3>
                <div className="flex flex-col gap-1">
                  <div className="text-[16px] font-bold">You provide</div>
                  <div className="text-[17px] leading-[1.5] text-ink-2">{w.give}</div>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <div className="text-[16px] font-bold">You get</div>
                  <div className="text-[17px] leading-[1.5] text-ink-2">{w.get}</div>
                </div>
                <Button variant={w.yellow ? 'black' : 'white'} size="sm" className="self-start" onClick={() => choose(w.k)}>
                  Choose this
                </Button>
              </Surface>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-aud" className="on-black bg-black text-white rounded-block p-[clamp(24px,4vw,56px)] flex flex-col gap-[clamp(24px,3vw,36px)]">
          <div className="flex flex-col gap-2.5 max-w-[720px]">
            <h2 id="h-aud" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              Who comes to our meetups
            </h2>
            <p className="m-0 text-[18px] leading-[1.55]">Mostly engineers who shape the products they work on.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-10 gap-y-6">
            {AUDIENCE.map(([v, l]) => (
              <div key={l} className="flex flex-col gap-1.5">
                <div className="text-[clamp(44px,5vw,64px)] leading-none font-bold text-yellow">{v}</div>
                <div className="text-[18px] leading-[1.4]">{l}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="text-[17px] font-bold">What they work with</div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <span key={i} className="text-[16px] font-bold py-2 px-4 rounded-pill bg-ink">
                  {i}
                </span>
              ))}
            </div>
          </div>
          <div className="text-[15px] leading-[1.5] text-grey-mid">
            Meetup attendee profile, as published on{' '}
            <a href={SITE.confSponsorshipUrl} target="_blank" rel="noopener" className="text-white">
              conf.zurichjs.com/sponsorship
            </a>
            .
          </div>
        </section>

        <section aria-labelledby="h-handle" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-[clamp(32px,5vw,72px)] items-center">
          <Photo photo={{ ...PHOTOS.conversation, alt: 'Attendees talking after the talks at a hosted ZurichJS meetup' }} className="aspect-[4/3] w-full" />
          <div className="flex flex-col gap-[22px]">
            <h2 id="h-handle" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              What we take care of
            </h2>
            {HANDLE.map(([h, d]) => (
              <div key={h} className="flex flex-col gap-1">
                <div className="text-[20px] font-bold">{h}</div>
                <div className="text-[17px] leading-[1.55] text-ink-2">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-trust" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(28px,4vw,64px)] items-start">
          <div className="flex flex-col gap-3.5">
            <h2 id="h-trust" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              We only work with partners we know and trust
            </h2>
            <p className="m-0 text-[18px] leading-[1.6] text-ink-2">When we recommend and propagate a sponsor’s product, service, or image, it’s because we believe in it ourselves. That’s what makes promotion more effective, because it’s genuine and relevant to the community.</p>
            <p className="m-0 text-[18px] leading-[1.6] text-ink-2">Our role as organizers is to connect people. Sponsors meet developers, speakers meet new audiences, and attendees meet peers they wouldn’t otherwise cross paths with.</p>
          </div>
          <Surface as="figure" tone="yellow" className="m-0 p-7 flex flex-col gap-4 justify-between">
            <blockquote className="m-0 text-[19px] leading-[1.55] text-pretty">“Organizing a workshop and a meetup with the ZurichJS team was a great experience. They took care of everything and are very supportive. The community they are building is truly amazing.”</blockquote>
            <figcaption className="text-[16px] leading-[1.4]">
              <b>Harshil Agrawal</b>
              <br />
              <span className="text-ink-2">Dev Educator, Cloudflare</span>
            </figcaption>
          </Surface>
        </section>

        <section id="partner-form" aria-labelledby="h-pform" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(28px,4vw,64px)] items-start scroll-mt-6">
          <div className="flex flex-col gap-3">
            <h2 id="h-pform" className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
              Tell us how you’d like to help
            </h2>
            <p className="m-0 text-[18px] leading-[1.55] text-ink-2">An organiser replies from {SITE.email} to plan a date and the details. Nothing is agreed until you confirm.</p>
          </div>
          {!sent ? (
            <form onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
              <TextField label="Organisation" autoComplete="organization" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} invalid={bad.org} error={bad.org ? 'Add your company or organisation.' : ''} />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3.5">
                <TextField label="Your name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={bad.name} error={bad.name ? 'Add your name so we know who to reply to.' : ''} />
                <TextField label="Work email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={bad.email} error={bad.email ? 'Enter an email like name@company.com.' : ''} />
              </div>
              <ChipGroup<Way>
                label="How would you like to help?"
                value={f.way}
                onChange={(way) => setF({ ...f, way })}
                options={[
                  { value: 'host', label: 'Host a meetup' },
                  { value: 'food', label: 'Food and drinks' },
                  { value: 'partner', label: 'Community partner' },
                  { value: 'unsure', label: 'Not sure yet' },
                ]}
              />
              <TextArea label="Anything we should know? (optional)" rows={4} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} hint={undefined} error={undefined} />
              <span className="text-[14px] text-grey-text -mt-3">Room size, preferred months, or what your team works on.</span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button type="submit" variant="black" size="lg" grow disabled={busy}>
                  {busy ? 'Sending…' : 'Send inquiry'}
                </Button>
                <span role="alert" className="text-[15px] text-danger">
                  {tried && !valid ? 'Fix the highlighted fields.' : serverError}
                </span>
              </div>
            </form>
          ) : (
            <div role="status" className="bg-yellow rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3">
              <div className="text-[28px] font-bold leading-[1.15]">Thanks, we have your inquiry.</div>
              <p className="m-0 text-[18px] leading-[1.55]">We sent a copy to {f.email}. An organiser will reply to plan the next step.</p>
              <div className="flex flex-wrap gap-2.5 mt-1.5">
                <Button href={nextHref} variant="black" className="text-[17px]">
                  See the next meetup
                </Button>
                <Button href="/about" variant="outline-black" className="text-[17px] !border">
                  About ZurichJS
                </Button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="h-confsp" className="bg-yellow rounded-block p-[clamp(24px,3.6vw,48px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-10 gap-y-5 items-center">
          <div className="flex flex-col gap-2.5">
            <Image src="/images/logo/wordmark-conf.svg" alt="ZurichJS Conf" width={300} height={40} className="h-[26px] w-auto max-w-full self-start" />
            <h2 id="h-confsp" className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
              Reach a European audience too
            </h2>
            <p className="m-0 text-[18px] leading-[1.55]">The conference has its own sponsorship packages, from Supporter to Diamond. You can combine them with meetup support.</p>
          </div>
          <div className="flex justify-end">
            <Button href={confLink('/sponsorship', 'partners')} variant="black" grow onClick={() => track({ name: 'conf_outbound_click', placement: 'partners', confState: CONFERENCE_STATE })}>
              See conference packages ↗
            </Button>
          </div>
        </section>

        <section aria-labelledby="h-cur" className="flex flex-col gap-[18px]">
          <h2 id="h-cur" className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
            Companies who have hosted or supported us
          </h2>
          <LogoGrid sponsors={SPONSORS} />
        </section>
      </main>
    </Layout>
  );
}
