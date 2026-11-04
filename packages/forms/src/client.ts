/**
 * Browser half of the forms package: no zod, so islands stay small. The
 * required fields and messages mirror `schemas` in index.ts; the server
 * validates again with zod (tested to agree in test/forms.test.ts).
 */
export type FormKind = 'cfp' | 'partners' | 'contact' | 'feedback' | 'rating' | 'volunteer';
export type FormResult = { ok: true; id?: string } | { ok: false; error: string; fields?: Record<string, string> };

/** Hidden field bots fill in. Humans never see it, so any value means spam. */
export const HONEYPOT = 'website_url';

/**
 * Volunteer areas, as on production's /cfv (origin/main src/pages/cfv.tsx) without
 * workshop organisation, plus photography and video from V2. The label is what organisers read.
 */
export const VOLUNTEER_INTERESTS = [
  'Community management',
  'Social media',
  'Partnership and speaker outreach',
  'Event organisation',
  'Platform development',
  'Content creation',
  'Graphic design',
  'Photography and video',
] as const;

/** Availability values and labels, the same values as production's /api/submit-volunteer. */
export const VOLUNTEER_AVAILABILITY = {
  weekly: 'A few hours weekly',
  monthly: 'A few hours monthly',
  events: 'Only during events',
  other: 'Other',
} as const;
export type VolunteerAvailability = keyof typeof VOLUNTEER_AVAILABILITY;

/** Production's LinkedIn check (origin/main src/lib/validation/input.ts), also allowing country subdomains. */
export const LINKEDIN_URL = /^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/.+/i;
/** A GitHub username (with or without @) or a github.com profile link. */
export const GITHUB_PROFILE = /^(@?[A-Za-z0-9-]{1,39}|(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9-]{1,39}\/?)$/i;

/**
 * Talk proposal choices. Meetup talks are a 10-minute lightning talk or a 20-minute full talk
 * (owner, 4th November 2026); Sanity's `talkSubmission.durationMinutes` offers the same. The stored
 * values stay `Lightning` and `Standard`, so saved drafts and older submissions keep working. Topics are the reconciled set used on
 * every talk in Sanity (owner, 3rd November 2026), stored as `tags`.
 */
export const TALK_LENGTHS = [
  { value: 'Lightning', minutes: 10, label: 'Lightning talk', hint: '10 minutes' },
  { value: 'Standard', minutes: 20, label: 'Full talk', hint: '20 minutes' },
] as const;
export const TALK_LEVELS = [
  { value: 'beginner', label: 'Beginner-friendly' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;
export const MAX_TOPICS = 8;
export const TALK_TOPICS = [
  'JavaScript',
  'TypeScript',
  'Node.js',
  'Frontend',
  'Backend',
  'Full stack',
  'Frameworks',
  'React',
  'Vue',
  'Angular',
  'Svelte',
  'Astro',
  'Qwik',
  'Next.js',
  'Performance',
  'AI',
  'Tooling',
  'DevOps',
  'Testing',
  'Accessibility',
  'Security',
  'UX',
  'Forms and validation',
  'Payments',
  'Product and business',
  'Career and teams',
] as const;

const EMAIL = 'Enter an email address like name@example.com.';
export const REQUIRED: Record<FormKind, Record<string, string>> = {
  cfp: {
    name: 'Enter your name.',
    email: EMAIL,
    title: 'Add a title for your talk.',
    abstract: 'Describe your talk in a few sentences.',
    format: 'Choose a length.',
    level: 'Choose a level.',
    topics: 'Choose at least one topic.',
  },
  partners: { org: 'Enter your company or organisation.', name: 'Enter your name.', email: EMAIL, way: 'Choose how you’d like to help.' },
  contact: { name: 'Enter your name.', email: EMAIL, topic: 'Choose a topic.', message: 'Write a message.' },
  feedback: { eventId: 'Missing event.', overall: 'Choose a score for the evening.' },
  rating: { eventId: 'Missing event.', target: 'Missing talk.', stars: 'Choose a rating from 1 to 5.' },
  volunteer: {
    name: 'Enter your name.',
    email: EMAIL,
    linkedinProfile: 'Enter your LinkedIn profile link.',
    availability: 'Choose how much time you have.',
    interests: 'Choose at least one area.',
    message: 'Tell us why you’d like to volunteer.',
  },
};

const VOLUNTEER_FORMAT: Record<string, string> = {
  linkedinProfile: 'Enter a linkedin.com link, like https://www.linkedin.com/in/your-name.',
  githubProfile: 'Enter a GitHub username or a github.com link.',
  availability: 'Choose how much time you have.',
  availabilityOther: 'Say briefly how much time you have.',
  interests: 'Choose from the areas listed.',
};

/**
 * Format checks on filled fields, beyond "is it filled in". The "Other"
 * availability text is checked only once everything else is valid, as the
 * server's object-level refinement is.
 */
function formatErrors(kind: FormKind, d: Record<string, unknown>, out: Record<string, string>): Record<string, string> {
  if (kind !== 'volunteer') return out;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const set = (k: string) => (out[k] ??= VOLUNTEER_FORMAT[k]!);
  if (str(d.linkedinProfile) && !LINKEDIN_URL.test(str(d.linkedinProfile))) set('linkedinProfile');
  if (str(d.githubProfile) && !GITHUB_PROFILE.test(str(d.githubProfile))) set('githubProfile');
  if (str(d.availability) && !(str(d.availability) in VOLUNTEER_AVAILABILITY)) set('availability');
  if (!empty(d.interests) && (!Array.isArray(d.interests) || d.interests.some((i) => !(VOLUNTEER_INTERESTS as readonly unknown[]).includes(i)))) set('interests');
  if (!Object.keys(out).length && d.availability === 'other' && !str(d.availabilityOther)) set('availabilityOther');
  return out;
}

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

/** Meetup speakers confirm they've read the terms (owner, 3rd November 2026). */
export const CFP_AGREE_ERROR = 'Tick the box to confirm you’ve read this.';

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
  if (!truthy(d.agree)) out.agree = CFP_AGREE_ERROR;
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
  const base = formatErrors(kind, d, out);
  return kind === 'cfp' ? { ...base, ...cfpProfileErrors(d) } : base;
}

/** Same shape as the server-side `validate`, for islands. */
export function validate(kind: FormKind, data: object): { ok: true } | { ok: false; error: string; fields: Record<string, string> } {
  const fields = fieldErrors(kind, data);
  const keys = Object.keys(fields);
  return keys.length ? { ok: false, error: `Missing or invalid: ${keys.join(', ')}`, fields } : { ok: true };
}

export async function submitForm(kind: FormKind, data: object, photo?: Blob | null): Promise<FormResult> {
  try {
    // With a photo (talk proposals), the same JSON travels as the `data` part of a multipart request.
    let init: RequestInit = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) };
    if (photo) {
      const body = new FormData();
      body.set('data', JSON.stringify(data));
      body.set('photo', photo, photo instanceof File ? photo.name : 'photo.jpg');
      init = { method: 'POST', body };
    }
    const res = await fetch(`/api/forms/${kind}`, init);
    const json = (await res.json()) as FormResult;
    if (!res.ok || !json.ok) return { ok: false, error: ('error' in json && json.error) || 'Something went wrong on our side. Please try again.' };
    return json;
  } catch {
    return { ok: false, error: 'We couldn’t reach the server. Check your connection and try again.' };
  }
}
