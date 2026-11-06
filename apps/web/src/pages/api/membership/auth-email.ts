/**
 * Supabase Auth "Send Email Hook" (docs/v2/MEMBERSHIP.md). With the hook on,
 * Supabase sends no auth email itself: it calls this function, which sends
 * the ZurichJS `login-link` email through Resend.
 *
 * POST /api/membership/auth-email   Standard Webhooks signed (SUPABASE_AUTH_HOOK_SECRET)
 *   body { user: { email }, email_data: { token_hash, redirect_to, email_action_type, site_url } }
 *   200 {}                                         sent (or stubbed without RESEND_API_KEY)
 *   401 { error: { http_code, message } }          bad or missing signature
 *   400 { error: { http_code, message } }          not a sign-in email (members have no passwords)
 *   500 { error: { http_code, message } }          Resend failed: Supabase shows the sign-in as failed
 *
 * Supabase gives the hook 5 seconds, so the Resend call times out at 4.
 */
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import type { APIRoute } from 'astro';
import { methodNotAllowed, type Env } from '../../../server/http.ts';
import { verifyWebhook } from '../../../server/standard-webhooks.ts';

export const prerender = false;

/** Sign-in emails. Everything else (password recovery, email change, notifications) is not used for member accounts. */
const SIGN_IN = new Set(['magiclink', 'signup']);

interface HookBody {
  user?: { email?: string };
  email_data?: { token_hash?: string; redirect_to?: string; email_action_type?: string; site_url?: string };
}

/** Errors in the shape Supabase reads ({ error: { http_code, message } }), always JSON. */
const hookError = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { http_code: status, message } }), { status, headers: { 'content-type': 'application/json' } });
const ok = () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });

/** Where the link may send people back to: this site's account page only (any origin Supabase is configured to allow). */
export function redirectFor(redirectTo: string | undefined, siteUrl: string | undefined): string | null {
  for (const candidate of [redirectTo, siteUrl ? `${siteUrl.replace(/\/+$/, '')}/membership/account` : undefined]) {
    if (!candidate) continue;
    try {
      const u = new URL(candidate);
      const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      if ((u.protocol === 'https:' || (local && u.protocol === 'http:')) && u.pathname === '/membership/account') return u.toString();
    } catch {
      // try the next one
    }
  }
  return null;
}

/** The verification link Supabase documents for the hook: /auth/v1/verify?token=<token_hash>&type=<type>&redirect_to=<url>. */
export function verifyLink(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string): string {
  const q = new URLSearchParams({ token: tokenHash, type, redirect_to: redirectTo });
  return `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/verify?${q}`;
}

export async function handleAuthEmail(request: Request, deps: { env?: Env; log?: (m: string) => void; fetch?: typeof fetch; now?: number } = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const raw = await request.text();
  if (!env.SUPABASE_AUTH_HOOK_SECRET) {
    log('[membership] SUPABASE_AUTH_HOOK_SECRET missing; sign-in email refused');
    return hookError(500, 'Sign-in emails are not configured.');
  }
  if (!verifyWebhook(raw, request.headers, env.SUPABASE_AUTH_HOOK_SECRET, deps.now)) return hookError(401, 'Bad signature.');
  let body: HookBody;
  try {
    body = JSON.parse(raw) as HookBody;
  } catch {
    return hookError(400, 'Invalid JSON.');
  }
  const type = body.email_data?.email_action_type ?? '';
  const email = body.user?.email ?? '';
  const tokenHash = body.email_data?.token_hash ?? '';
  if (!SIGN_IN.has(type)) {
    log(`[membership] auth email of type "${type}" refused: member accounts only sign in by link`);
    return hookError(400, 'Only sign-in links are sent for member accounts.');
  }
  if (!email || !tokenHash) return hookError(400, 'Missing email or token.');
  const supabaseUrl = env.SUPABASE_URL;
  if (!supabaseUrl) return hookError(500, 'SUPABASE_URL is not set.');
  const redirect = redirectFor(body.email_data?.redirect_to, body.email_data?.site_url);
  if (!redirect) return hookError(400, 'The sign-in link must lead back to /membership/account.');

  const minutes = Number(env.SUPABASE_OTP_EXPIRY_MINUTES ?? '60');
  const message = renderEmail('login-link', {
    url: verifyLink(supabaseUrl, tokenHash, type, redirect),
    validMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 60,
    firstTime: type === 'signup',
  });
  try {
    // The webhook id is unique per delivery: a retried delivery does not send twice.
    await sendMemberEmail(env, { to: email, ...message }, { idempotencyKey: `auth-email:${request.headers.get('webhook-id')}`, log, fetch: deps.fetch, timeoutMs: 4_000 });
    return ok();
  } catch (cause) {
    console.error('[membership] sign-in email failed', cause);
    return hookError(500, 'The sign-in email could not be sent.');
  }
}

export const POST: APIRoute = ({ request }) => handleAuthEmail(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
