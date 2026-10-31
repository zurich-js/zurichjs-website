import type { GetStaticPaths, GetStaticProps } from 'next';
import { useState, type FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextArea, TextField, filled, isEmail } from '@/components/forms/Field';
import { Modal } from '@/components/ui/Modal';
import { Monogram } from '@/components/ui/Monogram';
import { Photo } from '@/components/ui/Photo';
import { Surface } from '@/components/ui/Surface';
import { EVENTS } from '@/data/content';
import type { Event } from '@/data/types';
import { cx } from '@/lib/cx';
import { eventById, resolveState, speakerById, usesWorkshopTemplate } from '@/lib/events';
import { chf, dateLong, dateTimeRange, time } from '@/lib/format';
import { submitForm } from '@/lib/forms';
import { useNow, useStatePreview } from '@/lib/hooks';
import { downloadIcs } from '@/lib/ics';
import { track } from '@/lib/analytics';
import { useRouter } from 'next/router';

interface Props {
  eventId: string;
}
export const getStaticPaths: GetStaticPaths = async () => ({ paths: EVENTS.filter(usesWorkshopTemplate).map((e) => ({ params: { slug: e.slug } })), fallback: false });
export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const ev = eventById(String(params?.slug));
  return ev && usesWorkshopTemplate(ev) ? { props: { eventId: ev.id } } : { notFound: true };
};

type WsState = 'onsale' | 'few' | 'soldout' | 'past';

function wsState(ev: Event, now: Date, preview?: string): WsState {
  if (preview === 'past') return 'past';
  if (preview === 'full') return 'soldout';
  if (resolveState(ev, now) === 'past' || resolveState(ev, now) === 'live') return 'past';
  const left = ev.workshop?.seatsLeft;
  if (left === 0) return 'soldout';
  if (left !== null && left !== undefined && left <= 5) return 'few';
  return 'onsale';
}

