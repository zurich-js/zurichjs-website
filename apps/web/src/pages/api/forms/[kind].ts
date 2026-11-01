/**
 * Form intake (Netlify Function). Validates with the shared schema, then hands
 * the form to @zurichjs/integrations, which stores and sends it (Sanity, Resend,
 * Slack) or logs a stub line when a secret is missing.
 *
 * Contract (same as v2/src/pages/api/forms/[kind].ts):
 *   POST /api/forms/<kind>  JSON body
 *   200 { ok: true, id }
 *   400 { ok: false, error, fields? }   invalid JSON or missing/invalid fields
 *   404 { ok: false, error }            unknown form kind
 *   405 { ok: false, error }            anything but POST (Allow: POST)
 *   409 { ok: false, error }            already rated (one rating per person, talk and speaker)
 *   502 { ok: false, error }            a configured channel failed
 *
 * Package imports only (no `~/` alias) so the handler runs under Vitest as is.
 */
import { isFormKind, validate } from '@zurichjs/forms';
import { FormRejected, forwardForm } from '@zurichjs/integrations';
import type { APIRoute } from 'astro';

export const prerender = false;

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

const clientIp = (request: Request, fallback?: string) =>
  request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? fallback;

export const POST: APIRoute = async (ctx) => {
  const { params, request } = ctx;
  const kind = String(params.kind ?? '');
  if (!isFormKind(kind)) return json(404, { ok: false, error: 'Unknown form' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const v = validate(kind, body);
  if (!v.ok) return json(400, { ok: false, error: v.error, fields: v.fields });

  try {
    let ip: string | undefined;
    try {
      // Reading clientAddress throws where the adapter cannot provide it.
      ip = clientIp(request, ctx.clientAddress);
    } catch {
      ip = clientIp(request);
    }
    const headers = Object.fromEntries(['user-agent', 'accept', 'accept-language', 'accept-encoding'].map((h) => [h, request.headers.get(h) ?? undefined]));
    const r = await forwardForm(kind, v.data, { env: process.env, client: { ip, headers } });
    if (!r.ok) return json(400, r);
    return json(200, { ok: true, id: r.id, ...('url' in r ? { url: r.url } : {}) });
  } catch (cause) {
    if (cause instanceof FormRejected) return json(cause.status, { ok: false, error: cause.message });
    console.error(`[forms] ${kind} failed`, cause);
    return json(502, { ok: false, error: 'We couldn’t send that right now. Please try again or email hello@zurichjs.com.' });
  }
};

/** Every other method. */
export const ALL: APIRoute = () => json(405, { ok: false, error: 'Method not allowed' }, { allow: 'POST' });
