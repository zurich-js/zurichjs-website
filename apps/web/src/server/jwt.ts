/**
 * HS256 JWT verification with node:crypto, compatible with the tokens
 * production signs with `jsonwebtoken` (src/utils/tokens.ts: HS256 by
 * default, `{ speakerId, type: 'speaker-feedback', iat, exp }`).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64urlJson = (part: string): Record<string, unknown> | null => {
  try {
    const v: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** The payload when the signature, algorithm and time claims check out; otherwise null. */
export function verifyHs256(token: string, secret: string, nowMs = Date.now()): Record<string, unknown> | null {
  if (!secret || typeof token !== 'string' || token.length > 2000) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
  const [h, p, sig] = parts as [string, string, string];
  const header = b64urlJson(h);
  if (!header || header.alg !== 'HS256') return null;
  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const payload = b64urlJson(p);
  if (!payload) return null;
  const now = Math.floor(nowMs / 1000);
  if (payload.exp !== undefined && (typeof payload.exp !== 'number' || now >= payload.exp)) return null;
  if (payload.nbf !== undefined && (typeof payload.nbf !== 'number' || now < payload.nbf)) return null;
  return payload;
}

/** Signs a token (tests and local checks). */
export function signHs256(payload: Record<string, unknown>, secret: string): string {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}
