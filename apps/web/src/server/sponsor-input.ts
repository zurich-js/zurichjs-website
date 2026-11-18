/** Parsing and checking what the portal and the admin area send. Each failure names its field. */
import { AGREEMENT, isCycle, isTier, type ContactRole, type Cycle, type SponsorPatch, type Tier } from '@zurichjs/sponsorship';
import { isEmail, text } from './http.ts';
import type { Signer } from './sponsor-lifecycle.ts';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; field: string };
const no = (error: string, field: string) => ({ ok: false as const, error, field });

/** The person accepting the agreement: name and role at the company, and the current version. */
export function parseSigner(body: Record<string, unknown>, email: string): Parsed<Signer> {
  if (body.agreementVersion !== AGREEMENT.version)
    return no(
      body.agreementVersion ? 'The sponsorship agreement changed. Reload the page and accept the current version.' : 'Accept the sponsorship agreement to continue.',
      'agreement',
    );
  const name = text(body.signerName, 200);
  if (!name) return no('Add your full name to sign.', 'signerName');
  const title = text(body.signerTitle, 200);
  if (!title) return no('Add your role at the company (e.g. Head of Marketing).', 'signerTitle');
  return { ok: true, value: { name, title, email } };
}

export function parsePlan(body: Record<string, unknown>): Parsed<{ tier: Tier; cycle: Cycle }> {
  if (!isTier(body.tier)) return no('Choose a sponsorship tier.', 'tier');
  if (!isCycle(body.cycle)) return no('Choose monthly, quarterly, yearly or one meetup.', 'cycle');
  return { ok: true, value: { tier: body.tier, cycle: body.cycle } };
}

const DETAIL_FIELDS = { companyName: 200, legalName: 200, vatId: 40 } as const;

/** Company and billing details. `required` makes the company name mandatory (a new sponsor). */
export function parseDetails(body: Record<string, unknown>, required: boolean): Parsed<SponsorPatch> {
  const out: SponsorPatch = {};
  for (const [k, max] of Object.entries(DETAIL_FIELDS) as [keyof typeof DETAIL_FIELDS, number][]) {
    if (!(k in body)) continue;
    const v = text(body[k], max);
    if (v === false) return no(`Keep this under ${max} characters, without < or >.`, k);
    if (k === 'companyName' && !v) return no('Add the company name.', k);
    (out as Record<string, string | null>)[k] = v ?? null;
  }
  if (required && !out.companyName) return no('Add the company name.', 'companyName');
  if ('billingAddress' in body) {
    const raw = body.billingAddress;
    if (raw !== null && raw !== undefined && (typeof raw !== 'string' || raw.length > 1000 || /[<>]/.test(raw)))
      return no('Keep the address under 1000 characters.', 'billingAddress');
    out.billingAddress = typeof raw === 'string' && raw.trim() ? raw.trim().replace(/\r\n/g, '\n') : null;
  }
  if ('website' in body) {
    const w = text(body.website, 300);
    if (w === false) return no('Check the website address.', 'website');
    if (w) {
      const url = /^https?:\/\//i.test(w) ? w : `https://${w}`;
      try {
        new URL(url);
      } catch {
        return no('Check the website address.', 'website');
      }
      out.website = url;
    } else out.website = null;
  }
  return { ok: true, value: out };
}

const ROLES: ContactRole[] = ['primary', 'billing', 'other'];

export function parseContact(body: Record<string, unknown>): Parsed<{ name: string; email: string; role: ContactRole }> {
  const name = text(body.name, 200);
  if (!name) return no('Add their name.', 'name');
  const email = text(body.email, 254);
  if (!email || !isEmail(email)) return no('Add a valid email address.', 'email');
  const role = body.role === undefined ? 'other' : body.role;
  if (!ROLES.includes(role as ContactRole)) return no('Choose a role.', 'role');
  return { ok: true, value: { name, email: email.toLowerCase(), role: role as ContactRole } };
}
