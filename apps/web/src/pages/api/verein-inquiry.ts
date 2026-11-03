/**
 * Membership request from /membership (Netlify Function). Nothing is charged:
 * the organisers get an email (reply goes to the person) and a Slack message,
 * then reply with how to join and pay. Same fields as production; the email
 * also states the fee the page showed for that tier and billing cycle.
 *
 * POST /api/verein-inquiry  JSON { name, email, message?, tier?, billingCycle?, website_url? }
 *   200 { ok: true }
 *   400 { ok: false, error, field? }   invalid JSON or fields
 *   429 { ok: false, error }           more than 3 requests in 10 minutes
 *   502 { ok: false, error }           a configured channel failed
 *
 * Without RESEND_API_KEY / SLACK_WEBHOOK_URL each channel logs a stub line.
 */
import { postSlack, sendEmail } from '@zurichjs/integrations';
import type { APIRoute } from 'astro';
import { CONTACT_EMAIL, fail, isBot, isEmail, json, methodNotAllowed, readJsonObject, text, type Env } from '../../server/http.ts';
import { clientKey, rateLimited } from '../../server/rateLimit.ts';
import { CYCLES, TIERS as TIER_TABLE, feeLabel, tierByName, type Cycle, type TierName } from '../../lib/membership.ts';

export const prerender = false;

export const TIERS: TierName[] = Object.values(TIER_TABLE).map((t) => t.name);
export const BILLING_CYCLES: Cycle[] = CYCLES.map((c) => c.value);

export interface VereinInquiry {
  name: string;
  email: string;
  message?: string;
  tier?: TierName;
  billingCycle?: Cycle;
}

export function parseInquiry(body: Record<string, unknown>): { ok: true; data: VereinInquiry } | { ok: false; error: string; field: string } {
  if (isBot(body)) return { ok: false, error: 'Leave the hidden field empty.', field: 'website_url' };
  const name = text(body.name, 120);
  if (!name) return { ok: false, error: 'Add your name.', field: 'name' };
  const email = text(body.email, 254);
  if (!email || !isEmail(email)) return { ok: false, error: 'Enter an email like name@example.com.', field: 'email' };
  const message = text(body.message, 2000);
  if (message === false) return { ok: false, error: 'Keep the message under 2000 characters, without HTML.', field: 'message' };
  const tier = body.tier === undefined || body.tier === '' ? undefined : body.tier;
  if (tier !== undefined && !TIERS.includes(tier as never)) return { ok: false, error: 'Choose Basic Member or Supporter.', field: 'tier' };
  const cycle = body.billingCycle === undefined || body.billingCycle === '' ? undefined : body.billingCycle;
  if (cycle !== undefined && !BILLING_CYCLES.includes(cycle as never)) return { ok: false, error: 'Choose quarterly or yearly.', field: 'billingCycle' };
  return {
    ok: true,
    data: { name, email: email.toLowerCase(), message: message || undefined, tier: tier as VereinInquiry['tier'], billingCycle: cycle as VereinInquiry['billingCycle'] },
  };
}

export async function handleInquiry(request: Request, deps: { env?: Env; log?: (m: string) => void } = {}): Promise<Response> {
  const { env = process.env, log = console.log } = deps;
  // As on the old site: 3 requests per 10 minutes per client.
  if (rateLimited('membership', clientKey(request), 3, 10 * 60_000)) return fail(429, `Too many requests. Please wait a few minutes, or email ${CONTACT_EMAIL}.`);
  const body = await readJsonObject(request);
  if (!body) return fail(400, 'Send the form as JSON.');
  const parsed = parseInquiry(body);
  if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
  const d = parsed.data;
  const subject = `Membership request${d.tier ? ` (${d.tier})` : ''} from ${d.name}`;
  const tier = d.tier ? tierByName(d.tier) : undefined;
  const lines = [
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    ...(d.tier ? [`Tier: ${d.tier}`] : []),
    ...(d.billingCycle ? [`Billing: ${d.billingCycle}`] : []),
    // The fee the person saw on /membership, from the same table. Nothing is charged.
    ...(tier && d.billingCycle ? [`Fee shown: ${feeLabel(tier, d.billingCycle)}`] : []),
    `Message: ${d.message ?? 'No message'}`,
  ];
  try {
    await Promise.all([sendEmail(env, subject, lines.join('\n'), d.email, log), postSlack(env, `${subject}\n${lines.join('\n')}`, log)]);
    return json(200, { ok: true });
  } catch (cause) {
    console.error('[membership] request failed', cause);
    return fail(502, `We couldn’t send that right now. Please try again or email ${CONTACT_EMAIL}.`);
  }
}

export const POST: APIRoute = ({ request }) => handleInquiry(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