export default function WorkshopPage({ eventId }: Props) {
  const ev = eventById(eventId)!;
  const ws = ev.workshop!;
  const now = useNow();
  const router = useRouter();
  const preview = useStatePreview();
  const qs = typeof router.query.ws === 'string' && process.env.NODE_ENV !== 'production' ? router.query.ws : undefined;
  const st = qs === 'few' ? 'few' : qs === 'soldout' ? 'soldout' : qs === 'past' ? 'past' : wsState(ev, now, preview);
  const trainer = speakerById(ws.trainerId);
  const canBuy = st === 'onsale' || st === 'few';
  const [sheet, setSheet] = useState<null | 'checkout' | 'paid' | 'waitlist' | 'waitlisted'>(null);

  const note = { onsale: 'Payment by Stripe. Invoices available for companies.', few: 'Only a few seats left. Payment by Stripe.', soldout: 'Sold out. Join the waitlist and we email you, in order, if a seat opens.', past: 'This workshop has taken place. See what’s coming up next.' }[st];
  const when = ev.startsAt ? `${dateLong(ev.startsAt)} · ${time(ev.startsAt)}${ev.endsAt ? `–${time(ev.endsAt)}` : ''}` : 'Date to be announced';
  const venue = ev.venue ? `${ev.venue.name}, ${ev.venue.city}` : 'Venue to be announced';
  const facts = [
    ['Date', ev.startsAt ? dateLong(ev.startsAt) : 'TBA'],
    ['Time', ev.startsAt ? `${time(ev.startsAt)}${ev.endsAt ? `–${time(ev.endsAt)}` : ''}` : 'TBA'],
    ['Where', venue],
    ['Seats', st === 'few' ? `A few left, of ${ws.capacity}` : st === 'soldout' ? `All ${ws.capacity} taken` : `Max. ${ws.capacity} people`],
    ['Language', ws.language],
  ];

  const primary = canBuy ? (
    <Button variant="yellow" grow onClick={() => setSheet('checkout')}>
      Get a ticket
    </Button>
  ) : st === 'soldout' ? (
    <Button variant="yellow" grow onClick={() => setSheet('waitlist')}>
      Join the waitlist
    </Button>
  ) : (
    <Button href="/events?type=workshop" variant="yellow" grow>
      See upcoming workshops
    </Button>
  );

  return (
    <Layout
      title={ev.title}
      description={`${when}. ${ws.whoFor}`}
      opening={
        <PageOpening title={ev.title} crumb={{ label: 'Workshops', href: '/events?type=workshop', here: ev.startsAt ? dateLong(ev.startsAt).replace(/^\w+ /, '') : 'Workshop' }}>
          <div className="flex flex-col gap-[18px] pt-1">
            <div className="text-[clamp(18px,1.6vw,21px)] leading-[1.5]">
              <b className="text-yellow">{when}</b>
              <br />
              <span className="text-grey-mid">
                {venue} · in {ws.language} · max. {ws.capacity} people
              </span>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {primary}
              <span className="text-[18px] font-bold">{st === 'soldout' ? 'Sold out' : st === 'past' ? '' : `${chf(ws.priceChf)} per person`}</span>
            </div>
            <div className="text-[15px] text-grey-mid">{note}</div>
          </div>
        </PageOpening>
      }
    >
      <main className="px-gut pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(40px,5vw,72px)] items-start">
        <div className="col-span-full md:[grid-column:1/-2] flex flex-col gap-[clamp(48px,6vw,72px)] min-w-0">
          <section aria-labelledby="h-learn" className="flex flex-col gap-5">
            <h2 id="h-learn" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
              What you’ll learn
            </h2>
            {ws.learn.map((l, i) => (
              <div key={l.heading} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3.5 items-start">
                <span className="w-10 h-10 rounded-pill bg-yellow flex items-center justify-center font-bold">{i + 1}</span>
                <div className="flex flex-col gap-1 pt-1.5">
                  <div className="text-[19px] font-bold">{l.heading}</div>
                  <div className="text-[17px] leading-[1.55] text-ink-2">{l.detail}</div>
                </div>
              </div>
            ))}
          </section>
          <section aria-labelledby="h-who" className="flex flex-col gap-3.5">
            <h2 id="h-who" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
              Who it’s for
            </h2>
            <p className="m-0 text-[18px] leading-[1.6] text-ink-2 max-w-[680px] text-pretty">{ws.whoFor}</p>
            <Surface className="py-[18px] px-5 text-[17px] leading-[1.55] !rounded-[20px]">
              <b>Bring</b> {ws.bring}
            </Surface>
          </section>
          {trainer && (
            <section aria-labelledby="h-trainer" className="flex flex-col gap-[18px]">
              <h2 id="h-trainer" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
                Your trainer
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)] gap-5 items-start">
                {trainer.photo ? <Photo photo={trainer.photo} className="aspect-square w-full" sizes="160px" /> : <Monogram initials={trainer.initials} size="portrait" tone="blue" className="!text-[40px] !p-4" />}
                <div className="flex flex-col gap-2">
                  <div className="text-[24px] font-bold">{trainer.name}</div>
                  <div className="text-[17px] text-ink-2">{trainer.role}</div>
                  <p className="m-0 text-[17px] leading-[1.55] text-ink-2">{trainer.bio}</p>
                  <Button href={`/speakers/${trainer.id}`} variant="white" size="sm" className="self-start mt-1">
                    Speaker page
                  </Button>
                </div>
              </div>
            </section>
          )}
          <section aria-labelledby="h-wsched" className="flex flex-col gap-2">
            <h2 id="h-wsched" className="m-0 mb-3 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
              Schedule
            </h2>
            {ws.schedule.map((r) => (
              <div key={r.time} className={cx('grid grid-cols-[72px_minmax(0,1fr)] gap-4 py-3.5 px-[18px] rounded-[18px]', r.heading === 'Break' ? 'bg-white' : 'bg-grey-soft')}>
                <span className="text-[17px] font-bold">{r.time}</span>
                <span className="text-[17px] leading-[1.4]">{r.heading}</span>
              </div>
            ))}
          </section>
          <section aria-labelledby="h-wfaq" className="flex flex-col gap-2.5">
            <h2 id="h-wfaq" className="m-0 mb-2 text-[clamp(28px,3vw,40px)] leading-[1.15] font-bold">
              Questions
            </h2>
            {ws.faq.map((q) => (
              <details key={q.q} className="bg-grey rounded-[18px] py-4 px-5">
                <summary className="cursor-pointer text-[18px] font-bold">{q.q}</summary>
                <p className="m-0 mt-2.5 text-[17px] leading-[1.55] text-ink-2">{q.a}</p>
              </details>
            ))}
            <Button href="/policies/refunds" variant="link" className="self-start py-1.5 text-[17px]">
              Read the refund policy
            </Button>
          </section>
        </div>

        <aside aria-label="Ticket" className="md:sticky md:top-16 bg-grey rounded-[28px] p-[26px] flex flex-col gap-[18px]">
          <div className="flex flex-col gap-1">
            <div className="text-[36px] leading-none font-bold">{st === 'soldout' ? 'Sold out' : st === 'past' ? 'Past workshop' : chf(ws.priceChf)}</div>
            <div className="text-[16px] text-ink-2">{st === 'past' ? (ev.startsAt ? dateLong(ev.startsAt) : '') : 'per person'}</div>
          </div>
          {facts.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <div className="text-[15px] text-grey-text">{k}</div>
              <div className="text-[17px] font-bold">{v}</div>
            </div>
          ))}
          {canBuy && (
            <Button variant="black" size="lg" className="text-[17px]" onClick={() => setSheet('checkout')}>
              Get a ticket
            </Button>
          )}
          {st === 'soldout' && (
            <Button variant="black" size="lg" className="text-[17px]" onClick={() => setSheet('waitlist')}>
              Join the waitlist
            </Button>
          )}
          {st === 'past' && (
            <Button href="/events?type=workshop" variant="black" size="lg" className="text-[17px]">
              See upcoming workshops
            </Button>
          )}
          <div className="text-[15px] leading-[1.5] text-ink-2">{note}</div>
        </aside>
      </main>

      <CheckoutSheet ev={ev} open={sheet === 'checkout'} onClose={() => setSheet(null)} onPaid={() => setSheet('paid')} />
      <PaidSheet ev={ev} open={sheet === 'paid'} onClose={() => setSheet(null)} />
      <WaitlistSheet ev={ev} open={sheet === 'waitlist' || sheet === 'waitlisted'} done={sheet === 'waitlisted'} onDone={() => setSheet('waitlisted')} onClose={() => setSheet(null)} />
    </Layout>
  );
}

