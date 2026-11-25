/**
 * A board offer and its payment link, and the payments made against it (docs/domains/sponsorship/fees.md).
 *
 * One owner: the open quote owns the offer and its link. Making an offer supersedes the open quote,
 * switches off every earlier link (or stops, leaving the new link unmade, when Stripe cannot confirm
 * it), asks Stripe for the link under the quote's idempotency key, and publishes it only if the
 * quote still owns the offer. A retry after a failure half-way reuses the same quote and link.
 *
 * Payments: each Stripe session is recorded once. It pays its quote only when it matches the open
 * quote exactly; otherwise it waits for the board's review and starts nothing by itself.
 */
import {
  estimatedFee,
  quoteFigures,
  type FeeChoice,
  type FeeStore,
  type Quote,
  type QuotePayment,
  type QuoteSubject,
  type Sponsor,
  type SponsorMeetup,
  type SponsorStore,
} from '@zurichjs/sponsorship';
import { bundleTotal } from './sponsor.ts';
import { currentGate } from './sponsor-fees.ts';
import { activeQuoteLinks, actualFee, deactivateLink, PaymentLinkRace, reconcileOfferAttempts, quoteLink, type StripeDeps } from './sponsor-stripe.ts';

/** An earlier payment link could not be switched off, so no new one was made. */
export class LinkStillOpen extends Error {
  constructor() {
    super('We couldn’t switch off the earlier payment link at Stripe, so no new link was made. Try again in a minute.');
    this.name = 'LinkStillOpen';
  }
}

/** The offer was replaced while this request was making its link (two organisers at once). */
export class OfferReplaced extends Error {
  constructor() {
    super('Someone made a newer offer at the same time. Reload the sponsor to see it.');
    this.name = 'OfferReplaced';
  }
}

/** The figures moved between the board's preview and its confirmation (a new tariff, a new bundle). */
export class PreviewChanged extends Error {
  constructor() {
    super('The amounts changed since you checked them. Check the new amounts and confirm again.');
    this.name = 'PreviewChanged';
  }
}

export const sponsorshipPurpose = (meetups: SponsorMeetup[]) => `Sponsorship of ${meetups.length === 1 ? 'one meetup' : `${meetups.length} meetups`}`;

/**
 * The board's preview of an offer: the authoritative figures (the same computation the offer
 * freezes) and, when a tariff is entered, what the card payment should cost and leave.
 */
export async function previewOffer(s: Sponsor, meetups: SponsorMeetup[], choice: FeeChoice, fees: FeeStore, env: Record<string, string | undefined>) {
  const gate = await currentGate(fees, env);
  const figures = quoteFigures(bundleTotal(s, meetups) * 100, choice, gate);
  const tariff = gate.open ? gate.tariff : await fees.latestTariff();
  const fee = tariff ? estimatedFee(figures.totalMinor, tariff) : null;
  return {
    figures,
    purpose: sponsorshipPurpose(meetups),
    estimate: tariff && fee !== null ? { tariffVersion: tariff.version, feeMinor: fee, netMinor: figures.totalMinor - fee } : null,
  };
}

/** Switches off every link of this offer's subject that no open quote owns. Throws LinkStillOpen when Stripe does not confirm. */
export async function closeStaleLinks(s: Sponsor, subject: QuoteSubject, subjectId: string | null, fees: FeeStore, store: SponsorStore, stripe: StripeDeps): Promise<void> {
  for (const q of await fees.linksToClose(s.id, subject, subjectId)) {
    try {
      const ids = q.linkId ? [q.linkId] : await activeQuoteLinks([q.id], stripe);
      for (const id of ids) await deactivateLink(id, stripe);
    } catch {
      throw new LinkStillOpen();
    }
    if (q.linkId && subject === 'sponsorship')
      await store.linkStripeIf(s.id, { paymentLinkId: q.linkId }, { paymentLinkId: null, paymentLinkUrl: null }, { kind: 'stripe', id: q.linkId });
    await fees.linkClosed(q.id);
  }
  // A link made before quotes owned their links is on the sponsor only.
  if (subject === 'sponsorship' && s.paymentLinkId && !(await fees.quoteByLink(s.paymentLinkId))) {
    await deactivateLink(s.paymentLinkId, stripe).catch(() => {
      throw new LinkStillOpen();
    });
    await store.linkStripeIf(s.id, { paymentLinkId: s.paymentLinkId }, { paymentLinkId: null, paymentLinkUrl: null }, { kind: 'stripe', id: s.paymentLinkId });
  }
}

/**
 * The board's offer for a one-time sponsorship: freezes the quote, makes its link and publishes it.
 * `expectTotalMinor` is the total the board saw in the preview; a different total is refused.
 */
