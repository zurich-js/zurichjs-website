import { useState, type FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { ChipGroup, TextArea, TextField, filled, isEmail } from '@/components/forms/Field';
import { submitForm } from '@/lib/forms';
import { useNextMeetupHref } from '@/lib/hooks';

type Way = 'night' | 'photos' | 'website' | 'unsure';

/** Volunteer form. After almost every event, someone new offers to help; this is where. */
export default function VolunteerPage() {
  const nextHref = useNextMeetupHref();
  const [f, setF] = useState({ name: '', email: '', way: 'night' as Way, message: '' });
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const bad = { name: tried && !filled(f.name), email: tried && !isEmail(f.email) };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!filled(f.name) || !isEmail(f.email)) return setTried(true);
    const r = await submitForm('contact', { ...f, topic: 'Volunteering', message: f.message || `I’d like to help: ${f.way}` });
    if (r.ok) setSent(true);
  };
  return (
    <Layout
      title="Volunteer"
      description="Help run ZurichJS: on the night, with photos, or with the website."
      opening={<PageOpening title="Volunteer with us" sub="On the night, with photos, or with the website. A couple of hours around a meetup is already a lot." />}
    >
      <main className="px-gut pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)]">
        {!sent ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-[18px] max-w-[640px]">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3.5">
              <TextField label="Your name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={bad.name} error={bad.name ? 'Add your name.' : ''} />
              <TextField label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={bad.email} error={bad.email ? 'Enter an email like name@example.com.' : ''} />
            </div>
            <ChipGroup<Way>
              label="How would you like to help?"
              value={f.way}
              onChange={(way) => setF({ ...f, way })}
              options={[
                { value: 'night', label: 'On the night' },
                { value: 'photos', label: 'Photos or video' },
                { value: 'website', label: 'Website or tooling' },
                { value: 'unsure', label: 'Not sure yet' },
              ]}
            />
            <TextArea label="Anything we should know? (optional)" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            <Button type="submit" variant="black" size="lg" className="self-start">
              Send
            </Button>
          </form>
        ) : (
          <div role="status" className="bg-yellow rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3 max-w-[640px]">
            <div className="text-[28px] font-bold leading-[1.15]">Thanks. We’ll be in touch.</div>
            <p className="m-0 text-[18px] leading-[1.55]">An organiser replies to {f.email} before the next meetup.</p>
            <Button href={nextHref} variant="black" className="self-start mt-1.5 text-[17px]">
              See the next meetup
            </Button>
          </div>
        )}
      </main>
    </Layout>
  );
}
