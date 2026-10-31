import { useEffect, useState, type FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextArea, TextField, filled, isEmail } from '@/components/forms/Field';
import { Surface } from '@/components/ui/Surface';
import { CONFERENCE, CONFERENCE_STATE } from '@/data/content';
import { confLink, track } from '@/lib/analytics';
import { cx } from '@/lib/cx';
import { submitForm } from '@/lib/forms';
import { useNextMeetupHref } from '@/lib/hooks';

const FORMATS = [
  { v: 5, label: 'Lightning', min: '5 min' },
  { v: 25, label: 'Standard', min: '25 min' },
  { v: 35, label: 'Deep dive', min: '35 min' },
];
const DRAFT_KEY = 'zurichjs-cfp-draft';
const STAGES = [
  ['Received', 'We have your proposal.'],
  ['Accepted', 'An organiser says yes.'],
  ['Scheduled', 'We pick a meetup together.'],
  ['Given', 'It appears on your speaker page.'],
];

interface Draft {
  name: string;
  email: string;
  firstTalk: boolean;
  title: string;
  abstract: string;
  format: number;
}
const EMPTY: Draft = { name: '', email: '', firstTalk: false, title: '', abstract: '', format: 25 };

export default function CfpPage() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const nextHref = useNextMeetupHref();
  const conf = CONFERENCE[CONFERENCE_STATE];

  // The draft lives in this browser only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d]);

  const titleBad = tried && !filled(d.title);
  const emailBad = tried && !isEmail(d.email);
  const nameBad = tried && !filled(d.name);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!filled(d.title) || !isEmail(d.email) || !filled(d.name)) return setTried(true);
    setBusy(true);
    setServerError('');
    const r = await submitForm('cfp', { ...d, format: FORMATS.find((f) => f.v === d.format)?.label ?? 'Standard' });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track({ name: 'form_submit', form: 'cfp' });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const subs = ['Does it have to be about JavaScript? Not really. No account needed, and if you’ve spoken with us before, we match your proposal to your speaker page by email.', 'Step 2 of 2: your proposal.', ''];

  return (
    <Layout title="Speak at a meetup" description="Propose a talk for a ZurichJS meetup. Lightning, standard or deep dive. First-time speakers welcome." opening={<PageOpening title="Speak at a meetup" sub={subs[step] || undefined} />}>
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,104px)]">
        <div className="max-w-[880px] flex flex-col gap-7">
          {step === 0 && (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
                <button type="button" onClick={() => setStep(1)} className="text-left cursor-pointer border-0 bg-yellow rounded-card p-7 flex flex-col gap-2.5">
                  <span className="text-[24px] font-bold">At a ZurichJS meetup</span>
                  <span className="text-[17px] leading-[1.5]">Open all year. Lightning (5 min), standard (25 min) or deep dive (35 min). Good for a first talk.</span>
                  <span className="font-bold text-[17px] mt-1.5 underline underline-offset-[3px]">Start a proposal</span>
                </button>
                <a
                  href={confLink('/cfp', 'cfp')}
                  target="_blank"
                  rel="noopener"
                  onClick={() => track({ name: 'conf_outbound_click', placement: 'cfp', confState: CONFERENCE_STATE })}
                  className="no-underline text-black text-left bg-grey rounded-card p-7 flex flex-col gap-2.5"
                >
                  <span className="text-[24px] font-bold">At ZurichJS Conf</span>
                  <span className="text-[17px] leading-[1.5] text-ink-2">The conference runs its own call for papers. {conf.cfp}</span>
                  <span className="font-bold text-[17px] mt-1.5 underline underline-offset-[3px]">Go to conf.zurichjs.com</span>
                </a>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-12 gap-y-4 pt-3">
                <div className="flex flex-col gap-3">
                  <h2 className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">Does it have to be about JavaScript?</h2>
                  <p className="m-0 text-[18px] leading-[1.6] text-ink-2">
                    Not really. We’ve had talks about Laravel, career development, infrastructure, developer experience, observability and systems architecture. Most of the ideas developers care about go beyond a single language.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <h2 className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">We look after our speakers</h2>
                  <p className="m-0 text-[18px] leading-[1.6] text-ink-2">Every speaker is supported individually, from mentoring and preparation to travel, accommodation, and technical checks. First talk? Even better.</p>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <form onSubmit={submit} noValidate className="flex flex-col gap-8">
              <fieldset className="border-0 p-0 m-0 flex flex-col gap-4">
                <legend className="text-[24px] font-bold mb-3.5 p-0">About you</legend>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
                  <TextField label="Name" autoComplete="name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} invalid={nameBad} error={nameBad ? 'Add your name so we know who to reply to.' : ''} />
                  <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={d.email}
                    onChange={(e) => setD({ ...d, email: e.target.value })}
                    invalid={emailBad}
                    error={emailBad ? 'Enter an email like name@example.com so we can reply.' : ''}
                    hint={!emailBad ? 'Only used to reply and to find your existing speaker page.' : undefined}
                  />
                </div>
                <Checkbox label="This would be my first talk. I’d like help preparing." checked={d.firstTalk} onChange={(e) => setD({ ...d, firstTalk: e.target.checked })} />
              </fieldset>
              <fieldset className="border-0 p-0 m-0 flex flex-col gap-4">
                <legend className="text-[24px] font-bold mb-3.5 p-0">Your talk</legend>
                <TextField label="Title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} invalid={titleBad} error={titleBad ? 'Add a working title. You can change it later.' : ''} />
                <TextArea label="What will people learn?" rows={4} value={d.abstract} onChange={(e) => setD({ ...d, abstract: e.target.value })} error="" hint="Two or three sentences is enough. We use it on the event page." />
                <div role="radiogroup" aria-label="Format" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-2.5">
                  {FORMATS.map((f) => {
                    const on = d.format === f.v;
                    return (
                      <button
                        key={f.v}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setD({ ...d, format: f.v })}
                        className={cx('cursor-pointer text-left min-h-[68px] py-3 px-[18px] rounded-2xl flex flex-col gap-0.5', on ? 'border-2 border-black bg-yellow' : 'border border-grey-line bg-white')}
                      >
                        <span className="font-bold text-[17px]">{f.label}</span>
                        <span className="text-[15px] text-ink-2">{f.min}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-4 items-center">
                <Button type="submit" variant="black" size="lg" disabled={busy}>
                  {busy ? 'Sending…' : 'Send proposal'}
                </Button>
                <Button variant="link" className="text-[17px]" onClick={() => setStep(0)}>
                  Back
                </Button>
                <span className="text-[15px] text-ink-2">Your draft is kept in this browser.</span>
                {serverError && (
                  <span role="alert" className="text-[15px] text-danger">
                    {serverError}
                  </span>
                )}
              </div>
            </form>
          )}

          {step === 2 && (
            <div role="status" className="flex flex-col gap-7">
              <Surface tone="yellow" className="p-7 flex flex-col gap-2">
                <h2 className="m-0 text-[28px] font-bold">Thanks. Your proposal is in.</h2>
                <p className="m-0 text-[18px] leading-[1.5]">We sent a copy to {d.email || 'your email'}. Organisers review proposals when planning each meetup and reply by email either way.</p>
              </Surface>
              <ol className="m-0 p-0 list-none grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-5">
                {STAGES.map(([label, desc], i) => (
                  <li key={label} className="flex flex-col gap-1.5">
                    <span className={cx('w-9 h-9 rounded-full flex items-center justify-center font-bold', i === 0 ? 'bg-yellow' : 'bg-grey')}>{i + 1}</span>
                    <span className="text-[18px] font-bold">{label}</span>
                    <span className="text-[16px] text-ink-2 leading-[1.45]">{desc}</span>
                  </li>
                ))}
              </ol>
              <Button href={nextHref} variant="outline-black" className="self-start text-[17px]">
                Meanwhile, come to the next meetup
              </Button>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
