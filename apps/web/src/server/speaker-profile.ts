/**
 * Progressive speaker profiles. The CFP asks only for what a proposal needs.
 * Once a talk is accepted, an organiser sends the speaker a private link
 * (`pnpm speaker-link <speaker id>`, a JWT signed with JWT_SECRET, valid 30
 * days) to /speakers/profile?token=…, where they add a photo, bio, job title,
 * company, links and topics. Everything is saved as a DRAFT of their speaker
 * document; an organiser reviews and publishes it in the Studio.
 */
import { sanityWriteClient } from '@zurichjs/integrations';
import type { Env } from './http.ts';

type SanityClient = NonNullable<ReturnType<typeof sanityWriteClient>>;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ProfileFields {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  bluesky?: string;
  interests?: string[];
}

const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const url = (v: unknown) => {
  const s = clean(v, 300);
  if (!s) return undefined;
  try {
    const u = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

export function parseProfile(form: Record<string, unknown>): { ok: true; data: ProfileFields } | { ok: false; error: string; field: string } {
  const name = clean(form.name, 120);
  if (!name) return { ok: false, error: 'Add your name as it should appear on the site.', field: 'name' };
  const bio = clean(form.bio, 1200);
  if (bio && /[<>]/.test(bio)) return { ok: false, error: 'Write the bio as plain text, without HTML.', field: 'bio' };
  const interests = clean(form.interests, 300)
    ?.split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  return {
    ok: true,
    data: {
      name,
      title: clean(form.title, 120),
      company: clean(form.company, 120),
      bio,
      website: url(form.website),
      github: url(form.github),
      linkedin: url(form.linkedin),
      twitter: url(form.twitter),
      bluesky: url(form.bluesky),
      interests,
    },
  };
}

export async function loadProfile(client: SanityClient, speakerId: string) {
  return client.fetch<(ProfileFields & { _id: string; image?: string; hasDraft: boolean }) | null>(
    `*[_type == "speaker" && id.current == $speakerId && !(_id in path("drafts.**"))][0]{
      _id, name, title, company, bio, website, github, linkedin, twitter, bluesky, interests,
      "image": coalesce(*[_id == "drafts." + ^._id][0].image.asset->url, image.asset->url),
      "hasDraft": defined(*[_id == "drafts." + ^._id][0]._id)
    }`,
    { speakerId },
  );
}

/** Writes the fields (and an uploaded photo) to the speaker's draft. Never publishes. */
export async function saveProfileDraft(client: SanityClient, docId: string, data: ProfileFields, photo?: { bytes: Uint8Array; type: string; name: string }) {
  const published = await client.getDocument(docId);
  const draftId = `drafts.${docId}`;
  const draft = (await client.getDocument(draftId)) ?? (published ? { ...published, _id: draftId } : null);
  if (!draft) throw new Error(`No speaker ${docId}`);
  let image: Record<string, unknown> | undefined;
  if (photo) {
    const asset = await client.assets.upload('image', Buffer.from(photo.bytes), { filename: photo.name, contentType: photo.type });
    image = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
  }
  const set: Record<string, unknown> = Object.fromEntries(Object.entries({ ...data, ...(image ? { image } : {}) }).filter(([, v]) => v !== undefined));
  await client
    .transaction()
    .createIfNotExists(draft as never)
    .patch(draftId, (p) => p.set(set))
    .commit();
}

export const profileClient = (env: Env) => sanityWriteClient(env);
