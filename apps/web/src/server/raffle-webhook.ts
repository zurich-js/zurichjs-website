/**
 * The raffle part of the one Stripe webhook (server/stripe-webhook.ts). It handles only
 * `checkout.session.completed` for raffle payments: metadata `source` zurichjs.com/partners/raffle,
 * or a payment link that belongs to a raffle. It never reads or changes the sponsorship: a raffle
 * payment cannot start, renew or move a sponsorship.
 *
 * A payment is always recorded (funding paid, the quote paid, a ledger row). Anything unusual is a
 * flag for the board, never a lost payment: the sponsorship was no longer eligible (late_payment),
 * the total differs from the quote (amount_mismatch), or the raffle was cancelled, declined or on
 * hold (refund_review). Safe to receive twice (raffle_stripe_events, compare-and-set).
 */
import { eligibility, type RaffleStore } from '@zurichjs/raffle';
import { chfMinor, type FeeStore, type SponsorStore } from '@zurichjs/sponsorship';
import { siteOrigin } from './auth.ts';
import { fail, json, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import { RAFFLE_SOURCE, closeRafflePaymentLink, raffleStore } from './raffle.ts';
import { feeStore } from './sponsor-fees.ts';
import { adminUrl, note, slackText, sponsorStore, zurichDay } from './sponsor.ts';
import type { StripeEvent } from './stripe-webhook.ts';

export interface RaffleWebhookDeps {
  env?: Env;
  raffles?: RaffleStore;
  sponsors?: SponsorStore;
  fees?: FeeStore;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: number;
  log?: (m: string) => void;
}

export async function processRaffleEvent(event: StripeEvent, deps: RaffleWebhookDeps = {}): Promise<Response> {
  if (event.type !== 'checkout.session.completed') return json(200, { ok: true, skipped: true });
  const o = event.data.object;
  const meta = o.metadata as Record<string, string> | undefined;
  const paymentLink = typeof o.payment_link === 'string' ? o.payment_link : null;
  if (meta?.source !== RAFFLE_SOURCE && !paymentLink) return json(200, { ok: true, skipped: true });

  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  let raffles: RaffleStore;
  let sponsors: SponsorStore;
  let fees: FeeStore;
  try {
    raffles = deps.raffles ?? raffleStore(env);
    sponsors = deps.sponsors ?? sponsorStore(env);
    fees = deps.fees ?? feeStore(env);
  } catch (cause) {
    // A payment link that is not a raffle's, on a site without a database: not ours to answer.
    if (cause instanceof MembershipUnavailable) return meta?.source === RAFFLE_SOURCE ? fail(503, 'Raffle database not configured.') : json(200, { ok: true, skipped: true });
    throw cause;
  }
  const actor = { kind: 'stripe', id: event.id } as const;
  const notify = { env, slack: deps.slack, fetch: deps.fetch, log };

  try {
    if (await raffles.stripeEventSeen(event.id)) return json(200, { ok: true, duplicate: true });
    const r = meta?.source === RAFFLE_SOURCE && meta.raffleId ? await raffles.get(meta.raffleId) : paymentLink ? await raffles.byPaymentLink(paymentLink) : null;
    if (!r) {
      if (meta?.source === RAFFLE_SOURCE) log(`[raffle] checkout ${String(o.id)}: no raffle ${meta.raffleId ?? ''}; skipped`);
      return json(200, { ok: true, skipped: true });
    }
    if (o.payment_status !== 'paid') {
      await raffles.markStripeEvent(event.id, event.type);
      return json(200, { ok: true });
    }

    const paid = typeof o.amount_total === 'number' ? o.amount_total : 0;
    const s = await sponsors.get(r.sponsorId);
    const company = s ? `*${slackText(s.companyName)}*` : 'A sponsor';
    const link = adminUrl(siteOrigin(env), r.sponsorId);

    let current = r.funding === 'unpaid' ? await raffles.setFunding(r.id, { from: 'unpaid', to: 'paid', actor, payload: { session: String(o.id) } }) : r;
    // A retry after a failure part-way must not count the payment twice.
    const ref = String(o.id).slice(0, 200);
    if (!(await raffles.ledger(r.id)).some((e) => e.kind === 'payment' && e.reference === ref))
      await raffles.addLedger(r.id, { kind: 'payment', amountMinor: paid, note: 'Card payment (Stripe)', reference: ref }, actor);

    const quoteId = meta?.quoteId ?? r.quoteId;
    const q = quoteId ? await fees.markQuotePaid(quoteId, String(o.id)) : null;
    const quoteMatches = !!q && q.quote.totalMinor === paid && (q.was === 'open' || (q.was === 'paid' && q.quote.stripeRef === String(o.id)));
    if (!quoteMatches) {
      current = await raffles.flag(r.id, 'amount_mismatch', actor, { paid, quote: q?.quote.totalMinor ?? null, was: q?.was ?? null });
      await note(
        `:rotating_light: ${company} paid ${chfMinor(paid)} for a raffle whose current offer is ${q ? chfMinor(q.quote.totalMinor) : 'unknown'}. Recorded; check it. ${link}`,
        notify,
      );
    }
    // Eligibility again at payment: a late payment is kept and flagged, never refused.
    const ok = s ? eligibility(s, zurichDay(deps.now ? new Date(deps.now) : new Date())).ok : false;
    if (!ok) {
      current = await raffles.flag(r.id, 'late_payment', actor, { status: s?.status ?? null });
      await note(
        `:rotating_light: ${company} paid a raffle after their sponsorship stopped being eligible (${s?.status ?? 'unknown'}). Recorded; the board decides. ${link}`,
        notify,
      );
    }
    if (['cancelled', 'declined', 'on_hold'].includes(current.stage)) {
      await raffles.flag(r.id, 'refund_review', actor, { stage: current.stage });
      await note(`:rotating_light: ${company} paid a raffle that is ${current.stage.replace('_', ' ')}. Recorded; refund or move it. ${link}`, notify);
    }
    await closeRafflePaymentLink(current, { env, fetch: deps.fetch });
    if (current.paymentLinkId) await raffles.linkPayment(r.id, null, actor);
    await note(`:gift: ${company} paid their raffle add-on (${chfMinor(paid)}) for ${slackText(r.eventTitle)}. ${link}`, notify);
    await raffles.markStripeEvent(event.id, event.type);
    return json(200, { ok: true });
  } catch (cause) {
    console.error(`[raffle] webhook ${event.type} ${event.id} failed`, cause);
    return fail(500, 'Raffle event failed; Stripe will retry.');
  }
}
