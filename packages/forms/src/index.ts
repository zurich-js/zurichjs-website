import { z } from 'zod';

/**
 * One schema per form, shared by the island (client-side validation) and the
 * Netlify Function (server-side validation). Required fields match the V2
 * contract in v2/src/pages/api/forms/[kind].ts; extra fields pass through so
 * forms can add optional questions without a schema change.
 *
 * Workshop-only kinds (`checkout`, `waitlist`) are de-scoped and not accepted;
 * online donations (`donate`) were removed with Stripe.
 */
const email = z.string().trim().email('Enter an email address like name@example.com.');
const text = (msg: string) => z.string().trim().min(1, msg);
const required = (msg: string) => z.union([z.string().trim().min(1, msg), z.number()]);

import { HONEYPOT, MAX_TOPICS, TALK_LENGTHS, TALK_LEVELS, TALK_TOPICS, cfpProfileErrors } from './client.ts';

export { CFP_PROFILE, HONEYPOT, MAX_TOPICS, REQUIRED, TALK_LENGTHS, TALK_LEVELS, TALK_TOPICS, cfpProfileErrors, fieldErrors, submitForm } from './client.ts';
const honeypot = { [HONEYPOT]: z.string().max(0).optional() };

export const schemas = {
  cfp: z.looseObject({
    ...honeypot,
    name: text('Enter your name.').max(120),
    email,
    title: text('Give your talk a working title.').max(180),
    abstract: text('Describe your talk in a few sentences.').max(5000),
    format: z.enum(
      TALK_LENGTHS.map((l) => l.value),
      'Choose a length.',
    ),
    level: z.enum(
      TALK_LEVELS.map((l) => l.value),
      'Choose a level.',
    ),
    topics: z
      .array(z.enum(TALK_TOPICS, 'Choose topics from the list.'), 'Choose at least one topic.')
      .min(1, 'Choose at least one topic.')
      .max(MAX_TOPICS, `Choose up to ${MAX_TOPICS} topics.`),
    jobTitle: z.string().trim().max(160).optional(),
    bio: z.string().trim().max(3000).optional(),
    linkedin: z.string().trim().max(300).optional(),
    github: z.string().trim().max(300).optional(),
    twitter: z.string().trim().max(300).optional(),
  }),
  partners: z.looseObject({ ...honeypot, org: text('Enter your company or organisation.'), name: text('Enter your name.'), email, way: text('Choose how you’d like to help.') }),
  contact: z.looseObject({ ...honeypot, name: text('Enter your name.'), email, topic: text('Choose a topic.'), message: text('Write a message.') }),
  feedback: z.looseObject({ ...honeypot, eventId: text('Missing event.'), overall: required('Choose a score for the evening.') }),
  rating: z.looseObject({ ...honeypot, eventId: text('Missing event.'), target: text('Missing talk.'), stars: z.coerce.number().int().min(1).max(5) }),
} as const;

export type FormKind = keyof typeof schemas;
export type FormData<K extends FormKind> = z.infer<(typeof schemas)[K]>;
export const isFormKind = (k: string): k is FormKind => k in schemas;

export type { FormResult } from './client.ts';

/** Validates a payload. Returns field-level messages for inline errors. */
export function validate<K extends FormKind>(kind: K, data: unknown): { ok: true; data: FormData<K> } | { ok: false; error: string; fields: Record<string, string> } {
  const r = schemas[kind].safeParse(data);
  // Conditional rules (shared with the browser): a talk proposal's speaker profile.
  const extra = kind === 'cfp' && data && typeof data === 'object' ? cfpProfileErrors(data) : {};
  if (r.success && !Object.keys(extra).length) return { ok: true, data: r.data as FormData<K> };
  const fields: Record<string, string> = {};
  for (const issue of r.success ? [] : r.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fields[key]) fields[key] = issue.message;
  }
  for (const [k, msg] of Object.entries(extra)) fields[k] ??= msg;
  const missing = Object.keys(fields);
  return { ok: false, error: missing.length ? `Missing or invalid: ${missing.join(', ')}` : 'Invalid form', fields };
}
