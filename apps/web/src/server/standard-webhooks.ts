/**
 * Standard Webhooks signatures (https://www.standardwebhooks.com), as Supabase
 * Auth hooks send them. Headers: webhook-id, webhook-timestamp (unix seconds),
 * webhook-signature ("v1,<base64>", several separated by spaces). The signed
 * content is `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 keyed with the
 * base64 secret that follows "whsec_". Tolerance: 5 minutes either way.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_S = 5 * 60;

/** The HMAC key from a secret as Supabase shows it: "v1,whsec_<base64>" (or "whsec_<base64>"). */
export function webhookKey(secret: string): Buffer | null {
  const b64 = secret
    .trim()
    .replace(/^v1,/, '')
    .replace(/^whsec_/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  const key = Buffer.from(b64, 'base64');
  return key.length >= 16 ? key : null;
}

export function signWebhook(id: string, timestamp: number, body: string, secret: string): string {
  const key = webhookKey(secret);
  if (!key) throw new Error('Bad webhook secret');
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`;
}

export function verifyWebhook(body: string, headers: Headers, secret: string | undefined, nowMs = Date.now()): boolean {
  const key = secret ? webhookKey(secret) : null;
  if (!key) return false;
  const id = headers.get('webhook-id');
  const ts = headers.get('webhook-timestamp');
  const sig = headers.get('webhook-signature');
  if (!id || !ts || !sig || !/^\d{1,12}$/.test(ts)) return false;
  if (Math.abs(nowMs / 1000 - Number(ts)) > TOLERANCE_S) return false;
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
  return sig
    .split(' ')
    .filter((s) => s.startsWith('v1,'))
    .some((s) => {
      const given = Buffer.from(s.slice(3), 'base64');
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}
