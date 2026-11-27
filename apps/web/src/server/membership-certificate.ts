/**
 * Issuing a certificate of membership for a paid term: record it, render the
 * PDF (certificate.ts) and email it. Used by the Stripe webhook and the
 * certificate download route.
 */
import { readFile } from 'node:fs/promises';
import { getStore } from '@netlify/blobs';
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { levelInfo, type Actor, type Certificate, type Member, type MemberStore } from '@zurichjs/membership';
import { bundledAssets, renderCertificate } from './certificate.ts';
import { longDate } from './dates.ts';
import type { Env } from './http.ts';
import { membershipProps, termLabel } from './membership.ts';

type Log = (m: string) => void;

/**
 * The president's signature (private Netlify Blobs store `membership`, key `signature.png`), or null.
 * Locally (not production), MEMBERSHIP_SIGNATURE_FILE can point at a PNG instead.
 */
export async function loadSignature(log: Log = console.log, env: Env = process.env): Promise<Uint8Array | null> {
  try {
    if (env.MEMBERSHIP_SIGNATURE_FILE && env.CONTEXT !== 'production') return new Uint8Array(await readFile(env.MEMBERSHIP_SIGNATURE_FILE));
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
  /** The email to send instead of welcome or renewal: a member who paid by cash or bank transfer, added by the board, or a payment the board recorded. */
  template?: 'membership-ported' | 'membership-manual-payment';
}

export async function sendCertificate(
  m: Member,
  cert: Certificate,
  template: 'membership-manual-payment' | 'membership-ported' | 'membership-renewed' | 'membership-welcome',
  deps: Omit<IssueDeps, 'store' | 'actor'>,
) {
  const log = deps.log ?? console.log;
  const pdf = await certificatePdf(m, cert, await (deps.signature ?? (() => loadSignature(log)))());
  const props = {
    ...membershipProps(m, deps.origin),
    term: termLabel(cert.periodStart, cert.periodEnd),
    certificateNumber: cert.number,
    nextPayment: longDate(cert.periodEnd),
  };
  const email = renderEmail(template, props);
  return sendMemberEmail(
    deps.env,
    { to: m.email, ...email, attachments: [{ filename: certificateFilename(cert), content: pdf }] },
    { idempotencyKey: `member-certificate:${cert.id}`, log, fetch: deps.fetch },
  );
}