/* ----------------------------- Checkout ----------------------------------- */

function CheckoutSheet({ ev, open, onClose, onPaid }: { ev: Event; open: boolean; onClose: () => void; onPaid: (qty: number, email: string) => void }) {
  const ws = ev.workshop!;
  const [qty, setQty] = useState(1);
  const [f, setF] = useState({ name: '', email: '', invoice: false, company: '', address: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bad = { name: tried && !filled(f.name), email: tried && !isEmail(f.email) };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!filled(f.name) || !isEmail(f.email)) return setTried(true);
    setBusy(true);
    setErr('');
    const r = await submitForm('checkout', { eventId: ev.id, qty, ...f });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    track({ name: 'form_submit', form: 'checkout' });
    if (r.url) {
      window.location.href = r.url; // Stripe Checkout
      return;
    }
    onPaid(qty, f.email);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="co-h">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="co-h" className="m-0 text-[26px] font-bold">
            Your ticket
          </h2>
          <div className="text-[16px] leading-[1.45] text-ink-2">
            {ev.title} · {ev.startsAt ? `${dateLong(ev.startsAt)}, ${time(ev.startsAt)}` : ''}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 bg-grey rounded-[18px] py-3 px-3.5">
          <span className="text-[17px] font-bold">Tickets</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer ticket" className="w-11 h-11 rounded-pill border border-black bg-white cursor-pointer text-[20px] font-bold">
              −
            </button>
            <span aria-live="polite" className="min-w-[28px] text-center text-[20px] font-bold">
              {qty}
            </span>
            <button type="button" onClick={() => setQty((q) => Math.min(4, q + 1))} aria-label="One more ticket" className="w-11 h-11 rounded-pill border border-black bg-white cursor-pointer text-[20px] font-bold">
              +
            </button>
          </div>
        </div>
        <TextField label="Name on the ticket" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={bad.name} error={bad.name ? 'Add the attendee’s name.' : ''} className="!text-[15px]" />
        <TextField label="Email for ticket and receipt" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={bad.email} error={bad.email ? 'Enter an email for the ticket.' : ''} className="!text-[15px]" />
        <Checkbox label="My company needs an invoice" checked={f.invoice} onChange={(e) => setF({ ...f, invoice: e.target.checked })} className="!text-[16px]" />
        {f.invoice && (
          <div className="flex flex-col gap-2.5">
            <TextField label="Company" autoComplete="organization" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} className="!text-[15px]" />
            <TextArea label="Billing address" rows={2} autoComplete="street-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="!text-[15px]" />
          </div>
        )}
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-[17px] font-bold">Total</span>
          <span className="text-[24px] font-bold">{chf(ws.priceChf * qty)}</span>
        </div>
        <div className="text-[14px] leading-[1.5] text-ink-2">
          Next, you pay on Stripe’s secure page. See the{' '}
          <a href="/policies/refunds" className="underline">
            refund policy
          </a>
          .
        </div>
        {err && (
          <p role="alert" className="m-0 text-[15px] text-danger">
            {err}
          </p>
        )}
        <div className="flex gap-2.5">
          <Button variant="white" className="flex-1 text-[16px]" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="black" className="flex-[1.4] text-[16px]" disabled={busy}>
            {busy ? 'One moment…' : 'Continue to payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PaidSheet({ ev, open, onClose }: { ev: Event; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="paid-h">
      <div role="status" className="flex flex-col gap-3.5">
        <h2 id="paid-h" className="m-0 text-[28px] font-bold">
          You’re in.
        </h2>
        <p className="m-0 text-[17px] leading-[1.55]">Your ticket and the receipt are on their way to your email.</p>
        <Surface tone="yellow" className="py-4 px-[18px] text-[16px] leading-[1.5] !rounded-[20px]">
          <b>{ev.startsAt ? dateTimeRange(ev.startsAt, ev.endsAt) : ''}</b>
          <br />
          {ev.venue ? [ev.venue.name, ev.venue.street, ev.venue.city].filter(Boolean).join(', ') : ''}
        </Surface>
        <div className="flex gap-2.5">
          <Button variant="white" className="flex-1 text-[16px]" onClick={() => downloadIcs(ev, window.location.href)}>
            Add to calendar
          </Button>
          <Button variant="black" className="flex-1 text-[16px]" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function WaitlistSheet({ ev, open, done, onDone, onClose }: { ev: Event; open: boolean; done: boolean; onDone: () => void; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const bad = tried && !isEmail(email);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setTried(true);
    const r = await submitForm('waitlist', { eventId: ev.id, email });
    if (r.ok) onDone();
  };
  return (
    <Modal open={open} onClose={onClose} labelledBy="wl-h">
      {!done ? (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <h2 id="wl-h" className="m-0 text-[26px] font-bold">
            Join the waitlist
          </h2>
          <p className="m-0 text-[17px] leading-[1.55]">We email people in order if a seat opens up. No payment now.</p>
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={bad} error={bad ? 'Enter an email like name@example.com.' : ''} />
          <div className="flex gap-2.5">
            <Button variant="white" className="flex-1 text-[16px]" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="black" className="flex-1 text-[16px]">
              Join the waitlist
            </Button>
          </div>
        </form>
      ) : (
        <div role="status" className="flex flex-col gap-3.5">
          <h2 id="wl-h" className="m-0 text-[26px] font-bold">
            You’re on the list.
          </h2>
          <p className="m-0 text-[17px] leading-[1.55]">We’ll email {email} if a seat opens.</p>
          <Button variant="black" className="text-[16px]" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
