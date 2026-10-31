/**
 * Newsletter signup through EmailOctopus (Netlify Function). Used by
 * /waitlist/conf. Same list and API as production (EmailOctopus API 1.6).
 *
 * POST /api/subscribe  JSON { email, firstName?, lastName?, website_url? }
 *   200 { ok: true, subscribed: true }                 added to the list
 *   200 { ok: true, subscribed: true, already: true }  the address was already on the list
 *   200 { ok: true, subscribed: false }                EMAIL_OCTOPUS_API_KEY / _LIST_ID missing: nothing saved (logged)
 *   400 { ok: false, error }                           invalid JSON or email
 *   502 { ok: false, error }                           EmailOctopus failed
 */
import type { APIRoute } from 'astro';
import { CONTACT_EMAIL, fail, isBot, isEmail, json, methodNotAllowed, readJsonObject, text, type Env } from '../../server/http';

export const prerender = false;

const API_URL = 'https://emailoctopus.com/api/1.6';

export async function handleSubscribe(request: Request, deps: { env?: Env; fetch?: typeof fetch; log?: (m: string) => void } = {}): Promise<Response> {
  const { env = process.env, fetch: fetchImpl = fetch, log = console.log } = deps;
  const body = await readJsonObject(request);
  if (!body) return fail(400, 'Send the form as JSON.');
  if (isBot(body)) return fail(400, 'Leave the hidden field empty.', { field: 'website_url' });
  const email = text(body.email, 254);
  if (!email || !isEmail(email)) return fail(400, 'Enter an email like name@example.com.', { field: 'email' });
  const firstName = text(body.firstName, 120);
  const lastName = text(body.lastName, 120);
  if (firstName === false || lastName === false) return fail(400, 'Names can be up to 120 characters, without HTML.');

  const apiKey = env.EMAIL_OCTOPUS_API_KEY;
  const listId = env.EMAIL_OCTOPUS_LIST_ID;
  if (!apiKey || !listId) {
    log(`[subscribe] EMAIL_OCTOPUS_API_KEY or EMAIL_OCTOPUS_LIST_ID missing; ${email.replace(/^[^@]+/, '***')} not subscribed`);
    return json(200, { ok: true, subscribed: false });
  }

  try {
    const res = await fetchImpl(`${API_URL}/lists/${encodeURIComponent(listId)}/contacts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        email_address: email.toLowerCase(),
        status: 'SUBSCRIBED',
        ...(firstName || lastName ? { fields: { ...(firstName ? { FirstName: firstName } : {}), ...(lastName ? { LastName: lastName } : {}) } } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return json(200, { ok: true, subscribed: true });
    const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    if (data.error?.code === 'MEMBER_EXISTS_WITH_EMAIL_ADDRESS') return json(200, { ok: true, subscribed: true, already: true });
    if (data.error?.code === 'INVALID_PARAMETERS') return fail(400, 'Enter an email like name@example.com.', { field: 'email' });
    throw new Error(`EmailOctopus ${res.status} ${data.error?.code ?? ''}`);
  } catch (cause) {
    console.error('[subscribe] failed', cause);
    return fail(502, `We couldn’t add you right now. Please try again or email ${CONTACT_EMAIL}.`);
  }
}

export const POST: APIRoute = ({ request }) => handleSubscribe(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
