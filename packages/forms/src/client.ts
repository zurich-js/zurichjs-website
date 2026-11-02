/**
 * Browser half of the forms package: no zod, so islands stay small. The
 * required fields and messages mirror `schemas` in index.ts; the server
 * validates again with zod (tested to agree in test/forms.test.ts).
 */
export type FormKind = 'cfp' | 'partners' | 'contact' | 'feedback' | 'rating';
export type FormResult = { ok: true; id?: string } | { ok: false; error: string; fields?: Record<string, string> };

/** Hidden field bots fill in. Humans never see it, so any value means spam. */
export const HONEYPOT = 'website_url';

/**
 * Talk proposal choices. Lengths and levels match the deployed Sanity
 * `talkSubmission` (`durationMinutes` 5 | 25 | 35, `level`); the meetup CFP
 * offers 5 and 25 minutes, as production does (its 35-minute deep dive sits
 * behind a feature flag that is off). Topics are production's list
 * (origin/main src/components/cfp/constants.ts), stored as `tags`.
 */
export const TALK_LENGTHS = [
  { value: 'Lightning', minutes: 5, label: 'Lightning talk', hint: '5 minutes' },
  { value: 'Standard', minutes: 25, label: 'Standard talk', hint: '25 minutes' },
] as const;
export const TALK_LEVELS = [
  { value: 'beginner', label: 'Beginner-friendly' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;
export const MAX_TOPICS = 8;
export const TALK_TOPICS = [
  'JavaScript Fundamentals',
  'React',
  'Angular',
  'Vue',
  'Svelte',
  'Node.js',
  'TypeScript',
  'Testing',
  'Web Performance',
  'JavaScript Frameworks',
  'Frontend Development',
  'Backend Development',
  'Web3',
  'AI in JavaScript',
  'Tooling',
  'DevOps',
  'Monetization',
  'Growth Hacking',
  'Product Management',
  'User Experience',
  'Analytics & Metrics',
  'A/B Testing',
  'Conversion Optimization',
  'Business Strategy',
  'Startup Journey',
  'Team Leadership',
  'Remote Work',
  'Career Development',
] as const;

const EMAIL = 'Enter an email address like name@example.com.';
export const REQUIRED: Record<FormKind, Record<string, string>> = {
  cfp: {
    name: 'Enter your name.',
    email: EMAIL,
    title: 'Give your talk a working title.',
    abstract: 'Describe your talk in a few sentences.',
    format: 'Choose a length.',
    level: 'Choose a level.',
    topics: 'Choose at least one topic.',
  },
  partners: { org: 'Enter your company or organisation.', name: 'Enter your name.', email: EMAIL, way: 'Choose how you’d like to help.' },
  contact: { name: 'Enter your name.', email: EMAIL, topic: 'Choose a topic.', message: 'Write a message.' },
  feedback: { eventId: 'Missing event.', overall: 'Choose a score for the evening.' },
  rating: { eventId: 'Missing event.', target: 'Missing talk.', stars: 'Choose a rating from 1 to 5.' },
};

const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const empty = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
const truthy = (v: unknown) => v === true || v === 'true' || v === 'on';

/**
 * Speaker profile fields on a talk proposal. New speakers give a job title,
 * a short bio and LinkedIn, as on production. People who have spoken at
 * ZurichJS before (`returning`) may leave them empty: their speaker page is
 * matched by email and stays as it is.
 */
export const CFP_PROFILE: Record<string, string> = {
  jobTitle: 'Add your job title, for example Frontend developer.',
  bio: 'Add a short bio. Two or three sentences is enough.',
  linkedin: 'Paste your LinkedIn profile link, like https://www.linkedin.com/in/your-name.',
};
const isLinkedIn = (v: unknown) => typeof v === 'string' && /^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/\S+/i.test(v.trim());

/** Profile errors for a talk proposal (empty for returning speakers who leave them out). */
export function cfpProfileErrors(data: object): Record<string, string> {
  const d = data as Record<string, unknown>;
  const out: Record<string, string> = {};
  const returning = truthy(d.returning);
  for (const [field, msg] of Object.entries(CFP_PROFILE)) {
    const v = d[field];
    if (empty(v) ? !returning : field === 'linkedin' && !isLinkedIn(v)) out[field] = msg;
  }
  if (Array.isArray(d.topics) && d.topics.length > MAX_TOPICS) out.topics = `Choose up to ${MAX_TOPICS} topics.`;
  return out;
}

/** Field-level messages for inline errors; empty object when valid. */
export function fieldErrors(kind: FormKind, data: object): Record<string, string> {
  const d = data as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [field, msg] of Object.entries(REQUIRED[kind])) {
    const v = d[field];
    if (empty(v) || (field === 'email' && !isEmail(v))) out[field] = msg;
  }
  return kind === 'cfp' ? { ...out, ...cfpProfileErrors(d) } : out;
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
