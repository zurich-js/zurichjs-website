/**
 * Best-effort rate limit per client and key, in the memory of one function
 * instance (as the old site had). It slows down scripted abuse; it is not a
 * hard guarantee across instances. Stripe and the forms add their own checks.
 */
const hits = new Map<string, number[]>();

export function rateLimited(key: string, client: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const k = `${key}:${client}`;
  const recent = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(k, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}

export const clientKey = (request: Request) => request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

/** For tests. */
export const resetRateLimits = () => hits.clear();
