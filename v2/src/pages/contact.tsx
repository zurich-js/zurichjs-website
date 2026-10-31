import { useState, type FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { ArrowLink } from './about';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea, TextField, filled, isEmail } from '@/components/forms/Field';
import { CONFERENCE_STATE, SITE } from '@/data/content';
import { confLink } from '@/lib/analytics';
import { submitForm } from '@/lib/forms';

const ROUTES = [
  { h: 'Give a talk', d: 'Propose a talk for a meetup.', href: '/cfp', tone: 'grey' as const },
  { h: 'Host or sponsor', d: 'Rooms, food and community partnerships.', href: '/partners', tone: 'grey' as const },
  { h: 'Report a code of conduct concern', d: 'Handled in confidence by the organisers.', href: '/policies/code-of-conduct', tone: 'yellow' as const },
  { h: 'Conference questions', d: 'Tickets, invoices and the conference CFP.', href: confLink('/contact', 'contact'), tone: 'grey' as const },
];
const TOPICS = ['General question', 'Speaking', 'Hosting or sponsoring', 'Press or media', 'Problem with the website'];

export default function ContactPage() {
  const [f, setF] = useState({ name: '', email: '', topic: TOPICS[0]!, message: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const bad = { name: tried && !filled(f.name), email: tried && !isEmail(f.email), message: tried && !filled(f.message) };
  const valid = filled(f.name) && isEmail(f.email) && filled(f.message);
  void CONFERENCE_STATE;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return setTried(true);
    setBusy(true);
    setServerError('');
    const r = await submitForm('contact', f);
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    setSent(true);
  };

  return (
    <Layout
      title="Contact"
      description="Contact the ZurichJS organisers about a meetup, speaking, hosting or anything else."
      opening={<PageOpening title="Contact the organisers" sub="Questions about a meetup, speaking, hosting or anything else. Real people read these, usually between a day job and the next meetup." />}
    >
      <main className="px-gut pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(40px,5vw,80px)] items-start">
        <section aria-labelledby="h-routes" className="flex flex-col gap-[18px]">
          <h2 id="h-routes" className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
            Faster for these
          </h2>
          <div className="flex flex-col gap-2.5">
            {ROUTES.map((r) => (
              <ArrowLink key={r.h} href={r.href} h={r.h} d={r.d} tone={r.tone} arrow="white" />
            ))}
          </div>
          <p className="m-0 mt-1.5 text-[17px] leading-[1.55] text-ink-2">
            Or email{' '}
            <a href={`mailto:${SITE.email}`} className="font-bold">
              {SITE.email}
            </a>
            . The organisers are volunteers and reply between meetups.
          </p>
        </section>
        <section aria-labelledby="h-cform" className="flex flex-col gap-[18px]">
          <h2 id="h-cform" className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
            Send a message
          </h2>
          {!sent ? (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
                <TextField label="Name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={bad.name} error={bad.name ? 'Add your name.' : ''} />
                <TextField label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={bad.email} error={bad.email ? 'Enter an email like name@example.com.' : ''} />
              </div>
              <SelectField label="Topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectField>
              <TextArea label="Message" rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} invalid={bad.message} error={bad.message ? 'Write a short message.' : ''} />
              <div className="flex flex-wrap gap-3 items-center">
                <Button type="submit" variant="black" size="lg" grow disabled={busy}>
                  {busy ? 'Sending…' : 'Send message'}
                </Button>
                <span role="alert" className="text-[15px] text-danger">
                  {tried && !valid ? 'Fix the highlighted fields.' : serverError}
                </span>
              </div>
            </form>
          ) : (
            <div role="status" className="bg-yellow rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3">
              <div className="text-[28px] font-bold leading-[1.15]">Message sent.</div>
              <p className="m-0 text-[18px] leading-[1.55]">We sent a copy to {f.email}. An organiser will reply by email.</p>
              <Button
                variant="outline-black"
                className="self-start mt-1.5 text-[17px] !border"
                onClick={() => {
                  setSent(false);
                  setTried(false);
                  setF({ ...f, message: '' });
                }}
              >
                Send another message
              </Button>
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}
