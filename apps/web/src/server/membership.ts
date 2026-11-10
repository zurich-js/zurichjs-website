/**
 * Shared membership pieces for the API routes, the Stripe webhook and Slack:
 * what a member sees (memberView), the email props, and issuing a certificate
 * (record it, render the PDF, email it).
 */
import { getStore } from '@netlify/blobs';
import { renderEmail, type MembershipProps } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { label, levelInfo, type Actor, type Certificate, type Member, type MemberStore } from '@zurichjs/membership';
import { CYCLES, TIERS, feeLabel } from '../lib/membership.ts';
import { bundledAssets, lastDay, longDate, renderCertificate } from './certificate.ts';
import type { Env } from './http.ts';

type Log = (m: string) => void;

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
  statusLabel: label(m.status),
  paidUntil: m.paidUntil,
  paymentMode: m.paymentMode,
  joinedAt: m.joinedAt,
  canManagePayment: !!m.stripeCustomerId,
});

export interface CertificateView {
  id: string;
  number: string;
  levelName: string;
  /** "10 November 2026 to 9 November 2027" */
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

export function membershipProps(m: Member, origin: string): MembershipProps {
  return {
    name: m.name,
    organisationName: m.organisationName,
    levelName: levelInfo(m.level).name,
    cycleLabel: CYCLES.find((c) => c.value === m.cycle)!.label,
    feeLabel: feeLabel(TIERS[m.level], m.cycle),
    accountUrl: accountUrl(origin),
  };
}

/** The president's signature (private Netlify Blobs store `membership`, key `signature.png`), or null. */
export async function loadSignature(log: Log = console.log): Promise<Uint8Array | null> {
  try {
    const data = await getStore('membership').get('signature.png', { type: 'arrayBuffer' });
    return data ? new Uint8Array(data) : null;
  } catch (cause) {
    log(`[membership] signature not loaded, certificate shows the printed name: ${(cause as Error).message}`);
    return null;
  }
}

export async function certificatePdf(m: Member, c: Certificate, signature: Uint8Array | null): Promise<Uint8Array> {
  return renderCertificate(
    {
      number: c.number,
      name: m.name,
      organisationName: m.organisationName,
      levelName: levelInfo(c.level).name,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      issuedAt: c.issuedAt,
    },
    bundledAssets(signature),
  );
}

export const certificateFilename = (c: Certificate) => `ZurichJS-membership-${c.number}.pdf`;

export interface IssueDeps {
  env: Env;
  store: MemberStore;
  origin: string;
  actor: Actor;
  fetch?: typeof fetch;
  log?: Log;
  /** Injected in tests; defaults to the Blobs store. */
  signature?: () => Promise<Uint8Array | null>;
}

/**
 * Issues the certificate for a paid term and emails it (welcome on the first
 * term, renewal after). Idempotent on the invoice: a retried webhook neither
 * issues nor sends twice (Resend idempotency key on the certificate).
 */
export async function issueAndSendCertificate(
  m: Member,
  term: { periodStart: string; periodEnd: string; stripeInvoiceId: string | null },
  first: boolean,
  deps: IssueDeps,
): Promise<Certificate> {
  const log = deps.log ?? console.log;
  const cert = await deps.store.issueCertificate(m.id, term, deps.actor);
  const pdf = await certificatePdf(m, cert, await (deps.signature ?? (() => loadSignature(log)))());
  const props = { ...membershipProps(m, deps.origin), term: termLabel(cert.periodStart, cert.periodEnd), certificateNumber: cert.number };
  const email = renderEmail(first ? 'membership-welcome' : 'membership-renewed', props);
  await sendMemberEmail(
    deps.env,
    { to: m.email, ...email, attachments: [{ filename: certificateFilename(cert), content: pdf }] },
    { idempotencyKey: `member-certificate:${cert.id}`, log, fetch: deps.fetch },
  ).catch((e: Error) => log(`[membership] certificate email ${cert.number} failed: ${e.message}`));
  return cert;
}
