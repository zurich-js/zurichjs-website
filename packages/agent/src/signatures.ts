/**
 * Slack request signatures and the signed hand-off between our own functions. No other imports,
 * so both bots (this package's organiser bot and src/cfp) can use them.
 */
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

/** Slack's v0 request signature (`x-slack-signature`, `x-slack-request-timestamp`), 5-minute window. */
export async function verifySlackRequest(headers: Headers, rawBody: string, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret) return false;
  const ts = headers.get('x-slack-request-timestamp');
  const sig = headers.get('x-slack-signature');
  if (!ts || !sig || Math.abs(now / 1000 - Number(ts)) > 300) return false;
  return safeEqual(`v0=${await hmacHex(secret, `v0:${ts}:${rawBody}`)}`, sig);
}

/** Signs the hand-off from slack-events to the background function, so nobody else can trigger runs. */
export const signInternal = (secret: string, body: string) => hmacHex(secret, `internal:${body}`);
export const verifyInternal = async (secret: string | undefined, body: string, sig: string | null) => !!secret && !!sig && safeEqual(await signInternal(secret, body), sig);
