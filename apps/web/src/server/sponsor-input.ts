/** Parsing and checking what the sponsorship page and the admin area send. Each failure names its field. */
import { AGREEMENT, isCycle, isTier, type ContactRole, type Cycle, type SponsorPatch, type Tier } from '@zurichjs/sponsorship';
import { isEmail, text } from './http.ts';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; field: string };
const no = (error: string, field: string) => ({ ok: false as const, error, field });

/** A name people typed: no links (they reach Slack and emails), no line breaks. */
function name(value: unknown, max: number): string | undefined | false {
  const t = text(value, max);
  if (!t) return t;
  if (/:\/\/|www\.|[\r\n]/i.test(t)) return false;
  return t;
}

/**
 * What a confirmation sends: a full signature (name, role) or one tick (`confirm`), always with
 * the agreement version the page showed. Which one is enough is decided by resolveSigner.
 */
export function parseSignature(body: Record<string, unknown>): Parsed<{ name?: string; title?: string; confirm: boolean }> {
  if (body.agreementVersion !== AGREEMENT.version)
    return no(
      body.agreementVersion ? 'The sponsorship agreement changed. Reload the page and sign the current version.' : 'Sign the sponsorship agreement to continue.',
      'agreement',
    );
  const signer = name(body.signerName, 200);
  if (signer === false) return no('Write your name without links or line breaks.', 'signerName');
  const title = name(body.signerTitle, 200);
  if (title === false) return no('Write your role without links or line breaks.', 'signerTitle');
  if (signer && !title) return no('Add your role at the company (e.g. Head of Marketing).', 'signerTitle');
  if (title && !signer) return no('Add your full name to sign.', 'signerName');
  return { ok: true, value: { ...(signer && title ? { name: signer, title } : {}), confirm: body.confirm === true } };
}

export function parsePlan(body: Record<string, unknown>): Parsed<{ tier: Tier; cycle: Cycle }> {
  if (!isTier(body.tier)) return no('Choose a sponsorship tier.', 'tier');
  if (!isCycle(body.cycle)) return no('Choose monthly, quarterly, yearly or one-time.', 'cycle');
  return { ok: true, value: { tier: body.tier, cycle: body.cycle } };
}

/** Company and billing details. `required` makes the company name mandatory (a new sponsor). */
export function parseDetails(body: Record<string, unknown>, required: boolean): Parsed<SponsorPatch> {
  const out: SponsorPatch = {};
  if ('companyName' in body) {
    const v = name(body.companyName, 200);
    if (v === false) return no('Write the company name without links, < or >.', 'companyName');
    if (!v) return no('Add the company name.', 'companyName');
    out.companyName = v;
  }
  if (required && !out.companyName) return no('Add the company name.', 'companyName');
  for (const [k, max] of [
    ['legalName', 200],
    ['vatId', 40],
  ] as const) {
    if (!(k in body)) continue;
    const v = name(body[k], max);
    if (v === false) return no(`Keep this under ${max} characters, without links, < or >.`, k);
    out[k] = v ?? null;
  }
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
  const who = name(body.name, 200);
  if (who === false) return no('Write their name without links or line breaks.', 'name');
  if (!who) return no('Add their name.', 'name');
  const email = text(body.email, 254);
  if (!email || !isEmail(email)) return no('Add a valid email address.', 'email');
  const role = body.role === undefined ? 'other' : body.role;
  if (!ROLES.includes(role as ContactRole)) return no('Choose a role.', 'role');
  return { ok: true, value: { name: who, email: email.toLowerCase(), role: role as ContactRole } };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (v: unknown): v is string => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));

/** A price per meetup in whole CHF (1 to 100’000), or null for the list price. */
export function parsePrice(v: unknown): Parsed<number | null> {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[’'\s]/g, ''));
  if (!Number.isInteger(n) || n < 1 || n > 100_000) return no('Give the price per meetup in whole francs, or leave it empty for the list price.', 'pricePerMeetup');
  return { ok: true, value: n };
}
