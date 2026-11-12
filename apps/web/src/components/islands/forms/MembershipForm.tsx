import { useState } from 'preact/hooks';
import { cx } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { SegmentedControl } from '@zurichjs/design/islands/SegmentedControl';
import { Check } from '@zurichjs/design/islands/Check';
import { CYCLES, TIERS, TIER_KEYS, chf, feeLabel, perYear, type Cycle, type TierKey } from '../../../lib/membership.ts';

/** The billing switch: yearly first, as it costs less. */
const BILLING = [...CYCLES].reverse();

/**
 * Tier cards and the Join step on /membership. "Join" leads to /membership/account with the
 * chosen level and cycle (sign in, accept the terms), then Stripe. Online joining is always on
 * (owner, 11th November 2026): the email request form and its PUBLIC_MEMBERSHIP_ONLINE switch
 * are gone; /api/verein-inquiry stays for anything that still posts to it.
 */
export default function MembershipForm() {
  const [tier, setTier] = useState<TierKey>('supporter');
  const [cycle, setCycle] = useState<Cycle>('yearly');
  const t = TIERS[tier];
  const fee = feeLabel(t, cycle);
  const unit = CYCLES.find((c) => c.value === cycle)!.unit;

  return (
    <div class="flex flex-col gap-[clamp(48px,6vw,80px)]">
      <section aria-labelledby="h-tiers" class="flex flex-col gap-6">
        <h2 id="h-tiers" class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
          Choose your membership
        </h2>
        {/* One billing choice for the cards and the form below: a single pill with a segment per cycle. */}
        <SegmentedControl legend="Billing" options={BILLING} value={cycle} onChange={setCycle} class="self-center" />
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4 items-stretch">
          {TIER_KEYS.map((k) => {
            const x = TIERS[k];
            const on = tier === k;
            // The card is the choice (Bogdan's review): a yellow border and a filled radio in the top right when selected.
            return (
              <label
                key={k}
                class={cx(
                  'relative rounded-card p-[clamp(22px,3vw,36px)] pr-[clamp(56px,6vw,72px)] flex flex-col gap-6 bg-white border-[3px] cursor-pointer transition-colors has-focus-visible:outline-3 has-focus-visible:outline-blue has-focus-visible:outline-offset-2',
                  on ? 'border-yellow' : 'border-grey-frame hover:border-grey-mid',
                )}
              >
                <input
                  type="radio"
                  name="tier-card"
                  value={k}
                  checked={on}
                  onChange={() => setTier(k)}
                  aria-label={`${x.name}, ${chf(x.fees[cycle])} per ${unit}`}
                  class="sr-only"
                />
                <span
                  aria-hidden="true"
                  class={cx(
                    'absolute top-[clamp(20px,2.6vw,32px)] right-[clamp(20px,2.6vw,32px)] w-8 h-8 rounded-full flex items-center justify-center border-2',
                    on ? 'bg-black border-black text-white' : 'bg-white border-grey-line',
                  )}
                >
                  {on && <Check class="w-4 h-4" />}
                </span>
                <div class="flex flex-col gap-1">
                  <h3 class="m-0 text-[clamp(26px,2.6vw,34px)] leading-[1.15] font-bold">{x.name}</h3>
                  <p class="m-0 text-[17px] leading-normal text-ink-2">{x.tagline}</p>
                </div>
                <div class="flex flex-col gap-1.5" aria-live="polite">
                  <p class="m-0 flex items-baseline gap-2 flex-wrap">
                    <span class="text-[clamp(40px,4.4vw,56px)] leading-none font-bold">{chf(x.fees[cycle])}</span>
                    <span class="text-[18px] text-ink-2">per {unit}</span>
                  </p>
                  <p class="m-0 text-[16px] text-ink-2 min-h-[1.5em]">
                    {cycle === 'yearly'
                      ? `Save ${chf(perYear(x, 'quarterly') - perYear(x, 'yearly'))} compared with paying quarterly.`
                      : `${chf(perYear(x, 'quarterly'))} over a year.`}
                  </p>
                </div>
                <div class="flex flex-col gap-2">
                  <p class="m-0 text-[18px] font-bold">That’s {chf(x.perMonth)} a month, about</p>
                  <ul class="m-0 p-0 list-none flex flex-col gap-1 text-[17px] leading-[1.45] text-ink-2">
                    {x.comparisons.map((c) => (
                      <li key={c}>… {c}</li>
                    ))}
                  </ul>
                </div>
                <div class="flex flex-col gap-2.5">
                  {x.benefitsTitle && <p class="m-0 text-[17px] font-bold">{x.benefitsTitle}</p>}
                  <ul class="m-0 p-0 list-none flex flex-col gap-2">
                    {x.benefits.map((b) => (
                      <li key={b} class="flex gap-2.5 items-start text-[17px] leading-[1.45]">
                        <span aria-hidden="true" class="mt-[3px] w-5 h-5 flex-none rounded-full bg-black text-white flex items-center justify-center">
                          <Check class="w-3 h-3" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <section
        id="membership-form"
        aria-labelledby="h-join"
        class="scroll-mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(32px,5vw,80px)] items-start"
      >
        <div class="flex flex-col gap-3.5">
          <h2 id="h-join" class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
            Join
          </h2>
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">
            Sign in with your email, accept the membership terms and pay securely with Stripe. Your membership starts with the first payment, and you get a certificate of
            membership by email.
          </p>
        </div>

        <div class="bg-white border border-grey-frame rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-4">
          <p data-join-summary class="m-0 text-[20px] font-bold leading-[1.3]" aria-live="polite">
            {t.name}, {fee}
          </p>
          <Button href={`/membership/account?level=${tier}&cycle=${cycle}`} variant="black" size="lg" class="self-start">
            Join as {t.name}
          </Button>
          <p class="m-0 text-[16px] text-ink-2">Already a member? Sign in there to see your membership.</p>
        </div>
      </section>
    </div>
  );
}
