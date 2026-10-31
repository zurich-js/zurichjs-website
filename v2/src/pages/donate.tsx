import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { ArrowLink } from './about';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cx } from '@/lib/cx';
import { submitForm } from '@/lib/forms';
import { useNextMeetupHref } from '@/lib/hooks';

const AMOUNTS: { v: number | 'custom'; label: string; sub: string }[] = [
  { v: 15, label: 'CHF 15', sub: 'A round of coffees' },
  { v: 25, label: 'CHF 25', sub: 'Drinks for a table' },
  { v: 50, label: 'CHF 50', sub: 'Part of a speaker’s train ticket' },
  { v: 'custom', label: 'Other', sub: 'Your amount' },
];
const GOES = [
  ['Venues', 'Room hire and equipment on nights without a host.'],
  ['Food and drinks', 'Evenings that no sponsor covers.'],
  ['Speakers', 'Travel for speakers from outside Zurich.'],
];
const OTHER = [
  { h: 'Become a member', d: 'Join the Swiss JavaScript Group association.', href: 'https://zurichjs.com/membership' },
  { h: 'Buy a T-shirt', d: 'Wear it to the next meetup.', href: 'https://zurichjs.com/tshirt' },
  { h: 'Host or sponsor a meetup', d: 'For companies.', href: '/partners' },
];

/** Replaces /donate and /buy-us-a-coffee. One-off only; Twint or card through Stripe. */
export default function DonatePage() {
  const nextHref = useNextMeetupHref();
  const [amt, setAmt] = useState<number | 'custom'>(25);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState<'twint' | 'card'>('twint');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const cNum = parseFloat(custom);
  const isCustom = amt === 'custom';
  const valid = !isCustom || (cNum >= 2 && cNum <= 5000);
  const value = isCustom ? (valid ? cNum : null) : amt;

  const submit = async () => {
    if (!valid || !value) return setTried(true);
    setBusy(true);
    setErr('');
    const r = await submitForm('donate', { amountChf: value, method });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    if (r.url) {
      window.location.href = r.url; // Stripe Checkout
      return;
    }
    setPaid(value);
  };

  return (
    <Layout
      title="Support ZurichJS"
      description="Meetups are free to attend. Donations help cover the evenings no sponsor does."
      opening={<PageOpening title="Support ZurichJS" sub="Meetups are free to attend. We started on personal savings; donations help cover the evenings no sponsor does." />}
    >
      <main className="px-gut pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(40px,5vw,80px)] items-start">
        <section aria-labelledby="h-amt" className="bg-grey rounded-[clamp(24px,3vw,36px)] p-[clamp(22px,3.4vw,40px)] flex flex-col gap-[22px]">
          <h2 id="h-amt" className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
            Choose an amount
          </h2>
          <div role="radiogroup" aria-label="Amount" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
            {AMOUNTS.map((a) => {
              const on = amt === a.v;
              return (
                <button
                  key={String(a.v)}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setAmt(a.v);
                    setTried(false);
                  }}
                  className={cx('cursor-pointer min-h-[104px] rounded-card border-2 flex flex-col items-start justify-center gap-1.5 py-[18px] px-[22px] text-left', on ? 'bg-yellow border-black' : 'bg-white border-white hover:border-grey-line')}
                >
                  <span className="text-[28px] leading-none font-bold">{a.label}</span>
                  <span className="text-[16px] leading-[1.35] text-ink-2">{a.sub}</span>
                </button>
              );
            })}
          </div>
          {isCustom && (
            <label className="flex flex-col gap-1.5 text-[16px] font-bold">
              Your amount in CHF
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                aria-invalid={tried && !valid ? true : undefined}
                className={cx('min-h-[52px] border rounded-[14px] px-3.5 text-[20px] font-bold bg-white max-w-[220px]', tried && !valid ? 'border-danger' : 'border-grey-line')}
              />
              <span className={cx('font-normal text-[14px]', tried && !valid ? 'text-danger' : 'text-grey-text')}>{tried && !valid ? 'Enter an amount between CHF 2 and CHF 5000.' : 'Minimum CHF 2.'}</span>
            </label>
          )}
          <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-2">
            <div className="text-[16px] font-bold">Pay with</div>
            <div className="flex gap-2 flex-wrap">
              {(['twint', 'card'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={cx('cursor-pointer min-h-[48px] px-[22px] rounded-pill border border-black font-bold text-[17px]', method === m ? 'bg-black text-white' : 'bg-white text-black')}
                >
                  {m === 'twint' ? 'Twint' : 'Card'}
                </button>
              ))}
            </div>
          </div>
          <Button variant="yellow" className="min-h-[56px] text-[19px]" onClick={submit} disabled={busy}>
            {busy ? 'One moment…' : value ? `Donate CHF ${value} with ${method === 'twint' ? 'Twint' : 'card'}` : 'Donate'}
          </Button>
          {err && (
            <p role="alert" className="m-0 text-[15px] text-danger">
              {err}
            </p>
          )}
          <div className="text-[15px] leading-[1.5] text-ink-2">One-off payment through Stripe. You get a receipt by email.</div>
        </section>

        <div className="flex flex-col gap-[clamp(40px,5vw,56px)]">
          <section aria-labelledby="h-goes" className="flex flex-col gap-[18px]">
            <h2 id="h-goes" className="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
              Where the money goes
            </h2>
            {GOES.map(([h, d]) => (
              <div key={h} className="flex flex-col gap-1">
                <div className="text-[19px] font-bold">{h}</div>
                <div className="text-[17px] leading-[1.55] text-ink-2">{d}</div>
              </div>
            ))}
          </section>
          <section aria-labelledby="h-other" className="flex flex-col gap-3">
            <h2 id="h-other" className="m-0 mb-1 text-[clamp(22px,2.2vw,28px)] leading-[1.2] font-bold">
              Other ways to help
            </h2>
            {OTHER.map((o) => (
              <ArrowLink key={o.h} href={o.href} h={o.h} d={o.d} tone="grey" arrow="white" />
            ))}
          </section>
        </div>
      </main>

      <Modal open={paid !== null} onClose={() => setPaid(null)} labelledBy="dn-h">
        <div role="status" className="flex flex-col gap-3.5">
          <h2 id="dn-h" className="m-0 text-[28px] font-bold">
            Thank you.
          </h2>
          <p className="m-0 text-[17px] leading-[1.55]">Your CHF {paid} goes into the next meetups. Stripe emails your receipt.</p>
          <div className="flex gap-2.5">
            <Button href={nextHref} variant="white" className="flex-1 text-[16px]">
              See the next meetup
            </Button>
            <Button variant="black" className="flex-1 text-[16px]" onClick={() => setPaid(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
