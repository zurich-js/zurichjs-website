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
import { sanityMeetups, type LiveLookup } from './sponsor-coverage.ts';
import { raffleTransaction } from './raffle-transaction.ts';
import { reconcileFee } from './sponsor-offers.ts';
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
  hosts?: LiveLookup;
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
  if (meta?.source !== RAFFLE_SOURCE && (meta?.source || !paymentLink)) return json(200, { ok: true, skipped: true });

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
    const historic = paymentLink ? await fees.quoteByLink(paymentLink) : null;
    let r = meta?.source === RAFFLE_SOURCE && meta.raffleId ? await raffles.get(meta.raffleId) : paymentLink ? await raffles.byPaymentLink(paymentLink) : null;
    if (!r && historic?.subject === 'raffle' && historic.subjectId) r = await raffles.get(historic.subjectId);
    if (!r) {
      if (meta?.source === RAFFLE_SOURCE && o.payment_status === 'paid') {
        if (typeof o.id !== 'string' || typeof o.amount_total !== 'number' || typeof o.currency !== 'string') throw new Error('Incomplete raffle receipt.');
        await raffles.unmatched({
          sessionId: o.id,
          linkId: paymentLink,
          quoteRef: meta.quoteId ?? null,
          raffleRef: meta.raffleId ?? null,
          amountMinor: o.amount_total,
          currency: o.currency,
        });
        await note('A raffle payment could not be matched. Review the receipt in the board raffle list.', notify);
      }
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

    if (typeof o.id !== 'string' || typeof o.amount_total !== 'number' || typeof o.currency !== 'string') throw new Error('Incomplete raffle receipt.');
    const ref = o.id;
    const currency = o.currency;
    const matchedRaffle = r;
    const { current, payment } = await raffleTransaction(env, r.id, deps, async ({ raffles, fees }) => {
      let current = (await raffles.get(matchedRaffle.id))!;
      const quoteId = meta?.quoteId ?? historic?.id ?? current.quoteId;
      const wrongOffer = quoteId !== current.quoteId || !quoteId || (meta?.sponsorId && meta.sponsorId !== current.sponsorId) || current.acceptedVersion !== current.termsVersion;
      const { payment } = await fees.settlePayment({
        reviewReason: wrongOffer ? 'This payment does not name the accepted raffle offer.' : undefined,
        quoteId,
        sponsorId: current.sponsorId,
        subject: 'raffle',
        subjectId: current.id,
        currency,
        amountMinor: paid,
        sessionId: ref,
        paymentIntentId: typeof o.payment_intent === 'string' ? o.payment_intent : null,
        paymentLinkId: paymentLink,
      });
      const seen = (await raffles.ledger(current.id)).some((e) => e.kind === 'payment' && e.reference === ref);
      if (!seen) {
        await raffles.addLedger(current.id, { kind: 'payment', amountMinor: paid, note: `Card payment (${currency.toUpperCase()})`, reference: ref }, actor);
        if (current.funding === 'unpaid') current = await raffles.setFunding(current.id, { from: 'unpaid', to: 'paid', actor, payload: { session: ref } });
      }
      if (payment.outcome !== 'matched' || quoteId !== current.quoteId || (meta?.sponsorId && meta.sponsorId !== current.sponsorId))
        current = await raffles.flag(current.id, 'amount_mismatch', actor, { session: ref, paid });
      return { current, payment };
    });
    if (payment.feeMinor === null && payment.paymentIntentId) await reconcileFee(payment, fees, { env, fetch: deps.fetch }).catch(() => false);
    // Eligibility again at payment: a late payment is kept and flagged, never refused.
    const ok = s ? eligibility(s, zurichDay(deps.now ? new Date(deps.now) : new Date())).ok : false;
    const hosts = await (deps.hosts ?? sanityMeetups(env, deps.fetch))([r.eventId]);
    const host = hosts.find((h) => h.id === r.eventId);
    const unavailable = !host || host.status === 'cancelled' || host.status === 'postponed';
    if (!ok || unavailable) {
      await raffleTransaction(env, matchedRaffle.id, deps, async ({ raffles }) => {
        const held = (await raffles.get(matchedRaffle.id))!;
        if (!ok) await raffles.flag(held.id, 'late_payment', actor, { status: s?.status ?? null });
        if (unavailable) await raffles.flag(held.id, 'meetup_changed', actor);
        if (['offered', 'ready', 'open', 'closed', 'drawn'].includes(held.stage)) {
          await raffles.flag(held.id, 'refund_review', actor);
          await raffles.moveStage(held.id, {
            from: held.stage,
            to: 'on_hold',
            actor,
            reason: unavailable ? 'The host meetup is no longer available.' : 'The sponsorship is no longer eligible.',
          });
        }
      });
      await note(
        `:rotating_light: ${company} paid a raffle ${!ok ? 'after their sponsorship stopped being eligible' : 'whose host meetup is unavailable'}. The receipt is recorded. ${link}`,
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
