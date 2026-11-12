/**
 * Shared membership pieces for the API routes, the Stripe webhook and Slack:
 * what a member sees (memberView) and the email props. Issuing certificates is
 * in membership-certificate.ts, so code that only needs these (the Slack
 * function, bundled by Netlify with plain esbuild) does not pull in the PDF
 * assets.
 */
import type { MembershipProps } from '@zurichjs/emails';
import { label, levelInfo, resignationState, type Certificate, type Member } from '@zurichjs/membership';
import { CYCLES, TIERS, chf, feeLabel } from '../lib/membership.ts';
import { lastDay, longDate } from './dates.ts';

export interface MemberView {
  name: string;
  organisationName: string | null;
  level: Member['level'];
  levelName: string;
  cycle: Member['cycle'];
  feeLabel: string;
  category: Member['category'];
  status: Member['status'];
  statusLabel: string;
  paidUntil: string | null;
  paymentMode: Member['paymentMode'];
  joinedAt: string | null;
  /** Has a Stripe customer, so the payment portal can open. */
  canManagePayment: boolean;
  /** Invited by the board from the admin area (server/membership-invite.ts). */
  invited: boolean;
  /** A resignation: waiting for the board or confirmed by it (ISO times); null otherwise. */
  resignation: { state: 'waiting' | 'confirmed'; requestedAt: string | null; confirmedAt: string | null } | null;
}

export const memberView = (m: Member): MemberView => ({
  name: m.name,
  organisationName: m.organisationName,
  level: m.level,
  levelName: levelInfo(m.level).name,
  cycle: m.cycle,
  feeLabel: feeLabel(TIERS[m.level], m.cycle),
  category: m.category,
  status: m.status,
  statusLabel: resignationLabel(m) ?? label(m.status),
  paidUntil: m.paidUntil,
  paymentMode: m.paymentMode,
  joinedAt: m.joinedAt,
  canManagePayment: !!m.stripeCustomerId,
  invited: m.source === 'invited',
  resignation: resignationOf(m),
});

const resignationOf = (m: Member): MemberView['resignation'] => {
  const state = resignationState(m);
  return state ? { state, requestedAt: m.resignedAt, confirmedAt: m.resignationConfirmedAt } : null;
};

/** "resignation with the board" or "resignation confirmed", in place of "resigning". */
export const resignationLabel = (m: Member) => ({ waiting: 'resignation with the board', confirmed: 'resignation confirmed', none: null })[resignationState(m) ?? 'none'];

export interface CertificateView {
  id: string;
  number: string;
  levelName: string;
  /** "10th November 2026 to 9th November 2027" */
  term: string;
  issuedAt: string;
}

export const termLabel = (periodStart: string, periodEnd: string) => `${longDate(periodStart)} to ${longDate(lastDay(periodEnd))}`;

export const certificateView = (c: Certificate): CertificateView => ({
  id: c.id,
  number: c.number,
  levelName: levelInfo(c.level).name,
  term: termLabel(c.periodStart, c.periodEnd),
  issuedAt: c.issuedAt,
});

/** The account page on this deploy (production, preview or local). */
export const accountUrl = (origin: string) => new URL('/membership/account', origin).toString();

const cycleOf = (c: Member['cycle']) => CYCLES.find((x) => x.value === c)!;

export function membershipProps(m: Member, origin: string): MembershipProps {
  return {
    name: m.name,
    organisationName: m.organisationName,
    levelName: levelInfo(m.level).name,
    cycleLabel: cycleOf(m.cycle).label,
    feeLabel: feeLabel(TIERS[m.level], m.cycle),
    price: chf(TIERS[m.level].fees[m.cycle]),
    per: `a ${cycleOf(m.cycle).unit}`,
    accountUrl: accountUrl(origin),
  };
}
