/**
 * Speaker feedback as JSON (Netlify Function). The page
 * /feedback/speaker/<token> renders the same data server-side; this endpoint
 * keeps production's API URL.
 *
 * GET /api/speaker-feedback/<token>
 *   200 { ok: true, speaker, total, average, talks[] }
 *   400 / 401 { ok: false, error: 'This link is not valid or has expired.' }   also when JWT_SECRET is missing
 *   502 { ok: false, error }   Sanity failed
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../server/http.ts';
import { loadSpeakerFeedback } from '../../../server/speaker-feedback.ts';

export const prerender = false;

const PRIVATE = { 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer', 'cache-control': 'private, no-store' };

export const GET: APIRoute = async ({ params }) => {
  const r = await loadSpeakerFeedback(String(params.token ?? ''));
  return r.ok ? json(200, { ok: true, ...r.data }, PRIVATE) : fail(r.status, r.error, {}, PRIVATE);
};
export const ALL: APIRoute = () => methodNotAllowed('GET');
