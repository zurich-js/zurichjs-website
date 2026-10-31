import { z } from 'zod';

/**
 * One schema per form, shared by the island (client-side validation) and the
 * Netlify Function (server-side validation). Required fields match the V2
 * contract in v2/src/pages/api/forms/[kind].ts; extra fields pass through so
 * forms can add optional questions without a schema change.
 *
 * Workshop-only kinds (`checkout`, `waitlist`) are de-scoped and not accepted.
 */
const email = z.string().trim().email('Enter an email address like name@example.com.');
const text = (msg: string) => z.string().trim().min(1, msg);
const required = (msg: string) => z.union([z.string().trim().min(1, msg), z.number()]);

/** Hidden field bots fill in. Humans never see it, so any value means spam. */
export const HONEYPOT = 'website_url';
const honeypot = { [HONEYPOT]: z.string().max(0).optional() };

export const schemas = {
  cfp: z.looseObject({ ...honeypot, name: text('Enter your name.'), email, title: text('Give your talk a working title.'), format: text('Choose a format.') }),
  partners: z.looseObject({ ...honeypot, org: text('Enter your company or organisation.'), name: text('Enter your name.'), email, way: text('Choose how you’d like to help.') }),
  contact: z.looseObject({ ...honeypot, name: text('Enter your name.'), email, topic: text('Choose a topic.'), message: text('Write a message.') }),
  feedback: z.looseObject({ ...honeypot, eventId: text('Missing event.'), overall: required('Choose a score for the evening.') }),
  rating: z.looseObject({ ...honeypot, eventId: text('Missing event.'), target: text('Missing talk.'), stars: z.coerce.number().int().min(1).max(5) }),
  donate: z.looseObject({ ...honeypot, amountChf: z.coerce.number().positive('Choose an amount.').max(10_000), method: z.enum(['card', 'twint']) }),
} as const;

export type FormKind = keyof typeof schemas;
export type FormData<K extends FormKind> = z.infer<(typeof schemas)[K]>;
export const isFormKind = (k: string): k is FormKind => k in schemas;

export type FormResult = { ok: true; id?: string; url?: string | null } | { ok: false; error: string; fields?: Record<string, string> };

/** Validates a payload. Returns field-level messages for inline errors. */
export function validate<K extends FormKind>(kind: K, data: unknown): { ok: true; data: FormData<K> } | { ok: false; error: string; fields: Record<string, string> } {
  const r = schemas[kind].safeParse(data);
  if (r.success) return { ok: true, data: r.data as FormData<K> };
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fields[key]) fields[key] = issue.message;
  }
  const missing = Object.keys(fields);
  return { ok: false, error: missing.length ? `Missing or invalid: ${missing.join(', ')}` : 'Invalid form', fields };
}

/** Browser helper used by the form islands. */
export async function submitForm(kind: FormKind, data: object): Promise<FormResult> {
  try {
    const res = await fetch(`/api/forms/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const json = (await res.json()) as FormResult;
    if (!res.ok || !json.ok) return { ok: false, error: ('error' in json && json.error) || 'Something went wrong on our side. Please try again.' };
    return json;
  } catch {
    return { ok: false, error: 'We couldn’t reach the server. Check your connection and try again.' };
  }
}
