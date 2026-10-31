/**
 * Small helpers shared by the Netlify Functions in src/pages/api (tickets,
 * membership, newsletter, speaker feedback). Relative imports only, so the
 * handlers run under Vitest without the `~/` alias.
 *
 * Every function answers JSON: `{ ok: true, ... }` or `{ ok: false, error }`
 * where `error` is a sentence a person can read.
 */
export type Env = Record<string, string | undefined>;

export const CONTACT_EMAIL = 'hello@zurichjs.com';

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  json(status, { ok: false, error, ...extra }, headers);

/** 405 with an Allow header, for every method a route does not handle. */
export const methodNotAllowed = (allow: string) => fail(405, 'Method not allowed.', {}, { allow });

/** Reads a JSON object body; `null` when the body is not a JSON object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const HTML_CHARS = /[<>]/;

/**
 * Trimmed text, or `undefined` when empty or missing. Returns `false` when the
 * value is present but invalid (wrong type, too long, or contains HTML).
 */
export function text(value: unknown, max: number): string | undefined | false {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return false;
  const t = value.trim();
  if (!t) return undefined;
  if (t.length > max || HTML_CHARS.test(t)) return false;
  return t;
}

export const isEmail = (v: string) => v.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);

/** Same patterns as production src/lib/validation/input.ts. */
export const STRIPE_ID = /^[A-Za-z0-9_]{1,120}$/;
export const COUPON_CODE = /^[A-Za-z0-9_-]{1,80}$/;
export const SLUG = /^[A-Za-z0-9_:/.-]{1,160}$/;
export const CHECKOUT_SESSION_ID = /^cs_[A-Za-z0-9_]{1,200}$/;

/** True when a bot filled the hidden honeypot field (`website_url`, see @zurichjs/forms). */
export const isBot = (body: Record<string, unknown>) => typeof body.website_url === 'string' && body.website_url.trim() !== '';
