/**
 * Browser half of the forms package: no zod, so islands stay small. The
 * required fields and messages mirror `schemas` in index.ts; the server
 * validates again with zod (tested to agree in test/forms.test.ts).
 */
export type FormKind = 'cfp' | 'partners' | 'contact' | 'feedback' | 'rating';
export type FormResult = { ok: true; id?: string } | { ok: false; error: string; fields?: Record<string, string> };

/** Hidden field bots fill in. Humans never see it, so any value means spam. */
export const HONEYPOT = 'website_url';

const EMAIL = 'Enter an email address like name@example.com.';
export const REQUIRED: Record<FormKind, Record<string, string>> = {
  cfp: { name: 'Enter your name.', email: EMAIL, title: 'Give your talk a working title.', format: 'Choose a format.' },
  partners: { org: 'Enter your company or organisation.', name: 'Enter your name.', email: EMAIL, way: 'Choose how you’d like to help.' },
  contact: { name: 'Enter your name.', email: EMAIL, topic: 'Choose a topic.', message: 'Write a message.' },
  feedback: { eventId: 'Missing event.', overall: 'Choose a score for the evening.' },
  rating: { eventId: 'Missing event.', target: 'Missing talk.', stars: 'Choose a rating from 1 to 5.' },
};

const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const empty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Field-level messages for inline errors; empty object when valid. */
export function fieldErrors(kind: FormKind, data: object): Record<string, string> {
  const d = data as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [field, msg] of Object.entries(REQUIRED[kind])) {
    const v = d[field];
    if (empty(v) || (field === 'email' && !isEmail(v))) out[field] = msg;
  }
  return out;
}

/** Same shape as the server-side `validate`, for islands. */
export function validate(kind: FormKind, data: object): { ok: true } | { ok: false; error: string; fields: Record<string, string> } {
  const fields = fieldErrors(kind, data);
  const keys = Object.keys(fields);
  return keys.length ? { ok: false, error: `Missing or invalid: ${keys.join(', ')}`, fields } : { ok: true };
}

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
