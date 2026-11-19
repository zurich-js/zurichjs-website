/**
 * What the association keeps about each member for its member register (owner, 19th November
 * 2026): date of birth, street and number, postcode, city and phone number.
 *
 * People joining online give them (a person all five; an organisation its address and phone,
 * no date of birth). The board backfills them for existing members in the admin area, where
 * every field is optional. They are wiped when a member is anonymised (one year after the
 * membership ends). They never go to Slack, Stripe or the Slack agent.
 *
 * No browser or server dependencies: the join form and the API share these rules.
 */
import type { MemberKind } from './types.ts';

export interface ContactDetails {
  /** YYYY-MM-DD. Only for people, not organisations. */
  birthDate: string | null;
  /** Street and number. */
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
}

export const CONTACT_FIELDS = ['birthDate', 'street', 'postalCode', 'city', 'phone'] as const satisfies readonly (keyof ContactDetails)[];
export type ContactField = (typeof CONTACT_FIELDS)[number];

export const NO_CONTACT_DETAILS: ContactDetails = { birthDate: null, street: null, postalCode: null, city: null, phone: null };

export const CONTACT_LABELS: Record<ContactField, string> = {
  birthDate: 'Date of birth',
  street: 'Street and number',
  postalCode: 'Postcode',
  city: 'City',
  phone: 'Phone number',
};

const LIMITS: Record<Exclude<ContactField, 'birthDate'>, number> = { street: 200, postalCode: 10, city: 100, phone: 30 };

const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/** The message for one field, or '' when it is fine. Empty is fine here; `missingContactDetails` says what is required. */
export function contactFieldError(field: ContactField, value: string, today: string = new Date().toISOString().slice(0, 10)): string {
  const v = value.trim();
  if (!v) return '';
  if (/[<>]/.test(v)) return `${CONTACT_LABELS[field]}: no HTML, please.`;
  switch (field) {
    case 'birthDate':
      if (!isIsoDate(v)) return 'Enter the date of birth as a date, like 1990-05-23.';
      if (v < '1900-01-01' || v >= today) return 'Check the date of birth.';
      return '';
    case 'postalCode':
      return /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(v) ? '' : 'Enter a postcode like 8008.';
    case 'phone': {
      const digits = v.replace(/\D/g, '').length;
      return /^\+?[0-9 ()./-]+$/.test(v) && digits >= 6 && digits <= 15 && v.length <= LIMITS.phone ? '' : 'Enter a phone number like +41 79 123 45 67.';
    }
    default:
      return v.length > LIMITS[field] ? `Keep ${CONTACT_LABELS[field].toLowerCase()} under ${LIMITS[field]} characters.` : '';
  }
}

/** Which details a member of this kind must give when joining online. */
export const requiredContactFields = (kind: MemberKind): ContactField[] => (kind === 'organisation' ? ['street', 'postalCode', 'city', 'phone'] : [...CONTACT_FIELDS]);

/** What the join form says when a required field is empty. */
export const CONTACT_MISSING: Record<ContactField, string> = {
  birthDate: 'Add your date of birth.',
  street: 'Add your street and number.',
  postalCode: 'Add your postcode.',
  city: 'Add your city.',
  phone: 'Add your phone number.',
};

export type ParsedContact = { ok: true; value: ContactDetails } | { ok: false; field: ContactField; error: string };

/**
 * Reads the five fields from a JSON body (strings; empty means none). With `required`, the
 * fields `requiredContactFields(kind)` must be there. An organisation never stores a date of birth.
 */
export function parseContactDetails(body: Record<string, unknown>, opts: { kind: MemberKind; required: boolean; today?: string }): ParsedContact {
  const value: ContactDetails = { ...NO_CONTACT_DETAILS };
  const required = opts.required ? requiredContactFields(opts.kind) : [];
  for (const field of CONTACT_FIELDS) {
    const raw = body[field];
    if (raw !== undefined && raw !== null && typeof raw !== 'string') return { ok: false, field, error: `${CONTACT_LABELS[field]} must be text.` };
    const v = (raw ?? '').trim().replace(/\s+/g, ' ');
    const error = contactFieldError(field, v, opts.today);
    if (error) return { ok: false, field, error };
    if (!v && required.includes(field)) return { ok: false, field, error: CONTACT_MISSING[field] };
    value[field] = v || null;
  }
  if (opts.kind === 'organisation') value.birthDate = null;
  return { ok: true, value };
}

/** The address on one line: "Alderstrasse 30, 8008 Zurich", or '' when there is none. */
export const addressLine = (d: Pick<ContactDetails, 'street' | 'postalCode' | 'city'>) => [d.street, [d.postalCode, d.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
