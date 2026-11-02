/**
 * Speaker profile completion (see src/server/speaker-profile.ts).
 *   GET  /api/speaker-profile?token=…   → { ok, profile }  current values to prefill
 *   POST /api/speaker-profile?token=…   multipart form: fields + optional photo (JPEG, PNG or WebP, ≤ 5 MB)
 *        → { ok: true } once saved as a draft for the organisers to publish
 *   401 invalid or expired link · 400 invalid field · 503 not configured · 502 Sanity failed
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, type Env } from '../../server/http.ts';
import { clientKey, rateLimited } from '../../server/rateLimit.ts';
import { profileSpeaker } from '../../server/profile-token.ts';
import { MAX_PHOTO_BYTES, PHOTO_TYPES, loadProfile, parseProfile, profileClient, saveProfileDraft } from '../../server/speaker-profile.ts';

export const prerender = false;

const INVALID = 'This link is not valid or has expired. Ask the organisers for a new one.';

export async function handleProfile(request: Request, deps: { env?: Env; client?: ReturnType<typeof profileClient> } = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const speakerId = profileSpeaker(new URL(request.url).searchParams.get('token'), env);
  if (!speakerId) return fail(401, INVALID);
  const client = deps.client === undefined ? profileClient(env) : deps.client;
  if (!client) return fail(503, 'Profiles can’t be saved right now. Please email hello@zurichjs.com your details instead.');
  try {
    const current = await loadProfile(client, speakerId);
    if (!current) return fail(401, INVALID);
    if (request.method === 'GET') {
      const { _id: _ignored, ...profile } = current;
      return json(200, { ok: true, profile });
    }
    if (rateLimited('speaker-profile', clientKey(request), 10, 10 * 60_000)) return fail(429, 'Too many saves. Please wait a few minutes.');
    const form = await request.formData();
    const parsed = parseProfile(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')));
    if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
    const file = form.get('photo');
    let photo: { bytes: Uint8Array; type: string; name: string } | undefined;
    if (file && typeof file !== 'string' && file.size > 0) {
      if (!PHOTO_TYPES.includes(file.type)) return fail(400, 'Use a JPEG, PNG or WebP photo.', { field: 'photo' });
      if (file.size > MAX_PHOTO_BYTES) return fail(400, 'The photo is larger than 5 MB. Please choose a smaller one.', { field: 'photo' });
      photo = { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type, name: file.name || 'photo' };
    }
    await saveProfileDraft(client, current._id, parsed.data, photo);
    return json(200, { ok: true });
  } catch (cause) {
    console.error('[speaker-profile] failed', cause);
    return fail(502, 'We couldn’t save that right now. Nothing was lost on your side: please try again, or email hello@zurichjs.com.');
  }
}

export const GET: APIRoute = ({ request }) => handleProfile(request);
export const POST: APIRoute = ({ request }) => handleProfile(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
