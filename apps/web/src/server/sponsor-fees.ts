/**
 * Processing fees on the server (docs/domains/sponsorship/fees.md): the fee store, the fee gate, the
 * quote as sponsors and the board see it, and the Stripe line item for a surcharge.
 *
 * The gate opens only with a tariff the board entered and SPONSOR_FEE_POLICY_VERSION, the surcharge
 * policy version the owner approved, set in the environment by the owner. Without both, every quote
 * is "ZurichJS covers the fees".
 */
import { FEE_CHOICE_LABEL, chfMinor, feeGate, postgresFeeStore, ppmLabel, type FeeGate, type FeeStore, type Quote, type Tariff } from '@zurichjs/sponsorship';
import type { Env } from './http.ts';
import { membershipDb } from './membership-db.ts';

export const feeStore = (env: Env): FeeStore => postgresFeeStore(membershipDb(env));

export const currentGate = async (fees: FeeStore, env: Env): Promise<FeeGate> => feeGate(await fees.latestTariff(), env.SPONSOR_FEE_POLICY_VERSION);

export const tariffView = (t: Tariff) => ({
  version: t.version,
  rateLabel: ppmLabel(t.ratePpm),
  fixedLabel: chfMinor(t.fixedMinor),
  note: t.note,
  enteredAt: t.enteredAt,
});

export const gateView = (g: FeeGate) =>
  g.open ? { open: true as const, policyVersion: g.policyVersion, tariff: tariffView(g.tariff) } : { open: false as const, reason: g.reason };

/** What the sponsor and the board read: amounts already formatted, and the versions behind them. */
export const quoteView = (q: Quote) => ({
  id: q.id,
  subject: q.subject,
  purpose: q.purpose,
  feeChoice: q.feeChoice,
  feeChoiceLabel: FEE_CHOICE_LABEL[q.feeChoice],
  base: chfMinor(q.baseMinor),
  surcharge: q.surchargeMinor ? chfMinor(q.surchargeMinor) : null,
  total: chfMinor(q.totalMinor),
  totalMinor: q.totalMinor,
  tariffVersion: q.tariffVersion,
  policyVersion: q.policyVersion,
  status: q.status,
  createdAt: q.createdAt,
  paidAt: q.paidAt,
});

export type QuoteView = ReturnType<typeof quoteView>;

/** The surcharge as its own Stripe line, so the payment page and the receipt show it apart from the base. */
export const SURCHARGE_NAME = 'Payment processing fee';
