import { useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Check } from '@zurichjs/design/islands/Check';
import { ChoiceCard } from '@zurichjs/design/islands/ChoiceCard';
import { SegmentedControl } from '@zurichjs/design/islands/SegmentedControl';
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
    <div class="flex flex-col gap-section">
      <section aria-labelledby="h-tiers" class="flex flex-col gap-6">
        <h2 id="h-tiers" class="m-0 text-section font-bold">
          Choose your membership
        </h2>
        {/* One billing choice for the cards and the Join step: a single pill with a segment per cycle (native radios). */}
        <SegmentedControl legend="Billing" options={BILLING} value={cycle} onChange={setCycle} class="self-center" />
        <div class="grid grid-cols-auto-md gap-4 items-stretch">
          {TIER_KEYS.map((k) => {
            const x = TIERS[k];
            return (
              <ChoiceCard
                key={k}
                name="tier-card"
                level="h3"
                value={k}
                checked={tier === k}
                onChange={() => setTier(k)}
                label={`${x.name}, ${chf(x.fees[cycle])} per ${unit}`}
                title={x.name}
                class="gap-5"
              >
                <p class="m-0 -mt-2 text-compact text-ink-2">{x.tagline}</p>
                <div class="flex flex-col gap-1.5" aria-live="polite">
                  <p class="m-0 flex items-baseline gap-2 flex-wrap">
                    <span class="text-section leading-none font-bold">{chf(x.fees[cycle])}</span>
                    <span class="text-body text-ink-2">per {unit}</span>
                  </p>
                  <p class="m-0 text-compact text-ink-2">
                    {cycle === 'yearly'
                      ? `Save ${chf(perYear(x, 'quarterly') - perYear(x, 'yearly'))} compared with paying quarterly.`
                      : `${chf(perYear(x, 'quarterly'))} over a year.`}
                  </p>
                </div>
                <div class="flex flex-col gap-2">
                  <p class="m-0 text-body font-bold">That’s {chf(x.perMonth)} a month, about</p>
                  <ul class="m-0 p-0 list-none flex flex-col gap-1 text-body text-ink-2">
                    {x.comparisons.map((c) => (
                      <li key={c}>… {c}</li>
                    ))}
                  </ul>
                </div>
                <div class="flex flex-col gap-2.5">
                  {x.benefitsTitle && <p class="m-0 text-body font-bold">{x.benefitsTitle}</p>}
                  <ul class="m-0 p-0 list-none flex flex-col gap-2">
                    {x.benefits.map((b) => (
                      <li key={b} class="flex gap-2.5 items-start text-body">
                        <span aria-hidden="true" class="mt-1 size-5 flex-none rounded-full bg-black text-white flex items-center justify-center">
                          <Check class="size-3" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </ChoiceCard>
            );
          })}
        </div>
      </section>

      <section id="membership-form" aria-labelledby="h-join" class="scroll-mt-6 w-full max-w-form self-center flex flex-col gap-6">
        <div class="flex flex-col gap-3.5 text-center">
          <h2 id="h-join" class="m-0 text-section font-bold">
            Join
          </h2>
          <p class="m-0 text-body text-ink-2 text-pretty">
            Sign in with your email, accept the membership terms and pay securely with Stripe. Your membership starts with the first payment, and you get a certificate of
            membership by email.
          </p>
        </div>

        <div class="flex flex-col items-center gap-3 text-center">
          <p data-join-summary class="m-0 text-card-title font-bold" aria-live="polite">
            {t.name}, {fee}
          </p>
          <Button href={`/membership/account?level=${tier}&cycle=${cycle}`} variant="cta">
            Join as {t.name}
          </Button>
          <p class="m-0 text-compact text-ink-2">Already a member? Sign in there to see your membership.</p>
        </div>
      </section>
    </div>
  );
}