export async function publishOffer(
  s: Sponsor,
  meetups: SponsorMeetup[],
  choice: FeeChoice,
  expectTotalMinor: number,
  ctx: { fees: FeeStore; store: SponsorStore; stripe: StripeDeps; origin: string; requestId: string; env: Record<string, string | undefined> },
): Promise<{ quote: Quote; url: string; reused: boolean }> {
  const { fees, store, stripe } = ctx;
  const { figures, purpose } = await previewOffer(s, meetups, choice, fees, ctx.env);
  if (figures.totalMinor !== expectTotalMinor) throw new PreviewChanged();
  await reconcileOfferAttempts(s.id, store, stripe, async (id) => {
    await fees.voidQuote(id);
    await fees.linkClosed(id);
  });
  const { quote, reused } = await fees.createQuote(
    { ...figures, sponsorId: s.id, subject: 'sponsorship', subjectId: null, purpose, createdBy: 'board' },
    { reuse: true, requestId: ctx.requestId },
  );
  if (reused && quote.linkState === 'live' && quote.linkUrl) return { quote, url: quote.linkUrl, reused };
  await closeStaleLinks(s, 'sponsorship', null, fees, store, stripe);
  if (!(await fees.linkCreating(quote.id))) throw new OfferReplaced();
  const link = await quoteLink(s, meetups, ctx.origin, stripe, quote, store).catch(async (cause: unknown) => {
    if (cause instanceof PaymentLinkRace) {
      await fees.voidQuote(quote.id);
      throw new OfferReplaced();
    }
    throw cause;
  });
  const actor = { kind: 'stripe', id: link.id } as const;
  const owner = await store.linkStripeIf(s.id, { paymentLinkId: null, status: 'pending', attempt: quote.id }, { paymentLinkId: link.id, paymentLinkUrl: link.url }, actor);
  const alreadyOwned = !owner && (await store.get(s.id))?.paymentLinkId === link.id;
  const attached = owner || alreadyOwned ? await fees.attachLink(quote.id, link.id, link.url) : null;
  if (!attached) {
    // Lost to a newer offer: this link must not stay payable. If Stripe fails now, the quote keeps
    // it as `closing` and the next offer switches it off.
    await fees.voidQuote(quote.id);
    await store.linkStripeIf(s.id, { paymentLinkId: link.id }, { paymentLinkId: null, paymentLinkUrl: null }, actor);
    await fees.orphanLink(quote.id, link.id);
    await deactivateLink(link.id, stripe).then(
      () => fees.linkClosed(quote.id),
      () => undefined,
    );
    throw new OfferReplaced();
  }
  return { quote: attached, url: link.url, reused };
}

/**
 * The offer no longer stands (the bundle changed, they paid another way, the sponsorship ended):
 * its quote is void and its link switched off. A link Stripe does not confirm stays on record and
 * is switched off by the next offer. Returns the voided quote, if there was one.
 */
export async function withdrawOffer(s: Sponsor, fees: FeeStore, store: SponsorStore, stripe: StripeDeps): Promise<Quote | null> {
  const open = await fees.openQuote(s.id, 'sponsorship', null);
  const voided = open ? await fees.voidQuote(open.id) : null;
  await closeStaleLinks(s, 'sponsorship', null, fees, store, stripe);
  return voided;
}

/** What the sponsor's payment of a session is, before anything is applied. */
export interface SessionPayment {
  sessionId: string;
  quoteId: string | null;
  paymentLinkId: string | null;
  paymentIntentId: string | null;
  currency: string;
  amountMinor: number;
}

/** Records a payment against the sponsor's offer (never twice); `go` says whether it may start what it paid for. */
export async function settleSponsorPayment(s: Sponsor, p: SessionPayment, fees: FeeStore): Promise<{ payment: QuotePayment; fresh: boolean; go: boolean }> {
  const quoteId = p.quoteId ?? (p.paymentLinkId ? ((await fees.quoteByLink(p.paymentLinkId))?.id ?? null) : null);
  const r = await fees.settlePayment({ ...p, quoteId, sponsorId: s.id, subject: 'sponsorship', subjectId: null });
  return { ...r, go: r.payment.outcome !== 'review' };
}

/** Reads the actual processor fee of a payment from Stripe and records it; false while Stripe has not settled it. */
export async function reconcileFee(payment: QuotePayment, fees: FeeStore, stripe: StripeDeps): Promise<boolean> {
  if (!payment.paymentIntentId || payment.feeMinor !== null) return payment.feeMinor !== null;
  const actual = await actualFee(payment.paymentIntentId, stripe);
  if (!actual) return false;
  await fees.recordFee(payment.sessionId, actual.feeMinor, actual.netMinor);
  return true;
}
