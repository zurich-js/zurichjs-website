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

import { GITHUB_PROFILE, HONEYPOT, LINKEDIN_URL, REQUIRED, VOLUNTEER_AVAILABILITY, VOLUNTEER_INTERESTS, type VolunteerAvailability } from './client.ts';

export { HONEYPOT, REQUIRED, VOLUNTEER_AVAILABILITY, fieldErrors, submitForm } from './client.ts';
const honeypot = { [HONEYPOT]: z.string().max(0).optional() };

/**
 * Volunteer application. Field names are production's (/api/submit-volunteer):
 * linkedinProfile, githubProfile, availability, interests, message (why they
 * want to volunteer). V2 adds availabilityOther for the "Other" choice.
 */
const V = REQUIRED.volunteer;
const volunteer = z
  .looseObject({
    ...honeypot,
    name: text(V.name!).max(160),
    email,
    linkedinProfile: text(V.linkedinProfile!).max(300).regex(LINKEDIN_URL, 'Enter a linkedin.com link, like https://www.linkedin.com/in/your-name.'),
    githubProfile: z.string().trim().max(120).regex(GITHUB_PROFILE, 'Enter a GitHub username or a github.com link.').optional().or(z.literal('')),
    availability: z.enum(Object.keys(VOLUNTEER_AVAILABILITY) as [VolunteerAvailability, ...VolunteerAvailability[]], V.availability!),
    availabilityOther: z.string().trim().max(300).optional(),
    interests: z.array(z.enum(VOLUNTEER_INTERESTS, 'Choose from the areas listed.'), V.interests!).min(1, V.interests!).max(VOLUNTEER_INTERESTS.length),
    message: text(V.message!).max(3000),
  })
  .refine((d) => d.availability !== 'other' || !!d.availabilityOther, { path: ['availabilityOther'], message: 'Say briefly how much time you have.' });

export const schemas = {
  cfp: z.looseObject({ ...honeypot, name: text('Enter your name.'), email, title: text('Give your talk a working title.'), format: text('Choose a format.') }),
  partners: z.looseObject({ ...honeypot, org: text('Enter your company or organisation.'), name: text('Enter your name.'), email, way: text('Choose how you’d like to help.') }),
  contact: z.looseObject({ ...honeypot, name: text('Enter your name.'), email, topic: text('Choose a topic.'), message: text('Write a message.') }),
  feedback: z.looseObject({ ...honeypot, eventId: text('Missing event.'), overall: required('Choose a score for the evening.') }),
  rating: z.looseObject({ ...honeypot, eventId: text('Missing event.'), target: text('Missing talk.'), stars: z.coerce.number().int().min(1).max(5) }),
  volunteer,
} as const;

export type FormKind = keyof typeof schemas;
export type FormData<K extends FormKind> = z.infer<(typeof schemas)[K]>;
export const isFormKind = (k: string): k is FormKind => k in schemas;

export type { FormResult } from './client.ts';

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
